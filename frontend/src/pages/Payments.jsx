import { useEffect, useMemo, useState } from "react";
import { IndianRupee, Search, Wallet } from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import LoadingState from "../components/LoadingState";
import PaymentFormModal from "../components/PaymentFormModal";
import { getTodayInputDate, initialPaymentForm } from "../constants/forms";
import getBillNumber from "../utils/billNumber";

const Payments = () => {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState(initialPaymentForm);
  const [message, setMessage] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setDataLoading(true);
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
    } finally {
      setDataLoading(false);
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
    setForm({
      ...initialPaymentForm,
      paymentDate: getTodayInputDate(),
    });
  };

  const openPaymentModal = (order = null) => {
    if (order) {
      setForm({
        ...initialPaymentForm,
        orderId: order._id,
        amount: String(order.dueAmount || ""),
        paymentDate: getTodayInputDate(),
      });
    } else {
      setForm({
        ...initialPaymentForm,
        paymentDate: getTodayInputDate(),
      });
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

    const amount = Number(form.amount);

    if (!form.orderId) {
      setMessage("Please choose a due order");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Payment amount must be greater than 0");
      return;
    }

    if (selectedOrder && amount > Number(selectedOrder.dueAmount || 0)) {
      setMessage("Payment cannot be greater than due amount");
      return;
    }

    setLoading(true);

    const payload = {
      orderId: form.orderId,
      amount,
      paymentMode: form.paymentMode,
      paymentDate: form.paymentDate || getTodayInputDate(),
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
          className="btn-success w-full md:w-auto"
        >
          + Receive Payment
        </button>
      }
    >
      {message && (
        <div className="toast mb-5 px-4 py-3 text-sm font-semibold">
          {message}
        </div>
      )}

      {dataLoading ? (
        <LoadingState label="Loading shop payments..." />
      ) : (
        <>
      <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="metric-card p-5"
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

      <div className="mb-6 metric-card p-5">
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
              className="form-control py-3 pl-11 pr-4"
            />
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {filteredDueOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No due orders found.
            </div>
          ) : (
            filteredDueOrders.map((order) => (
              <article key={order._id} className="surface-flat p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">
                      {getBillNumber(order)}
                    </p>
                    <h3 className="mt-1 text-base font-black text-slate-900">
                      {order.customerName}
                    </h3>
                    <p className="text-sm font-semibold text-slate-500">
                      {order.customerPhone}
                    </p>
                  </div>
                  <span
                    className={`status-pill capitalize ${
                      order.paymentStatus === "partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-[color:var(--shop-panel-2)] p-3">
                    <p className="text-xs font-bold text-slate-500">Total</p>
                    <p className="font-black text-slate-900">₹{order.subTotal}</p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--shop-primary-soft)] p-3">
                    <p className="text-xs font-bold text-green-700">Paid</p>
                    <p className="font-black text-green-800">₹{order.paidAmount}</p>
                  </div>
                  <div className="rounded-xl bg-[color:var(--shop-brick-soft)] p-3">
                    <p className="text-xs font-bold text-red-700">Due</p>
                    <p className="font-black text-red-800">₹{order.dueAmount}</p>
                  </div>
                </div>

                <button
                  onClick={() => openPaymentModal(order)}
                  className="btn-success mt-4 w-full text-sm"
                >
                  Receive Payment
                </button>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="shop-table w-full min-w-[950px]">
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
                        {getBillNumber(order)}
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
                        className="btn-muted text-sm text-green-700"
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

      <div className="metric-card p-5">
        <h2 className="mb-5 text-lg font-bold text-slate-900">
          Payment History
        </h2>

        <div className="space-y-3 md:hidden">
          {filteredPayments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              No payments found.
            </div>
          ) : (
            filteredPayments.map((payment) => (
              <article key={payment._id} className="surface-flat p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {payment.customerName}
                    </h3>
                    <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                      {payment.order?._id
                        ? getBillNumber(payment.order)
                        : "Opening due"}
                    </p>
                  </div>
                  <p className="text-xl font-black text-green-700">
                    ₹{payment.amount}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-[color:var(--shop-panel-2)] p-3 text-sm">
                  <span className="font-bold capitalize text-slate-700">
                    {payment.paymentMode}
                  </span>
                  <span className="font-semibold text-slate-500">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </span>
                </div>

                {payment.notes && (
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    {payment.notes}
                  </p>
                )}
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="shop-table w-full min-w-[850px]">
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
                        ? getBillNumber(payment.order)
                        : "-"}
                    </td>

                    <td className="px-4 py-4">
                      <span className="status-pill bg-slate-100 text-slate-700">
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
        </>
      )}
    </AppLayout>
  );
};

export default Payments;
