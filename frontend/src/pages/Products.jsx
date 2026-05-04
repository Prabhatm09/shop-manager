import { useEffect, useState } from "react";
import { ArrowLeft, Edit, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import ProductFormModal, {
  initialForm,
  CATEGORY_OPTIONS,
} from "../components/ProductFormModal";


const Products = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
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

const resetForm = () => {
  setForm(initialForm);
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
      className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 md:w-auto"
    >
      + Add Product
    </button>
  }
>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-slate-900">
            Product List
          </h2>

          <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-sm text-slate-600">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Sub Category</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
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
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                            Low Stock
                            </span>
                        ) : (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                            In Stock
                            </span>
                        )}
                        </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleAddStock(product)}
                                className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-100"
                                >
                                + Stock
                                </button>

                                <button
                                onClick={() => handleAdjustStock(product)}
                                className="rounded-lg bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700 hover:bg-orange-100"
                                >
                                Adjust
                            </button>
                          <button
                            onClick={() => handleEdit(product)}
                            className="rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100"
                          >
                            <Edit size={17} />
                          </button>

                          <button
                            onClick={() => handleDelete(product._id)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
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