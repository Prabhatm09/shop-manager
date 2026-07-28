import { Plus, Trash2, X } from "lucide-react";
import { CATEGORY_OPTIONS } from "../constants/forms";

const getSuggestedSaleUnits = (form) => {
  const price = Number(form.pricePerUnit || 0);
  const subCategory = form.subCategory?.toLowerCase();

  if (subCategory === "cement") {
    return [
      { unit: "bag", conversionToBase: 1, pricePerUnit: price || "" },
      {
        unit: "kg",
        conversionToBase: 0.02,
        pricePerUnit: price ? Number((price / 50).toFixed(2)) : "",
      },
    ];
  }

  if (["balu", "maurang", "gitti"].includes(subCategory)) {
    return [
      { unit: "feet", conversionToBase: 1, pricePerUnit: price || "" },
      { unit: "bag", conversionToBase: 1.5, pricePerUnit: "" },
      { unit: "half bag", conversionToBase: 0.75, pricePerUnit: "" },
    ];
  }

  if (subCategory === "brick") {
    return [{ unit: "piece", conversionToBase: 1, pricePerUnit: price || "" }];
  }

  return [
    {
      unit: form.unit || "piece",
      conversionToBase: 1,
      pricePerUnit: price || "",
    },
  ];
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

  const addSaleUnit = () => {
    setForm({
      ...form,
      saleUnits: [
        ...(form.saleUnits || []),
        {
          unit: form.unit || "bag",
          conversionToBase: 1,
          pricePerUnit: form.pricePerUnit || "",
        },
      ],
    });
  };

  const useSuggestedSaleUnits = () => {
    setForm({
      ...form,
      saleUnits: getSuggestedSaleUnits(form),
    });
  };

  const updateSaleUnit = (index, field, value) => {
    const saleUnits = [...(form.saleUnits || [])];
    saleUnits[index] = {
      ...saleUnits[index],
      [field]: value,
    };

    setForm({
      ...form,
      saleUnits,
    });
  };

  const removeSaleUnit = (index) => {
    setForm({
      ...form,
      saleUnits: (form.saleUnits || []).filter((_, itemIndex) => itemIndex !== index),
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
          <div className="max-h-[68vh] overflow-y-auto p-4 sm:p-6">
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

              <div className="rounded-xl border border-slate-200 bg-[color:var(--shop-panel-2)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Sale Units
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Set bag, kg, feet or loose rates used during billing.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={useSuggestedSaleUnits}
                    className="btn-muted px-3 py-2 text-xs"
                  >
                    <Plus size={15} />
                    Common Units
                  </button>
                </div>

                <button
                  type="button"
                  onClick={addSaleUnit}
                  className="mt-3 btn-muted px-3 py-2 text-xs"
                >
                  <Plus size={15} />
                  Add Custom Unit
                </button>

                <div className="mt-4 space-y-3">
                  {(form.saleUnits || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-[color:var(--shop-panel)] p-4 text-sm font-semibold text-slate-500">
                      If empty, billing uses the main unit and price above.
                    </div>
                  ) : (
                    form.saleUnits.map((saleUnit, index) => (
                      <div
                        key={`${saleUnit.unit}-${index}`}
                        className="grid grid-cols-1 gap-3 rounded-xl bg-[color:var(--shop-panel)] p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                      >
                        <div>
                          <label className="field-label">Unit</label>
                          <input
                            value={saleUnit.unit}
                            onChange={(e) =>
                              updateSaleUnit(index, "unit", e.target.value)
                            }
                            placeholder="bag, kg, feet"
                            className="form-control px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="field-label">Stock Deduct</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={saleUnit.conversionToBase}
                            onChange={(e) =>
                              updateSaleUnit(
                                index,
                                "conversionToBase",
                                e.target.value
                              )
                            }
                            placeholder="1"
                            className="form-control px-3 py-2"
                          />
                        </div>

                        <div>
                          <label className="field-label">Default Price</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={saleUnit.pricePerUnit}
                            onChange={(e) =>
                              updateSaleUnit(index, "pricePerUnit", e.target.value)
                            }
                            placeholder="410"
                            className="form-control px-3 py-2"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => removeSaleUnit(index)}
                          className="btn-muted self-end p-3 text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="field-label">Quick Quantities</label>
                <input
                  name="quickQuantities"
                  value={form.quickQuantities}
                  onChange={handleChange}
                  placeholder="10, 50, 100"
                  className="form-control px-4 py-3"
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
