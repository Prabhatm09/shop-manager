import { X } from "lucide-react";

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
      <div className="modal-panel max-h-[92vh] w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
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
            className="btn-muted p-2"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="max-h-[65vh] overflow-y-auto p-6">
            <div className="space-y-4">
              <div>
                <label className="field-label">
                  Customer Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: Ramesh Kumar"
                  className="form-control px-4 py-3"
                />
              </div>

              <div>
                <label className="field-label">
                  Phone Number
                </label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  className="form-control px-4 py-3"
                />
              </div>

              <div>
                <label className="field-label">
                  Address
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Customer address"
                  className="form-control resize-none px-4 py-3"
                />
              </div>

              <div>
                <label className="field-label">
                  Opening Due Amount
                </label>
                <input
                  name="openingDue"
                  value={form.openingDue}
                  onChange={handleChange}
                  type="number"
                  placeholder="5000"
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
                  placeholder="Optional notes"
                  className="form-control resize-none px-4 py-3"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="btn-muted"
            >
              Cancel
            </button>

            <button
              disabled={loading}
              className="btn-success"
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

export default CustomerFormModal;
