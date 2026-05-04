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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Add Payment</h2>
            <p className="text-sm text-slate-500">
              Receive payment against due order
            </p>
          </div>

          <button
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
                  Select Due Order
                </label>

                <select
                  name="orderId"
                  value={form.orderId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                >
                  <option value="">Choose order</option>
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
                  <p className="text-sm text-slate-300">Selected Order</p>
                  <h3 className="mt-1 font-bold">{selectedOrder.customerName}</h3>

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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
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
                  placeholder="Optional payment note"
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
              disabled={loading}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
            >
              {loading ? "Saving..." : "Add Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { initialPaymentForm };
export default PaymentFormModal;