import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  IndianRupee,
  Phone,
  MapPin,
  ShoppingCart,
} from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import LoadingState from "../components/LoadingState";

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [message, setMessage] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectForm, setCollectForm] = useState({
    amount: "",
    paymentMode: "cash",
    paymentDate: "",
    notes: "",
  });
  const [collectLoading, setCollectLoading] = useState(false);

  const fetchCustomerDetail = useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await API.get(`/customers/${id}`);

      setCustomer(res.data.customer);
      setOrders(res.data.orders || []);
      setPayments(res.data.payments || []);
      setSummary(res.data.summary || null);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Failed to load customer detail"
      );
    } finally {
      setDataLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerDetail();
  }, [fetchCustomerDetail]);

  const stats = useMemo(() => {
    const totalSales = orders.reduce(
      (sum, order) => sum + Number(order.subTotal || 0),
      0
    );

    const totalPaid = orders.reduce(
      (sum, order) => sum + Number(order.paidAmount || 0),
      0
    );

     const totalDue = Number(summary?.totalDue || 0);
     const totalAdvance = Number(summary?.totalAdvance || 0);

    const totalPaymentHistory = payments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

    return {
     totalOrders: orders.length,
    totalSales,
    totalPaid,
    totalDue,
    totalAdvance,
    totalPaymentHistory
    };
  }, [orders, payments, summary]);

  const handleCollectPayment = async (e) => {
  e.preventDefault();

  try {
    const amount = Number(collectForm.amount);
    const totalDue = Number(stats.totalDue || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Payment amount must be greater than 0");
      return;
    }

    if (amount > totalDue) {
      setMessage("Payment cannot be greater than total due");
      return;
    }

    setCollectLoading(true);
    setMessage("");

    await API.post(`/payments/customer/${id}/collect`, {
      amount,
      paymentMode: collectForm.paymentMode,
      paymentDate: collectForm.paymentDate || new Date(),
      notes: collectForm.notes,
    });

    setCollectForm({
      amount: "",
      paymentMode: "cash",
      paymentDate: "",
      notes: "",
    });

    setCollectOpen(false);
    fetchCustomerDetail();
  } catch (error) {
    setMessage(error.response?.data?.message || "Payment collection failed");
  } finally {
    setCollectLoading(false);
  }
};

  return (
    <AppLayout
      title="Customer Detail"
      subtitle="View customer orders, payments and due amount"
    >
      <button
        onClick={() => navigate("/customers")}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
      >
        <ArrowLeft size={18} />
        Back to Customers
      </button>

      {message && (
        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {message}
        </div>
      )}

      {dataLoading ? (
        <LoadingState label="Loading customer ledger..." />
      ) : customer && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">
                {customer.name}
              </h2>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
                  <Phone className="text-blue-600" size={20} />
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-bold text-slate-900">
                      {customer.phone}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 md:col-span-2">
                  <MapPin className="text-green-600" size={20} />
                  <div>
                    <p className="text-xs text-slate-500">Address</p>
                    <p className="font-bold text-slate-900">
                      {customer.address || "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {stats.totalDue > 0 ? (
              <div className="rounded-2xl bg-red-50 p-5 text-left lg:min-w-[230px] lg:text-right">
                <p className="text-sm font-semibold text-red-600">
                  Current Due
                </p>
                <h3 className="mt-1 text-3xl font-bold text-red-700">
                  ₹{stats.totalDue}
                </h3>

                <button
                  onClick={() => setCollectOpen(true)}
                  className="mt-4 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
                >
                  Collect Payment
                </button>
              </div>
              ) : stats.totalAdvance > 0 ? (
            <div className="rounded-2xl bg-green-50 p-5 text-left lg:min-w-[230px] lg:text-right">
                <p className="text-sm font-semibold text-green-600">
                Customer Advance
                </p>
                <h3 className="mt-1 text-3xl font-bold text-green-700">
                ₹{stats.totalAdvance}
                </h3>
            </div>
            ) : null}
          </div>
        </section>
      )}

      <section className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShoppingCart className="text-purple-600" />
          <p className="mt-4 text-sm text-slate-500">Total Orders</p>
          <h3 className="text-2xl font-bold text-slate-900">
            {stats.totalOrders}
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <IndianRupee className="text-indigo-600" />
          <p className="mt-4 text-sm text-slate-500">Total Sales</p>
          <h3 className="text-2xl font-bold text-slate-900">
            ₹{stats.totalSales}
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <IndianRupee className="text-green-600" />
          <p className="mt-4 text-sm text-slate-500">Total Paid</p>
          <h3 className="text-2xl font-bold text-slate-900">
            ₹{stats.totalPaid}
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <IndianRupee className="text-red-600" />
          <p className="mt-4 text-sm text-slate-500">Current Due</p>
          <h3 className="text-2xl font-bold text-slate-900">
            ₹{stats.totalDue}
          </h3>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Order History
          </h2>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No orders found.
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order._id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                      <h3 className="mt-1 font-bold text-slate-900">
                        ₹{order.subTotal}
                      </h3>
                    </div>

                    <span
                      className={`h-fit rounded-full px-3 py-1 text-xs font-bold capitalize ${
                        order.paymentStatus === "paid"
                          ? "bg-green-50 text-green-700"
                          : order.paymentStatus === "partial"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {order.paymentStatus}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    {order.items?.map((item, index) => (
                      <div
                        key={index}
                        className="flex justify-between py-1 text-sm"
                      >
                        <span className="text-slate-600">
                          {item.productName} × {item.quantity}{" "}
                          {item.selectedUnit || item.unit}
                        </span>
                        <span className="font-semibold text-slate-900">
                          ₹{item.total}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.ledger && (
                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-5">
                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Previous Due
                        </p>
                        <p className="mt-1 font-bold text-orange-700">
                          ₹{order.ledger.previousDue}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          New Bill
                        </p>
                        <p className="mt-1 font-bold text-slate-900">
                          ₹{order.ledger.newBill}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Total Payable
                        </p>
                        <p className="mt-1 font-bold text-blue-700">
                          ₹{order.ledger.totalPayable}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Paid Now
                        </p>
                        <p className="mt-1 font-bold text-green-700">
                          ₹{order.ledger.paidNow}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500">
                          Balance
                        </p>
                       <p
                        className={`mt-1 font-bold ${
                            order.ledger.balanceAfterOrder > 0
                            ? "text-red-700"
                            : order.ledger.balanceAfterOrder < 0
                            ? "text-green-700"
                            : "text-slate-900"
                        }`}
                        >
                        {order.ledger.balanceAfterOrder > 0
                            ? `Due ₹${order.ledger.dueAfterOrder}`
                            : order.ledger.balanceAfterOrder < 0
                            ? `Advance ₹${order.ledger.advanceAfterOrder}`
                            : "Clear ₹0"}
                        </p>
                      </div>
                    </div>
                  )}
                  {order.ledger.previousAdvance > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500">
                        Previous Advance
                        </p>
                        <p className="mt-1 font-bold text-green-700">
                        ₹{order.ledger.previousAdvance}
                        </p>
                    </div>
                    )}

                  <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl sm:grid-cols-3 bg-slate-50 p-3 text-sm">
                    <div>
                      <p className="text-slate-500">Paid</p>
                      <p className="font-bold text-green-700">
                        ₹{order.paidAmount}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Due</p>
                      <p className="font-bold text-red-700">
                        ₹{order.dueAmount}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Return</p>
                      <p className="font-bold text-slate-900">
                        {order.returnDate
                          ? new Date(order.returnDate).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Payment History
          </h2>

          <div className="space-y-4">
            {payments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                No payments found.
              </div>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment._id}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        ₹{payment.amount}
                      </h3>
                      <p className="mt-1 text-sm capitalize text-slate-500">
                        {payment.paymentMode}
                      </p>
                    </div>

                    <p className="text-sm text-slate-500">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </p>
                  </div>

                  {payment.notes && (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      {payment.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      {collectOpen && (
  <div className="mobile-sheet fixed inset-0 z-50 flex bg-black/50 sm:px-4">
    <div className="modal-panel w-full max-w-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Collect Payment
          </h2>
          <p className="text-sm text-slate-500">
            Receive payment from {customer?.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCollectOpen(false)}
          className="rounded-xl bg-slate-100 px-3 py-2 font-bold text-slate-600"
        >
          X
        </button>
      </div>

      <form onSubmit={handleCollectPayment}>
        <div className="space-y-4 p-6">
          <div className="rounded-2xl bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-600">
              Current Total Due
            </p>
            <h3 className="text-3xl font-bold text-red-700">
              ₹{stats.totalDue}
            </h3>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Amount Received
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={collectForm.amount}
              onChange={(e) =>
                setCollectForm({
                  ...collectForm,
                  amount: e.target.value,
                })
              }
              placeholder="Enter amount"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />

            <button
              type="button"
              onClick={() =>
                setCollectForm({
                  ...collectForm,
                  amount: stats.totalDue,
                })
              }
              className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700"
            >
              Fill Full Due ₹{stats.totalDue}
            </button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Payment Mode
            </label>
            <select
              value={collectForm.paymentMode}
              onChange={(e) =>
                setCollectForm({
                  ...collectForm,
                  paymentMode: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Payment Date
            </label>
            <input
              type="date"
              value={collectForm.paymentDate}
              onChange={(e) =>
                setCollectForm({
                  ...collectForm,
                  paymentDate: e.target.value,
                })
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Notes
            </label>
            <textarea
              rows="3"
              value={collectForm.notes}
              onChange={(e) =>
                setCollectForm({
                  ...collectForm,
                  notes: e.target.value,
                })
              }
              placeholder="Example: Final payment received"
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />
          </div>
        </div>

        <div className="thumb-footer flex flex-col-reverse gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => setCollectOpen(false)}
            className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700"
          >
            Cancel
          </button>

          <button
            disabled={
              collectLoading ||
              !collectForm.amount ||
              !Number.isFinite(Number(collectForm.amount)) ||
              Number(collectForm.amount) <= 0 ||
              Number(collectForm.amount) > Number(stats.totalDue)
            }
            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
          >
            {collectLoading ? "Saving..." : "Collect Payment"}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </AppLayout>
  );
};

export default CustomerDetail;
