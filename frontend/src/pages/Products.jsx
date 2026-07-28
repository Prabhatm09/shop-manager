import { useEffect, useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import LoadingState from "../components/LoadingState";
import ProductFormModal from "../components/ProductFormModal";
import {
  CATEGORY_OPTIONS,
  initialProductForm,
} from "../constants/forms";

const normalizeSaleUnits = (form) => {
  const saleUnits = (form.saleUnits || [])
    .map((unit) => ({
      unit: unit.unit?.trim(),
      conversionToBase: Number(unit.conversionToBase || 1),
      pricePerUnit: Number(unit.pricePerUnit || 0),
    }))
    .filter(
      (unit) =>
        unit.unit &&
        Number.isFinite(unit.conversionToBase) &&
        unit.conversionToBase > 0 &&
        Number.isFinite(unit.pricePerUnit) &&
        unit.pricePerUnit > 0
    );

  if (saleUnits.length > 0) return saleUnits;

  return [
    {
      unit: form.unit,
      conversionToBase: 1,
      pricePerUnit: Number(form.pricePerUnit || 0),
    },
  ];
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialProductForm);
  const [editingId, setEditingId] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stockModal, setStockModal] = useState({
    open: false,
    mode: "add",
    product: null,
    quantity: "",
    reason: "",
  });

  const fetchProducts = async () => {
    try {
      setDataLoading(true);
      const res = await API.get("/products");
      setProducts(res.data.products || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load products");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

const resetForm = () => {
  setForm(initialProductForm);
  setEditingId(null);
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

  const payload = {
  ...form,
  pricePerUnit: Number(form.pricePerUnit),
  currentStock: Number(form.currentStock || 0),
  lowStockAlert: Number(form.lowStockAlert || 10),
  saleUnits: normalizeSaleUnits(form),
  quickQuantities:
    typeof form.quickQuantities === "string"
      ? form.quickQuantities
          .split(",")
          .map((item) => Number(item.trim()))
          .filter(Boolean)
      : form.quickQuantities || [],
};
    try {
      if (editingId) {
        await API.put(`/products/${editingId}`, payload);
        setMessage("Product updated successfully");
      } else {
        await API.post("/products", payload);
        setMessage("Product created successfully");
      }

      resetForm();
      fetchProducts();
      setIsModalOpen(false);
    } catch (error) {
      setMessage(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

 const handleEdit = (product) => {
  setEditingId(product._id);

  setForm({
    name: product.name || "",
    category: product.category || "building_material",
    subCategory:
      product.subCategory ||
      CATEGORY_OPTIONS[product.category || "building_material"]?.[0] ||
      "cement",
    unit: product.unit || "bag",
    pricePerUnit: product.pricePerUnit || "",
    currentStock: product.currentStock || "",
    lowStockAlert: product.lowStockAlert || 10,
    description: product.description || "",
    saleUnits: product.saleUnits?.length
      ? product.saleUnits.map((unit) => ({
          unit: unit.unit || "",
          conversionToBase: unit.conversionToBase || 1,
          pricePerUnit: unit.pricePerUnit || "",
        }))
      : [
          {
            unit: product.unit || "bag",
            conversionToBase: 1,
            pricePerUnit: product.pricePerUnit || "",
          },
        ],
    quickQuantities: product.quickQuantities?.join(", ") || "",
  });

  setIsModalOpen(true);
};

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this product?");
    if (!confirmDelete) return;

    try {
      await API.delete(`/products/${id}`);
      setMessage("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      setMessage(error.response?.data?.message || "Delete failed");
    }
  };

  const openStockModal = (mode, product) => {
    setMessage("");
    setStockModal({
      open: true,
      mode,
      product,
      quantity: mode === "adjust" ? String(product.currentStock || 0) : "",
      reason: mode === "adjust" ? "Manual stock correction" : "New stock added",
    });
  };

  const closeStockModal = () => {
    setStockModal({
      open: false,
      mode: "add",
      product: null,
      quantity: "",
      reason: "",
    });
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();

    const value = Number(stockModal.quantity);

    if (!stockModal.product) return;

    if (stockModal.mode === "add" && (!value || value <= 0)) {
      setMessage("Stock quantity must be greater than 0");
      return;
    }

    if (stockModal.mode === "adjust" && value < 0) {
      setMessage("Stock cannot be negative");
      return;
    }

    try {
      setStockLoading(true);
      setMessage("");

      if (stockModal.mode === "add") {
        await API.patch(`/products/${stockModal.product._id}/add-stock`, {
          quantity: value,
          reason: stockModal.reason || "New stock added",
        });
        setMessage("Stock added successfully");
      } else {
        await API.patch(`/products/${stockModal.product._id}/adjust-stock`, {
          newStock: value,
          reason: stockModal.reason || "Manual stock correction",
        });
        setMessage("Stock adjusted successfully");
      }

      setStockModal({
        open: false,
        mode: "add",
        product: null,
        quantity: "",
        reason: "",
      });
      fetchProducts();
    } catch (error) {
      setMessage(error.response?.data?.message || "Stock update failed");
    } finally {
      setStockLoading(false);
    }
  };

  return (
   <AppLayout
  title="Products"
  subtitle="Manage building material, timber and other inventory"
  headerAction={
    <button
      onClick={() => {
        resetForm();
        setIsModalOpen(true);
      }}
      className="btn-primary w-full md:w-auto"
    >
      + Add Product
    </button>
  }
>
      {message && (
        <div className="toast mb-5 px-4 py-3 text-sm font-semibold">
          {message}
        </div>
      )}
      <div className="surface p-4 sm:p-6">
        <section>
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Product List
          </h2>

          <div className="space-y-3 md:hidden">
            {dataLoading ? (
              <LoadingState label="Loading shop inventory..." />
            ) : products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No products found. Add your first product.
              </div>
            ) : (
              products.map((product) => {
                const isLowStock =
                  (product.currentStock || 0) <= (product.lowStockAlert || 0);

                return (
                  <article key={product._id} className="surface-flat p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-900">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-xs font-semibold capitalize text-slate-500">
                          {product.category} / {product.subCategory || "-"}
                        </p>
                      </div>
                      <span
                        className={`status-pill ${
                          isLowStock
                            ? "bg-[color:var(--shop-brick-soft)] text-red-700"
                            : "bg-[color:var(--shop-primary-soft)] text-green-700"
                        }`}
                      >
                        {isLowStock ? "Low" : "Stock"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl sm:grid-cols-3 bg-[color:var(--shop-panel-2)] p-3 text-sm">
                      <div>
                        <p className="text-xs font-bold text-slate-500">Price</p>
                        <p className="font-black text-slate-900">₹{product.pricePerUnit}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">Stock</p>
                        <p className="font-black text-slate-900">
                          {product.currentStock || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">Unit</p>
                        <p className="font-black capitalize text-slate-900">{product.unit}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openStockModal("add", product)}
                        className="btn-success text-sm"
                      >
                        + Stock
                      </button>
                      <button
                        onClick={() => openStockModal("adjust", product)}
                        className="btn-muted text-sm text-orange-700"
                      >
                        Adjust
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="btn-muted text-sm text-[color:var(--shop-primary-strong)]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="btn-muted text-sm text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="shop-table w-full min-w-[980px]">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Sub Category</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {dataLoading ? (
                  <tr>
                    <td colSpan="8" className="bg-[color:var(--shop-panel)] px-4 py-8">
                      <LoadingState label="Loading shop inventory..." />
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      No products found. Add your first product.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr
                      key={product._id}
                      className="border-b text-sm hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {product.name}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {product.category}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {product.subCategory || "-"}
                     </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {product.unit}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        ₹{product.pricePerUnit}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {product.currentStock || 0} {product.unit}
                        </td>

                        <td className="px-4 py-3">
                        {(product.currentStock || 0) <= (product.lowStockAlert || 0) ? (
                            <span className="status-pill bg-[color:var(--shop-brick-soft)] text-red-700">
                            Low Stock
                            </span>
                        ) : (
                            <span className="status-pill bg-[color:var(--shop-primary-soft)] text-green-700">
                            In Stock
                            </span>
                        )}
                        </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => openStockModal("add", product)}
                                className="btn-muted text-xs text-green-700"
                                >
                                + Stock
                                </button>

                                <button
                                onClick={() => openStockModal("adjust", product)}
                                className="btn-muted text-xs text-orange-700"
                                >
                                Adjust
                            </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="btn-muted p-2 text-[color:var(--shop-primary-strong)]"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            onClick={() => handleDelete(product._id)}
                            className="btn-muted p-2 text-red-700"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
<ProductFormModal
  open={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  form={form}
  setForm={setForm}
  editingId={editingId}
  loading={loading}
  onSubmit={handleSubmit}
  onCancelEdit={resetForm}
/>
      {stockModal.open && (
        <div className="mobile-sheet fixed inset-0 z-50 flex bg-black/50 sm:px-4">
          <div className="modal-panel max-h-[92vh] w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6" style={{ borderColor: "var(--shop-border)" }}>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {stockModal.mode === "add" ? "Add Stock" : "Adjust Stock"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {stockModal.product?.name} currently has{" "}
                  {stockModal.product?.currentStock || 0}{" "}
                  {stockModal.product?.unit}
                </p>
              </div>

              <button
                type="button"
                onClick={closeStockModal}
                disabled={stockLoading}
                className="btn-muted p-2"
              >
                X
              </button>
            </div>

            <form onSubmit={handleStockSubmit}>
              <div className="space-y-4 p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-[color:var(--shop-panel-2)] p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-500">
                      Current Stock
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                      {stockModal.product?.currentStock || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Unit</p>
                    <p className="mt-1 text-xl font-black capitalize text-slate-900">
                      {stockModal.product?.unit}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="field-label">
                    {stockModal.mode === "add"
                      ? "Quantity to add"
                      : "Set final stock"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={stockModal.mode === "add" ? "0.01" : "0"}
                    value={stockModal.quantity}
                    onChange={(e) =>
                      setStockModal({
                        ...stockModal,
                        quantity: e.target.value,
                      })
                    }
                    className="form-control px-4 py-3 text-lg font-bold"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="field-label">Reason</label>
                  <textarea
                    rows="3"
                    value={stockModal.reason}
                    onChange={(e) =>
                      setStockModal({
                        ...stockModal,
                        reason: e.target.value,
                      })
                    }
                    className="form-control resize-none px-4 py-3"
                    placeholder="Example: Supplier delivery"
                  />
                </div>
              </div>

              <div className="thumb-footer flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-6" style={{ borderColor: "var(--shop-border)" }}>
                <button
                  type="button"
                  onClick={closeStockModal}
                  disabled={stockLoading}
                  className="btn-muted"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    stockLoading ||
                    !stockModal.quantity ||
                    Number(stockModal.quantity) < 0 ||
                    (stockModal.mode === "add" &&
                      Number(stockModal.quantity) <= 0)
                  }
                  className="btn-success"
                >
                  {stockLoading
                    ? "Saving..."
                    : stockModal.mode === "add"
                    ? "Add Stock"
                    : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Products;
