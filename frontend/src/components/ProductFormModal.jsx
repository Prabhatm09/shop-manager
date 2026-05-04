import { X } from "lucide-react";

const CATEGORY_OPTIONS = {
  building_material: ["cement", "balu", "maurang", "gitti", "brick"],
  timber: ["balli", "patra", "caheli", "sandeli", "ladder"],
  other: ["farma", "10 feet", "8 feet", "other"],
};

const initialForm = {
  name: "",
  category: "building_material",
  subCategory: "cement",
  unit: "bag",
  pricePerUnit: "",
  currentStock: "",
  lowStockAlert: "10",
  description: "",
};

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
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
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
                  Product Name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Example: Cement, Balli, Patra"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Section
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="building_material">Building Material</option>
                    <option value="timber">Timber</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Sub Category
                  </label>
                  <select
                    name="subCategory"
                    value={form.subCategory}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Unit
                  </label>
                  <select
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Price / Unit
                  </label>
                  <input
                    name="pricePerUnit"
                    value={form.pricePerUnit}
                    onChange={handleChange}
                    type="number"
                    placeholder="390"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Opening / Current Stock
                  </label>
                  <input
                    name="currentStock"
                    value={form.currentStock}
                    onChange={handleChange}
                    type="number"
                    placeholder="100"
                    disabled={!!editingId}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                  {editingId && (
                    <p className="mt-1 text-xs text-slate-500">
                      Use + Stock / Adjust buttons to change inventory.
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Low Stock Alert
                  </label>
                  <input
                    name="lowStockAlert"
                    value={form.lowStockAlert}
                    onChange={handleChange}
                    type="number"
                    placeholder="10"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Description
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Optional description"
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
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
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
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

export { initialForm, CATEGORY_OPTIONS };
export default ProductFormModal;