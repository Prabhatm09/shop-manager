import { X } from "lucide-react";
import { CATEGORY_OPTIONS } from "../constants/forms";

const ProductFormModal = ({
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
    const { name, value } = e.target;

    if (name === "category") {
      setForm({
        ...form,
        category: value,
        subCategory: CATEGORY_OPTIONS[value][0],
      });
      return;
    }

    setForm({
      ...form,
      [name]: value,
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
              {editingId ? "Edit Product" : "Add Product"}
            </h2>
            <p className="text-sm text-slate-500">
              Manage product price, stock and category
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
                  Product Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: Cement, Balli, Patra"
                  className="form-control px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">
                    Section
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="form-control px-4 py-3"
                  >
                    <option value="building_material">Building Material</option>
                    <option value="timber">Timber</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">
                    Sub Category
                  </label>
                  <select
                    name="subCategory"
                    value={form.subCategory}
                    onChange={handleChange}
                    className="form-control px-4 py-3"
                  >
                    {CATEGORY_OPTIONS[form.category].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">
                    Unit
                  </label>
                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className="form-control px-4 py-3"
                  >
                    <option value="bag">Bag</option>
                    <option value="feet">Feet</option>
                    <option value="piece">Piece</option>
                    <option value="tractor">Tractor</option>
                    <option value="trolley">Trolley</option>
                    <option value="kg">KG</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">
                    Price / Unit
                  </label>
                  <input
                    name="pricePerUnit"
                    value={form.pricePerUnit}
                    onChange={handleChange}
                    type="number"
                    placeholder="390"
                    className="form-control px-4 py-3"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">
                    Opening / Current Stock
                  </label>
                  <input
                    name="currentStock"
                    value={form.currentStock}
                    onChange={handleChange}
                    type="number"
                    placeholder="100"
                    disabled={!!editingId}
                    className="form-control px-4 py-3"
                  />
                  {editingId && (
                    <p className="mt-1 text-xs text-slate-500">
                      Use + Stock / Adjust buttons to change inventory.
                    </p>
                  )}
                </div>

                <div>
                  <label className="field-label">
                    Low Stock Alert
                  </label>
                  <input
                    name="lowStockAlert"
                    value={form.lowStockAlert}
                    onChange={handleChange}
                    type="number"
                    placeholder="10"
                    className="form-control px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Optional description"
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
              className="btn-primary"
            >
              {loading
                ? "Saving..."
                : editingId
                ? "Update Product"
                : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductFormModal;
