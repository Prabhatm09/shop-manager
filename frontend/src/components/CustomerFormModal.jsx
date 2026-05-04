import { X } from "lucide-react";

const initialCustomerForm = {
  name: "",
  phone: "",
  address: "",
  openingDue: "",
  notes: "",
};

const CustomerFormModal = ({
  open,
  onClose,
  form,
  setForm,
  editingId,
  loading,
  onSubmit,
  onCancelEdit,
}) => {
  if (!open) return null;

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleClose = () => {
    onCancelEdit();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {editingId ? "Edit Customer" : "Add Customer"}
            </h2>
            <p className="text-sm text-slate-500">
              Manage customer details and opening due
            </p>
          </div>

          <button
            onClick={handleClose}
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
                  Customer Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: Ramesh Kumar"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Phone Number
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Address
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Customer address"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Opening Due Amount
                </label>
                <input
                  name="openingDue"
                  value={form.openingDue}
                  onChange={handleChange}
                  type="number"
                  placeholder="5000"
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
                  placeholder="Optional notes"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>

            <button
              disabled={loading}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
            >
              {loading
                ? "Saving..."
                : editingId
                ? "Update Customer"
                : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export { initialCustomerForm };
export default CustomerFormModal;