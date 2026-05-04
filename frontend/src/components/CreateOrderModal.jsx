import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import API from "../api/axios";

const steps = ["Items", "Customer", "Payment"];

const orderTabs = [
  { label: "Sale", value: "sale" },
  { label: "Rental", value: "rental" },
  { label: "Both", value: "both" },
];

const CreateOrderModal = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [orderType, setOrderType] = useState("sale");
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    });

    // step 3 
    const [paymentMode, setPaymentMode] = useState("cash");
    const [paymentOption, setPaymentOption] = useState("full");
    const [paidAmount, setPaidAmount] = useState("");
    const [deliveryCharge, setDeliveryCharge] = useState("");
    const [securityDeposit, setSecurityDeposit] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [notes, setNotes] = useState("");
    const [rentalDetails, setRentalDetails] = useState({
    rentalStartDate: "",
    rentalEndDate: "",
    rentalPeriodType: "day",
    rentalPeriodValue: "",
    lateChargePerDay: "",
    });
    const [submitting, setSubmitting] = useState(false);

  const fetchModalData = async () => {
    try {
        const [productRes, customerRes] = await Promise.all([
        API.get("/products"),
        API.get("/customers"),
        ]);

        setProducts(productRes.data.products || []);
        setCustomers(customerRes.data.customers || []);
    } catch (error) {
        setMessage(error.response?.data?.message || "Failed to load data");
    }
  };

  useEffect(() => {
    if (open) {
      fetchModalData();
    }
  }, [open]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (orderType === "sale") {
        return product.category === "building_material";
      }

      if (orderType === "rental") {
        return product.category === "timber" || product.category === "other";
      }

      return true;
    });
  }, [products, orderType, search]);

  const getSelectedItem = (productId) => {
    return selectedItems.find((item) => item.productId === productId);
  };

 const getDefaultSaleUnit = (product) => {
  if (product.saleUnits && product.saleUnits.length > 0) {
    return product.saleUnits[0];
  }

  return {
    unit: product.unit,
    conversionToBase: 1,
    pricePerUnit: product.pricePerUnit,
  };
};

const addProduct = (product) => {
  const existing = getSelectedItem(product._id);

  if (existing) {
    updateQuantity(product._id, existing.quantity + 1);
    return;
  }

  const defaultSaleUnit = getDefaultSaleUnit(product);

  setSelectedItems([
    ...selectedItems,
    {
      productId: product._id,
      name: product.name,
      category: product.category,
      subCategory: product.subCategory,
      baseUnit: product.baseUnit || product.unit,
      selectedUnit: defaultSaleUnit.unit,
      conversionToBase: Number(defaultSaleUnit.conversionToBase || 1),
      unit: defaultSaleUnit.unit,
      pricePerUnit: Number(defaultSaleUnit.pricePerUnit || product.pricePerUnit),
      currentStock: product.currentStock || 0,
      quickQuantities: product.quickQuantities || [],
      saleUnits: product.saleUnits || [],
      quantity: 1,
    },
  ]);
};

  const updateQuantity = (productId, quantity) => {
    const finalQuantity = Number(quantity);

    if (finalQuantity <= 0) {
      setSelectedItems(
        selectedItems.filter((item) => item.productId !== productId)
      );
      return;
    }

    setSelectedItems(
      selectedItems.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity:
                finalQuantity > item.currentStock
                  ? item.currentStock
                  : finalQuantity,
            }
          : item
      )
    );
  };

  const updateSelectedUnit = (productId, unit) => {
  setSelectedItems(
    selectedItems.map((item) => {
      if (item.productId !== productId) return item;

      const selectedSaleUnit = item.saleUnits.find((u) => u.unit === unit);

      if (!selectedSaleUnit) return item;

      return {
        ...item,
        selectedUnit: selectedSaleUnit.unit,
        unit: selectedSaleUnit.unit,
        conversionToBase: Number(selectedSaleUnit.conversionToBase || 1),
        pricePerUnit: Number(selectedSaleUnit.pricePerUnit || 0),
      };
    })
  );
};

  const removeItem = (productId) => {
    setSelectedItems(selectedItems.filter((item) => item.productId !== productId));
  };

  const itemsTotal = selectedItems.reduce((sum, item) => {
    return sum + Number(item.quantity || 0) * Number(item.pricePerUnit || 0);
  }, 0);

  const handleNewCustomerChange = (e) => {
  setNewCustomer({
    ...newCustomer,
    [e.target.name]: e.target.value,
  });
};

const canGoToPayment =
  customerMode === "existing"
    ? !!selectedCustomerId
    : !!newCustomer.name && !!newCustomer.phone;

    const deliveryChargeAmount = Number(deliveryCharge || 0);
const grandTotal = itemsTotal + deliveryChargeAmount;

const finalPaidAmount =
  paymentOption === "full"
    ? grandTotal
    : paymentOption === "later"
    ? 0
    : Number(paidAmount || 0);

const dueAmount = Math.max(grandTotal - finalPaidAmount, 0);

const isRentalOrder = orderType === "rental" || orderType === "both";

const handleRentalDetailsChange = (e) => {
  setRentalDetails({
    ...rentalDetails,
    [e.target.name]: e.target.value,
  });
};

const createCustomerIfNeeded = async () => {
  if (customerMode === "existing") {
    return selectedCustomerId;
  }

  const res = await API.post("/customers", {
    name: newCustomer.name,
    phone: newCustomer.phone,
    address: newCustomer.address,
    openingDue: 0,
  });

  return res.data.customer._id;
};

const handleCreateOrder = async () => {
  try {
    setSubmitting(true);
    setMessage("");

    if (isRentalOrder) {
      if (!rentalDetails.rentalStartDate || !rentalDetails.rentalEndDate) {
        setMessage("Rental start date and expected return date are required");
        return;
      }
    }

    const customerId = await createCustomerIfNeeded();

    const payload = {
      orderType: isRentalOrder ? "rental" : "sale",
      customerId,
      paidAmount: finalPaidAmount,
      deliveryAddress,
      deliveryCharge: deliveryChargeAmount,
      notes,
     items: selectedItems.map((item) => ({
        productId: item.productId,
        selectedUnit: item.selectedUnit,
        quantity: Number(item.quantity),
        pricePerUnit: Number(item.pricePerUnit),
        conversionToBase: Number(item.conversionToBase || 1),
        })),
    };

    if (isRentalOrder) {
      payload.rentalStartDate = rentalDetails.rentalStartDate;
      payload.rentalEndDate = rentalDetails.rentalEndDate;
      payload.rentalPeriodType = rentalDetails.rentalPeriodType;
      payload.rentalPeriodValue = Number(rentalDetails.rentalPeriodValue || 0);
      payload.lateChargePerDay = Number(rentalDetails.lateChargePerDay || 0);

      // Security deposit is frontend note for now.
      // Backend field can be added later.
      if (Number(securityDeposit || 0) > 0) {
        payload.notes = `${notes || ""}\nSecurity Deposit: ₹${securityDeposit}`.trim();
      }
    }

    await API.post("/orders", payload);

    handleClose();
    window.location.reload();
  } catch (error) {
    setMessage(error.response?.data?.message || "Order creation failed");
  } finally {
    setSubmitting(false);
  }
};

  const handleClose = () => {
    setActiveStep(0);
    setOrderType("sale");
    setSelectedItems([]);
    setCustomerMode("existing");
    setSelectedCustomerId("");
    setNewCustomer({
    name: "",
    phone: "",
    address: "",
    });
    setPaymentMode("cash");
setPaymentOption("full");
setPaidAmount("");
setDeliveryCharge("");
setSecurityDeposit("");
setDeliveryAddress("");
setNotes("");
setRentalDetails({
  rentalStartDate: "",
  rentalEndDate: "",
  rentalPeriodType: "day",
  rentalPeriodValue: "",
  lateChargePerDay: "",
});
setSubmitting(false);
    setSearch("");
    setMessage("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 ">
      <div className="max-h-[98vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Create New Order
            </h2>
            <p className="text-sm text-slate-500">
              Sale, rental, or mixed order
            </p>
          </div>

          <button
            onClick={handleClose}
            className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          >
            <X size={22} />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-4">
          <div className="grid grid-cols-3 gap-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`rounded-xl px-4 py-3 text-center text-sm font-bold ${
                  index === activeStep
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                Step {index + 1}: {step}
              </div>
            ))}
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {message && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </div>
          )}

          {activeStep === 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
              <section>
                <div className="mb-5 grid grid-cols-3 gap-3">
                  {orderTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setOrderType(tab.value);
                        setSelectedItems([]);
                      }}
                      className={`rounded-xl border px-4 py-3 font-bold ${
                        orderType === tab.value
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product..."
                  className="mb-5 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredProducts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 md:col-span-2">
                      No products found.
                    </div>
                  ) : (
                    filteredProducts.map((product) => {
                      const selected = getSelectedItem(product._id);
                      const isOutOfStock = (product.currentStock || 0) <= 0;

                      return (
                        <div
                          key={product._id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-bold text-slate-900">
                                {product.name}
                              </h3>
                              <p className="mt-1 text-sm capitalize text-slate-500">
                                {product.subCategory || product.category} /{" "}
                                {product.unit}
                              </p>
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                isOutOfStock
                                  ? "bg-red-50 text-red-700"
                                  : "bg-green-50 text-green-700"
                              }`}
                            >
                              Stock: {product.currentStock || 0}
                            </span>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <p className="text-lg font-bold text-slate-900">
                              ₹{product.pricePerUnit}
                              <span className="text-sm font-medium text-slate-500">
                                /{product.unit}
                              </span>
                            </p>

                            {!selected ? (
                              <button
                                disabled={isOutOfStock}
                                onClick={() => addProduct(product)}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
                              >
                                Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      product._id,
                                      selected.quantity - 1
                                    )
                                  }
                                  className="rounded-lg bg-slate-100 p-2 text-slate-700"
                                >
                                  <Minus size={15} />
                                </button>

                                <input
                                  type="number"
                                  value={selected.quantity}
                                  onChange={(e) =>
                                    updateQuantity(product._id, e.target.value)
                                  }
                                  className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-center"
                                />

                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      product._id,
                                      selected.quantity + 1
                                    )
                                  }
                                  className="rounded-lg bg-slate-100 p-2 text-slate-700"
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-bold text-slate-900">
                  Selected Items
                </h3>

                <div className="mt-4 space-y-3">
                  {selectedItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                      No items selected.
                    </div>
                  ) : (
                    selectedItems.map((item) => (
                      <div
                        key={item.productId}
                        className="rounded-xl bg-white p-4 shadow-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {item.name}
                            </h4>
                            <p className="text-sm text-slate-500">
                              {item.quantity} {item.unit} × ₹
                              {item.pricePerUnit}
                            </p>
                          </div>

                          <button
                            onClick={() => removeItem(item.productId)}
                            className="text-red-600"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <p className="mt-2 text-right font-bold text-slate-900">
                          ₹{item.quantity * item.pricePerUnit}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 rounded-xl bg-slate-900 p-4 text-white">
                  <div className="flex justify-between">
                    <span>Items Total</span>
                    <span className="font-bold">₹{itemsTotal}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}
          {activeStep === 1 && (
  <div className="mx-auto max-w-3xl">
    <div className="mb-6 grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => setCustomerMode("existing")}
        className={`rounded-xl border px-4 py-3 font-bold ${
          customerMode === "existing"
            ? "border-blue-600 bg-blue-600 text-white"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        Existing Customer
      </button>

      <button
        type="button"
        onClick={() => setCustomerMode("new")}
        className={`rounded-xl border px-4 py-3 font-bold ${
          customerMode === "new"
            ? "border-green-600 bg-green-600 text-white"
            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
        }`}
      >
        New Customer
      </button>
    </div>

    {customerMode === "existing" ? (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Select Customer
        </label>

        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        >
          <option value="">Choose customer</option>
          {customers.map((customer) => (
            <option key={customer._id} value={customer._id}>
              {customer.name} - {customer.phone}
            </option>
          ))}
        </select>

        {selectedCustomerId && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            {(() => {
              const customer = customers.find(
                (item) => item._id === selectedCustomerId
              );

              return (
                <>
                  <p className="font-bold text-slate-900">{customer?.name}</p>
                  <p className="text-sm text-slate-500">{customer?.phone}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {customer?.address || "-"}
                  </p>
                </>
              );
            })()}
          </div>
        )}
      </div>
    ) : (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Customer Name
            </label>
            <input
              name="name"
              value={newCustomer.name}
              onChange={handleNewCustomerChange}
              placeholder="Enter customer name"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Mobile Number
            </label>
            <input
              name="phone"
              value={newCustomer.phone}
              onChange={handleNewCustomerChange}
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
              value={newCustomer.address}
              onChange={handleNewCustomerChange}
              rows="3"
              placeholder="Customer address"
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
            />
          </div>
        </div>
      </div>
    )}
  </div>
)}
{activeStep === 2 && (
  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
    <section className="space-y-5">
      {isRentalOrder && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <h3 className="mb-4 font-bold text-orange-800">Rental Details</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Rental Start Date
              </label>
              <input
                name="rentalStartDate"
                type="date"
                value={rentalDetails.rentalStartDate}
                onChange={handleRentalDetailsChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Expected Return Date
              </label>
              <input
                name="rentalEndDate"
                type="date"
                value={rentalDetails.rentalEndDate}
                onChange={handleRentalDetailsChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Rental Type
              </label>
              <select
                name="rentalPeriodType"
                value={rentalDetails.rentalPeriodType}
                onChange={handleRentalDetailsChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Duration
              </label>
              <input
                name="rentalPeriodValue"
                type="number"
                value={rentalDetails.rentalPeriodValue}
                onChange={handleRentalDetailsChange}
                placeholder="10"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Late Charge / Day
              </label>
              <input
                name="lateChargePerDay"
                type="number"
                value={rentalDetails.lateChargePerDay}
                onChange={handleRentalDetailsChange}
                placeholder="50"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Security Deposit
              </label>
              <input
                type="number"
                value={securityDeposit}
                onChange={(e) => setSecurityDeposit(e.target.value)}
                placeholder="2000"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-orange-600 focus:ring-4 focus:ring-orange-100"
              />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="mb-4 font-bold text-slate-900">Payment Details</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Payment Option
            </label>
            <select
              value={paymentOption}
              onChange={(e) => {
                setPaymentOption(e.target.value);
                setPaidAmount("");
              }}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              <option value="full">Full Payment</option>
              <option value="partial">Partial Payment</option>
              <option value="later">Pay Later</option>
            </select>
          </div>

          {paymentOption === "partial" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Paid Amount
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="1000"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Delivery Charge
            </label>
            <input
              type="number"
              value={deliveryCharge}
              onChange={(e) => setDeliveryCharge(e.target.value)}
              placeholder="300"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Delivery Address
          </label>
          <textarea
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            rows="2"
            placeholder="Delivery address"
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows="2"
            placeholder="Optional notes"
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>
    </section>

    <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-lg font-bold text-slate-900">Order Summary</h3>

      <div className="mt-4 space-y-3">
        {selectedItems.map((item) => (
          <div key={item.productId} className="rounded-xl bg-white p-3">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-semibold text-slate-900">{item.name}</span>
              <span className="font-bold text-slate-900">
                ₹{item.quantity * item.pricePerUnit}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {item.quantity} {item.selectedUnit} × ₹{item.pricePerUnit}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl bg-slate-900 p-4 text-white">
        <div className="flex justify-between text-sm">
          <span>Items Total</span>
          <span className="font-bold">₹{itemsTotal}</span>
        </div>

        <div className="mt-2 flex justify-between text-sm">
          <span>Delivery Charge</span>
          <span className="font-bold">₹{deliveryChargeAmount}</span>
        </div>

        {isRentalOrder && (
          <div className="mt-2 flex justify-between text-sm">
            <span>Security Deposit</span>
            <span className="font-bold text-orange-300">
              ₹{securityDeposit || 0}
            </span>
          </div>
        )}

        <div className="mt-3 border-t border-slate-700 pt-3">
          <div className="flex justify-between text-lg">
            <span>Grand Total</span>
            <span className="font-bold">₹{grandTotal}</span>
          </div>

          <div className="mt-2 flex justify-between text-sm">
            <span>Paid</span>
            <span className="font-bold text-green-300">
              ₹{finalPaidAmount}
            </span>
          </div>

          <div className="mt-2 flex justify-between text-sm">
            <span>Due</span>
            <span className="font-bold text-red-300">₹{dueAmount}</span>
          </div>
        </div>
      </div>
    </aside>
  </div>
)}
        </div>

        <div className="flex justify-between gap-3 border-t border-slate-200 px-6 py-4">
  <button
    onClick={() => {
      if (activeStep === 0) {
        handleClose();
      } else {
        setActiveStep(activeStep - 1);
      }
    }}
    className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-200"
  >
    {activeStep === 0 ? "Cancel" : "Back"}
  </button>

  {activeStep === 0 && (
    <button
      disabled={selectedItems.length === 0}
      onClick={() => setActiveStep(1)}
      className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
    >
      Next: Customer
    </button>
  )}

  {activeStep === 1 && (
    <button
      disabled={!canGoToPayment}
      onClick={() => setActiveStep(2)}
      className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
    >
      Next: Payment
    </button>
  )}

  {activeStep === 2 && (
  <button
    onClick={handleCreateOrder}
    disabled={submitting}
    className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:bg-slate-300"
  >
    {submitting ? "Creating..." : "Create Order"}
  </button>
)}
</div>
      </div>
    </div>
  );
};

export default CreateOrderModal;