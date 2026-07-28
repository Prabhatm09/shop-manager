import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";
import API from "../api/axios";

const getQuickSaleUnits = (product) => {
  const price = Number(product.pricePerUnit || 0);
  const subCategory = product.subCategory?.toLowerCase();

  if (subCategory === "brick") {
    return [{ unit: "piece", conversionToBase: 1, defaultPrice: price }];
  }

  if (["balu", "maurang", "gitti"].includes(subCategory)) {
    return [
      { unit: "bag", conversionToBase: 1.5, defaultPrice: 120 },
      { unit: "half bag", conversionToBase: 0.75, defaultPrice: 60 },
    ];
  }

  if (subCategory === "cement") {
    return [
      { unit: "bag", conversionToBase: 1, defaultPrice: 410 },
      { unit: "kg", conversionToBase: 1 / 50, defaultPrice: 12 },
    ];
  }

  return [
    {
      unit: product.unit || "piece",
      conversionToBase: 1,
      defaultPrice: price,
    },
  ];
};

const QuickSaleModal = ({ open, onClose }) => {
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchProducts = async () => {
    try {
      const res = await API.get("/products");
      setProducts(res.data.products || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load products");
    }
  };

  useEffect(() => {
    if (open) {
      fetchProducts();
      setMessage("");
    }
  }, [open]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      product.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  const totalAmount = selectedItems.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.pricePerUnit || 0);
  }, 0);

  const addProduct = (product) => {
    const unitOptions = getQuickSaleUnits(product);
    const defaultUnit = unitOptions[0];

    setSelectedItems([
      ...selectedItems,
      {
        productId: product._id,
        name: product.name,
        subCategory: product.subCategory,
        currentStock: Number(product.currentStock || 0),
        unitOptions,
        selectedUnit: defaultUnit.unit,
        conversionToBase: defaultUnit.conversionToBase,
        quantity: defaultUnit.unit === "half bag" ? 1 : 1,
        pricePerUnit: defaultUnit.defaultPrice,
      },
    ]);
  };

  const updateItem = (index, field, value) => {
    const updated = [...selectedItems];

    if (field === "selectedUnit") {
      const selectedUnit = updated[index].unitOptions.find(
        (item) => item.unit === value
      );

      updated[index] = {
        ...updated[index],
        selectedUnit: selectedUnit.unit,
        conversionToBase: selectedUnit.conversionToBase,
        pricePerUnit: selectedUnit.defaultPrice,
        quantity: 1,
      };

      setSelectedItems(updated);
      return;
    }

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setSelectedItems(updated);
  };

  const increaseQty = (index) => {
    const updated = [...selectedItems];
    updated[index].quantity = Number(updated[index].quantity || 0) + 1;
    setSelectedItems(updated);
  };

  const decreaseQty = (index) => {
    const updated = [...selectedItems];
    const nextQty = Number(updated[index].quantity || 0) - 1;

    if (nextQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = nextQty;
    }

    setSelectedItems(updated);
  };

  const removeItem = (index) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const resetAndClose = () => {
    setSelectedItems([]);
    setPaymentMode("cash");
    setSearch("");
    setMessage("");
    setLoading(false);
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setMessage("");

      if (selectedItems.length === 0) {
        setMessage("Please add at least one item");
        return;
      }

      for (const item of selectedItems) {
        if (!item.quantity || Number(item.quantity) <= 0) {
          setMessage(`Invalid quantity for ${item.name}`);
          return;
        }

        if (!item.pricePerUnit || Number(item.pricePerUnit) <= 0) {
          setMessage(`Invalid price for ${item.name}`);
          return;
        }

        const stockDeduct =
          Number(item.quantity || 0) * Number(item.conversionToBase || 1);

        if (stockDeduct > item.currentStock) {
          setMessage(`${item.name} stock not enough`);
          return;
        }
      }

      setLoading(true);

      await API.post("/orders/quick-sale", {
        paymentMode,
        items: selectedItems.map((item) => ({
          productId: item.productId,
          selectedUnit: item.selectedUnit,
          quantity: Number(item.quantity),
          pricePerUnit: Number(item.pricePerUnit),
          conversionToBase: Number(item.conversionToBase || 1),
        })),
      });

      setMessage("Quick sale completed successfully");

      setTimeout(() => {
        resetAndClose();
        window.location.reload();
      }, 700);
    } catch (error) {
      setMessage(error.response?.data?.message || "Quick sale failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="modal-panel max-h-[94vh] w-full max-w-6xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Quick Sale</h2>
            <p className="text-sm text-slate-500">
              Fast cash/UPI sale without customer details
            </p>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="btn-muted p-2"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {message && (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm font-semibold ${
                message.includes("successfully")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
            <section>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product..."
                className="mb-5 form-control px-4 py-3"
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredProducts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 md:col-span-2">
                    No products found.
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const unitOptions = getQuickSaleUnits(product);
                    const defaultUnit = unitOptions[0];

                    return (
                      <div
                        key={product._id}
                        className="surface-flat p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-slate-900">
                              {product.name}
                            </h3>
                            <p className="mt-1 text-sm capitalize text-slate-500">
                              {product.subCategory || product.category}
                            </p>
                          </div>

                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                            Stock: {product.currentStock || 0}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <p className="text-lg font-bold text-slate-900">
                            ₹{defaultUnit.defaultPrice}
                            <span className="text-sm font-medium text-slate-500">
                              /{defaultUnit.unit}
                            </span>
                          </p>

                          <button
                            type="button"
                            onClick={() => addProduct(product)}
                            className="btn-success text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <aside className="surface-flat sticky top-4 self-start p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Sale Items
                </h3>

                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>

              <div className="space-y-4">
                {selectedItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    No items selected.
                  </div>
                ) : (
                  selectedItems.map((item, index) => {
                    const lineTotal =
                      Number(item.quantity || 0) *
                      Number(item.pricePerUnit || 0);

                    const stockDeduct =
                      Number(item.quantity || 0) *
                      Number(item.conversionToBase || 1);

                    return (
                      <div
                        key={`${item.productId}-${index}`}
                        className="surface-flat p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {item.name}
                            </h4>
                            <p className="text-xs capitalize text-slate-500">
                              {item.subCategory}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-500">
                              Unit
                            </label>
                            <select
                              value={item.selectedUnit}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "selectedUnit",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none"
                            >
                              {item.unitOptions.map((unit) => (
                                <option key={unit.unit} value={unit.unit}>
                                  {unit.unit}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-500">
                                Quantity
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => decreaseQty(index)}
                                  className="btn-muted p-2"
                                >
                                  <Minus size={15} />
                                </button>

                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(
                                      index,
                                      "quantity",
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-center"
                                />

                                <button
                                  type="button"
                                  onClick={() => increaseQty(index)}
                                  className="btn-muted p-2"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-xs font-bold text-slate-500">
                                Price / Unit
                              </label>
                              <input
                                type="number"
                                value={item.pricePerUnit}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "pricePerUnit",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                              />
                            </div>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                            Stock deduct: {stockDeduct.toFixed(2)}
                          </div>

                          <div className="flex justify-between rounded-xl bg-green-50 px-3 py-3">
                            <span className="font-bold text-green-700">
                              Line Total
                            </span>
                            <span className="font-bold text-green-700">
                              ₹{lineTotal}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-5 bill-panel p-4">
                <div className="flex justify-between text-lg">
                  <span>Total</span>
                  <span className="font-bold">₹{totalAmount}</span>
                </div>

                <div className="mt-2 flex justify-between text-sm text-slate-300">
                  <span>Payment Mode</span>
                  <span className="font-bold capitalize">{paymentMode}</span>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={resetAndClose}
            className="btn-muted"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={loading || selectedItems.length === 0}
            onClick={handleSubmit}
            className="btn-success"
          >
            {loading ? "Saving..." : "Complete Quick Sale"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickSaleModal;