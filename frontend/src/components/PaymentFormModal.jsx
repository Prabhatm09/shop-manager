import { X } from "lucide-react";

const initialPaymentForm = {
  orderId: "",
  amount: "",
  paymentMode: "cash",
  paymentDate: "",
  notes: "",
};

const PaymentFormModal = ({
  open,
  onClose,
  orders,
  form,
  setForm,
  loading,
  onSubmit,
  selectedOrder,
}) => {
  if (!open) return null;

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const fillFullDue = () => {
    if (!selectedOrder) return;

    setForm({
      ...form,
      amount: selectedOrder.dueAmount,
    });
  };

  const isAmountInvalid =
    selectedOrder &&
    Number(form.amount || 0) > Number(selectedOrder.dueAmount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Receive Payment
            </h2>
            <p className="text-sm text-slate-500">
              Collect remaining amount from due order
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="max-h-[65vh] overflow-y-auto p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Due Order
                </label>

                <select
                  name="orderId"
                  value={form.orderId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                >
                  <option value="">Choose due order</option>
                  {orders.map((order) => (
                    <option key={order._id} value={order._id}>
                      {order.customerName} | #{order._id.slice(-6).toUpperCase()} | Due ₹
                      {order.dueAmount}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder && (
                <div className="rounded-2xl bg-slate-900 p-4 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-300">Selected Order</p>
                      <h3 className="mt-1 font-bold">
                        {selectedOrder.customerName}
                      </h3>
                      <p className="text-sm text-slate-400">
                        #{selectedOrder._id.slice(-6).toUpperCase()}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                        selectedOrder.paymentStatus === "partial"
                          ? "bg-yellow-400/20 text-yellow-200"
                          : "bg-red-400/20 text-red-200"
                      }`}
                    >
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-slate-400">Total</p>
                      <p className="font-bold">₹{selectedOrder.subTotal}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Paid</p>
                      <p className="font-bold text-green-300">
                        ₹{selectedOrder.paidAmount}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Due</p>
                      <p className="font-bold text-yellow-300">
                        ₹{selectedOrder.dueAmount}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fillFullDue}
                    className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100"
                  >
                    Fill Full Due ₹{selectedOrder.dueAmount}
                  </button>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Amount
                </label>
                <input
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  type="number"
                  placeholder="1000"
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-4 ${
                    isAmountInvalid
                      ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                      : "border-slate-300 focus:border-green-600 focus:ring-green-100"
                  }`}
                />

                {isAmountInvalid && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    Amount cannot be greater than due amount.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Mode
                </label>
                <select
                  name="paymentMode"
                  value={form.paymentMode}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Date
                </label>
                <input
                  name="paymentDate"
                  value={form.paymentDate}
                  onChange={handleChange}
                  type="date"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Example: Remaining payment received"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>

            <button
              disabled={loading || isAmountInvalid || !form.orderId || !form.amount}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
            >
              {loading ? "Saving..." : "Receive Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { initialPaymentForm };
export default PaymentFormModal;