import { X } from "lucide-react";
import getBillNumber from "../utils/billNumber";

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
    (!Number.isFinite(Number(form.amount)) ||
      Number(form.amount || 0) <= 0 ||
      Number(form.amount || 0) > Number(selectedOrder.dueAmount || 0));

  return (
    <div className="mobile-sheet fixed inset-0 z-50 flex bg-black/50 sm:px-4">
      <div className="modal-panel max-h-[92vh] w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
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
            className="btn-muted p-2"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="field-label">
                  Due Order
                </label>

                <select
                  name="orderId"
                  value={form.orderId}
                  onChange={handleChange}
                  className="form-control px-4 py-3"
                >
                  <option value="">Choose due order</option>
                  {orders.map((order) => (
                    <option key={order._id} value={order._id}>
                      {order.customerName} | {getBillNumber(order)} | Due ₹
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
                        {getBillNumber(selectedOrder)}
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

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
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
                    className="mt-4 btn-muted text-sm"
                  >
                    Fill Full Due ₹{selectedOrder.dueAmount}
                  </button>
                </div>
              )}

              <div>
                <label className="field-label">
                  Payment Amount
                </label>
                <input
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="1000"
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-4 ${
                    isAmountInvalid
                      ? "border-red-500 focus:border-red-600 focus:ring-red-100"
                      : "border-slate-300 focus:border-green-600 focus:ring-green-100"
                  }`}
                />

                {isAmountInvalid && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    Enter an amount greater than 0 and not more than due.
                  </p>
                )}
              </div>

              <div>
                <label className="field-label">
                  Payment Mode
                </label>
                <select
                  name="paymentMode"
                  value={form.paymentMode}
                  onChange={handleChange}
                  className="form-control px-4 py-3"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank">Bank</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="field-label">
                  Payment Date
                </label>
                <input
                  name="paymentDate"
                  value={form.paymentDate}
                  onChange={handleChange}
                  type="date"
                  className="form-control px-4 py-3"
                />
              </div>

              <div>
                <label className="field-label">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Example: Remaining payment received"
                  className="form-control resize-none px-4 py-3"
                />
              </div>
            </div>
          </div>

          <div className="thumb-footer flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-muted"
            >
              Cancel
            </button>

            <button
              disabled={loading || isAmountInvalid || !form.orderId || !form.amount}
              className="btn-success"
            >
              {loading ? "Saving..." : "Receive Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentFormModal;
