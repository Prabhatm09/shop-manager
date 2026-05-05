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

      const dueOrders = (orderRes.data.orders || []).filter(
        (order) => Number(order.dueAmount || 0) > 0
      );

      setOrders(dueOrders);
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
      dueOrdersCount: orders.length,
    };
  }, [payments, orders]);

  const filteredDueOrders = useMemo(() => {
    return orders.filter((order) => {
      const keyword = search.toLowerCase();

      return (
        order.customerName?.toLowerCase().includes(keyword) ||
        order.customerPhone?.toLowerCase().includes(keyword) ||
        order._id?.toLowerCase().includes(keyword)
      );
    });
  }, [orders, search]);

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

  const openPaymentModal = (order = null) => {
    if (order) {
      setForm({
        ...initialPaymentForm,
        orderId: order._id,
      });
    } else {
      resetForm();
    }

    setIsModalOpen(true);
  };

  const closePaymentModal = () => {
    resetForm();
    setIsModalOpen(false);
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
      setMessage("Payment received successfully");
      closePaymentModal();
      fetchData();
    } catch (error) {
      setMessage(error.response?.data?.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      label: "Pending Due",
      value: `₹${stats.pendingDue}`,
      icon: IndianRupee,
      color: "text-red-600",
    },
    {
      label: "Due Orders",
      value: stats.dueOrdersCount,
      icon: IndianRupee,
      color: "text-yellow-600",
    },
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
  ];

  return (
    <AppLayout
      title="Payments"
      subtitle="Receive remaining payments and track payment history"
      headerAction={
        <button
          onClick={() => openPaymentModal()}
          className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 md:w-auto"
        >
          + Receive Payment
        </button>
      }
    >
      {message && (
        <div className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
          {message}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
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

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Due Orders</h2>
            <p className="text-sm text-slate-500">
              Select an order and receive remaining payment
            </p>
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search due orders..."
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] border-collapse">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3">Payment Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredDueOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No due orders found.
                  </td>
                </tr>
              ) : (
                filteredDueOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b text-sm hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">
                        #{order._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.customerPhone}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-slate-900">
                      ₹{order.subTotal}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-green-700">
                      ₹{order.paidAmount}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-red-700">
                      ₹{order.dueAmount}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          order.paymentStatus === "partial"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => openPaymentModal(order)}
                        className="rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700 hover:bg-green-100"
                      >
                        Receive Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-slate-900">
          Payment History
        </h2>

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
        onClose={closePaymentModal}
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