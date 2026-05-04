import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Search, Wallet } from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import PaymentFormModal, {
  initialPaymentForm,
} from "../components/PaymentFormModal";

const Payments = () => {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(initialPaymentForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const [orderRes, paymentRes] = await Promise.all([
        API.get("/orders"),
        API.get("/payments"),
      ]);

      setOrders((orderRes.data.orders || []).filter((order) => order.dueAmount > 0));
      setPayments(paymentRes.data.payments || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load payments");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedOrder = orders.find((order) => order._id === form.orderId);

  const stats = useMemo(() => {
    const totalPaid = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    const cashPaid = payments
      .filter((payment) => payment.paymentMode === "cash")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const upiPaid = payments
      .filter((payment) => payment.paymentMode === "upi")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const pendingDue = orders.reduce(
      (sum, order) => sum + Number(order.dueAmount || 0),
      0
    );

    return {
      totalPaid,
      cashPaid,
      upiPaid,
      pendingDue,
    };
  }, [payments, orders]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const keyword = search.toLowerCase();

      return (
        payment.customerName?.toLowerCase().includes(keyword) ||
        payment.paymentMode?.toLowerCase().includes(keyword) ||
        payment.notes?.toLowerCase().includes(keyword)
      );
    });
  }, [payments, search]);

  const resetForm = () => {
    setForm(initialPaymentForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    const payload = {
      orderId: form.orderId,
      amount: Number(form.amount),
      paymentMode: form.paymentMode,
      paymentDate: form.paymentDate || new Date(),
      notes: form.notes,
    };

    try {
      await API.post("/payments", payload);
      setMessage("Payment added successfully");
      resetForm();
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      label: "Total Paid",
      value: `₹${stats.totalPaid}`,
      icon: IndianRupee,
      color: "text-green-600",
    },
    {
      label: "Cash Received",
      value: `₹${stats.cashPaid}`,
      icon: Wallet,
      color: "text-blue-600",
    },
    {
      label: "UPI Received",
      value: `₹${stats.upiPaid}`,
      icon: Wallet,
      color: "text-purple-600",
    },
    {
      label: "Pending Due",
      value: `₹${stats.pendingDue}`,
      icon: IndianRupee,
      color: "text-red-600",
    },
  ];

  return (
    <AppLayout
      title="Payments"
      subtitle="Track received payments and pending dues"
      headerAction={
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 md:w-auto"
        >
          + Add Payment
        </button>
      }
    >
      {message && (
        <div className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {message}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <Icon className={card.color} size={28} />
              <p className="mt-4 text-sm font-medium text-slate-500">
                {card.label}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {card.value}
              </h2>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-bold text-slate-900">Payment History</h2>

          <div className="relative w-full lg:w-80">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payment..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Order No</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No payments found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr
                    key={payment._id}
                    className="border-b text-sm hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {payment.customerName}
                      </p>
                    </td>

                    <td className="px-4 py-4 font-semibold text-slate-700">
                      {payment.order?._id
                        ? `#${payment.order._id.slice(-6).toUpperCase()}`
                        : "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
                        {payment.paymentMode}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right text-lg font-bold text-green-700">
                      ₹{payment.amount}
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {payment.notes || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orders={orders}
        form={form}
        setForm={setForm}
        loading={loading}
        onSubmit={handleSubmit}
        selectedOrder={selectedOrder}
      />
    </AppLayout>
  );
};

export default Payments;