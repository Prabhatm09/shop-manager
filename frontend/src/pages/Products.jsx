import { useEffect, useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import ProductFormModal from "../components/ProductFormModal";
import {
  CATEGORY_OPTIONS,
  initialProductForm,
} from "../constants/forms";


const Products = () => {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialProductForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products");
      setProducts(res.data.products || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load products");
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
  saleUnits: (form.saleUnits || []).map((unit) => ({
    unit: unit.unit,
    conversionToBase: Number(unit.conversionToBase || 1),
    pricePerUnit: Number(unit.pricePerUnit || 0),
  })),
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

  const handleAddStock = async (product) => {
  const quantity = window.prompt(`Add stock for ${product.name}`);

  if (!quantity || Number(quantity) <= 0) return;

  const reason = window.prompt("Reason", "New stock added") || "New stock added";

  try {
    await API.patch(`/products/${product._id}/add-stock`, {
      quantity: Number(quantity),
      reason,
    });

    setMessage("Stock added successfully");
    fetchProducts();
  } catch (error) {
    setMessage(error.response?.data?.message || "Failed to add stock");
  }
};

const handleAdjustStock = async (product) => {
  const newStock = window.prompt(
    `Set current stock for ${product.name}`,
    product.currentStock
  );

  if (newStock === null || Number(newStock) < 0) return;

  const reason =
    window.prompt("Reason", "Manual stock correction") ||
    "Manual stock correction";

  try {
    await API.patch(`/products/${product._id}/adjust-stock`, {
      newStock: Number(newStock),
      reason,
    });

    setMessage("Stock adjusted successfully");
    fetchProducts();
  } catch (error) {
    setMessage(error.response?.data?.message || "Failed to adjust stock");
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
      <div className="surface p-6">
        <section className="surface p-6">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Product List
          </h2>

          <div className="overflow-x-auto">
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
                {products.length === 0 ? (
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
                                onClick={() => handleAddStock(product)}
                                className="btn-muted text-xs text-green-700"
                                >
                                + Stock
                                </button>

                                <button
                                onClick={() => handleAdjustStock(product)}
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
    </AppLayout>
  );
};

export default Products;
