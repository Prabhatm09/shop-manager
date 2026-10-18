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
    <div className="mobile-sheet fixed inset-0 z-50 flex bg-black/50 sm:px-4">
      <div className="modal-panel max-h-[92vh] w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6">
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
          <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-6">
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
                  Mobile Number <span className="font-medium text-slate-400">(+91, 10 digits)</span>
                </label>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-100">
                  <span className="flex min-h-12 items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-600">+91</span>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={(event) =>
                      handleChange({
                        target: {
                          name: "phone",
                          value: event.target.value.replace(/\D/g, "").slice(0, 10),
                        },
                      })
                    }
                    placeholder="9876543210"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    className="min-w-0 flex-1 border-0 px-3 py-3 text-base outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="field-label">
                  Address <span className="font-medium text-slate-400">(optional)</span>
                </label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Customer address (optional)"
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

          <div className="thumb-footer flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
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
