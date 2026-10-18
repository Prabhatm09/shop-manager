import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, X } from "lucide-react";
import API from "../api/axios";
import LoadingState from "./LoadingState";
import { AmountDisplay, StatusBadge } from "./pos";

const steps = ["Items", "Customer", "Payment"];

const orderTabs = [
  { label: "Sale", value: "sale" },
  { label: "Rental", value: "rental" },
  { label: "Both", value: "both" },
];

const getSaleUnitOptions = (product) => {
  if (product.saleUnits?.length) {
    return product.saleUnits.map((unit) => ({
      unit: unit.unit,
      conversionToBase: Number(unit.conversionToBase || 1),
      pricePerUnit: Number(unit.pricePerUnit || product.pricePerUnit || 0),
    }));
  }

  const price = Number(product.pricePerUnit || 0);
  const subCategory = product.subCategory?.toLowerCase();

  if (subCategory === "brick") {
    return [
      {
        unit: "piece",
        conversionToBase: 1,
        pricePerUnit: price,
      },
    ];
  }

  if (subCategory === "maurang") {
    return [
      {
        unit: "feet",
        conversionToBase: 1,
        pricePerUnit: price,
      },
      {
        unit: "bag",
        conversionToBase: 1.5,
        pricePerUnit: 120,
      },
    ];
  }

  if (subCategory === "balu") {
    return [
      {
        unit: "feet",
        conversionToBase: 1,
        pricePerUnit: price,
      },
      {
        unit: "bag",
        conversionToBase: 1.5,
        pricePerUnit: 60,
      },
    ];
  }

  if (subCategory === "gitti") {
    return [
      {
        unit: "feet",
        conversionToBase: 1,
        pricePerUnit: price,
      },
      {
        unit: "bag",
        conversionToBase: 1.5,
        pricePerUnit: 120,
      },
    ];
  }

  if (subCategory === "cement") {
    return [
      {
        unit: "bag",
        conversionToBase: 1,
        pricePerUnit: 410,
      },
      {
        unit: "kg",
        conversionToBase: 1 / 50,
        pricePerUnit: 12,
      },
    ];
  }

  return [
    {
      unit: product.unit || "piece",
      conversionToBase: 1,
      pricePerUnit: price,
    },
  ];
};

const getStockBaseUnit = (product) => {
  const subCategory = product.subCategory?.toLowerCase();

  if (subCategory === "brick") return "piece";
  if (["balu", "maurang", "gitti"].includes(subCategory)) return "feet";
  if (subCategory === "cement") return "bag";

  return product.unit || "unit";
};

const toNumber = (value) => Number(value);
const isValidNumber = (value) => Number.isFinite(toNumber(value));
const safeNumber = (value, fallback = 0) =>
  isValidNumber(value) ? toNumber(value) : fallback;
const formatMoney = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;
const getPhoneDigits = (phone) => String(phone || "").replace(/\D/g, "");

const CreateOrderModal = ({ open, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [orderType, setOrderType] = useState("sale");
  const [products, setProducts] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [manualOutsource, setManualOutsource] = useState({
    productName: "",
    quantity: "",
    unit: "",
    pricePerUnit: "",
  });
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [dataLoading, setDataLoading] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState("existing");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [customerBalance, setCustomerBalance] = useState({
    loading: false,
    previousDue: 0,
    previousAdvance: 0,
  });

  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentOption, setPaymentOption] = useState("later");
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
      setDataLoading(true);
      const [productRes, customerRes] = await Promise.all([
        API.get("/products"),
        API.get("/customers"),
      ]);

      setProducts(productRes.data.products || []);
      setCustomers(customerRes.data.customers || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load data");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchModalData();
  }, [open]);

  useEffect(() => {
    let ignore = false;

    const fetchCustomerBalance = async () => {
      if (!selectedCustomerId || customerMode !== "existing") {
        setCustomerBalance({
          loading: false,
          previousDue: 0,
          previousAdvance: 0,
        });
        return;
      }

      try {
        setCustomerBalance((balance) => ({
          ...balance,
          loading: true,
        }));

        const res = await API.get(`/customers/${selectedCustomerId}`);

        if (ignore) return;

        setCustomerBalance({
          loading: false,
          previousDue: Number(res.data.summary?.totalDue || 0),
          previousAdvance: Number(res.data.summary?.totalAdvance || 0),
        });
      } catch {
        if (ignore) return;

        setCustomerBalance({
          loading: false,
          previousDue: 0,
          previousAdvance: 0,
        });
      }
    };

    fetchCustomerBalance();

    return () => {
      ignore = true;
    };
  }, [selectedCustomerId, customerMode]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        ?.toLowerCase()
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

  const filteredCustomers = useMemo(() => {
    const keyword = customerSearch.toLowerCase();

    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(keyword) ||
        customer.phone?.toLowerCase().includes(keyword) ||
        customer.address?.toLowerCase().includes(keyword)
    );
  }, [customers, customerSearch]);

  const getSelectedItem = (productId) => {
    return selectedItems.find((item) => item.productId === productId);
  };

  const addProduct = (product) => {
    const existing = getSelectedItem(product._id);

    if (existing) {
      updateQuantity(product._id, existing.quantity + 1);
      return;
    }

    const saleUnits = getSaleUnitOptions(product);
    const defaultUnit = saleUnits[0];

    setSelectedItems([
      ...selectedItems,
      {
        productId: product._id,
        name: product.name,
        subCategory: product.subCategory,
        category: product.category,
        stockBaseUnit: getStockBaseUnit(product),
        selectedUnit: defaultUnit.unit,
        conversionToBase: Number(defaultUnit.conversionToBase || 1),
        pricePerUnit: Number(defaultUnit.pricePerUnit || product.pricePerUnit || 0),
        currentStock: Number(product.currentStock || 0),
        quantity: 1,
        source: "shop_stock",
        quickQuantities:
          product.subCategory?.toLowerCase() === "brick" ? [10, 50, 100] : [],
        saleUnits,
      },
    ]);
  };

  const updateQuantity = (productId, quantity, removeWhenZero = false) => {
    if (quantity === "") {
      setSelectedItems(
        selectedItems.map((item) =>
          item.productId === productId ? { ...item, quantity: "" } : item
        )
      );
      return;
    }

    const finalQuantity = Number(quantity);

    if (!Number.isFinite(finalQuantity)) {
      return;
    }

    if (finalQuantity <= 0) {
      if (removeWhenZero) {
        setSelectedItems(
          selectedItems.filter((item) => item.productId !== productId)
        );
      }
      return;
    }

    setSelectedItems(
      selectedItems.map((item) => {
        if (item.productId !== productId) return item;

        const stockDeduct =
          finalQuantity * Number(item.conversionToBase || 1);

        if (item.source !== "outsourced" && stockDeduct > item.currentStock) {
          return item;
        }

        return {
          ...item,
          quantity: finalQuantity,
        };
      })
    );
  };

 const updateSelectedUnit = (productId, unit) => {
  setSelectedItems(
    selectedItems.map((item) => {
      if (item.productId !== productId) return item;

      const selectedUnit = item.saleUnits.find((u) => u.unit === unit);
      if (!selectedUnit) return item;

      return {
        ...item,
        selectedUnit: selectedUnit.unit,
        conversionToBase: Number(selectedUnit.conversionToBase || 1),
        pricePerUnit: Number(selectedUnit.pricePerUnit || 0),
        quantity: 1,
      };
    })
  );
};

 const updatePrice = (productId, price) => {
  setSelectedItems(
    selectedItems.map((item) => {
      if (item.productId !== productId) return item;

      return {
        ...item,
        pricePerUnit: price,
      };
    })
  );
};

 const updateItemSource = (productId, source) => {
  setSelectedItems(
    selectedItems.map((item) => {
      if (item.productId !== productId) return item;

      return {
        ...item,
        source,
      };
    })
  );
};

  const removeItem = (productId) => {
    setSelectedItems(
      selectedItems.filter((item) => item.productId !== productId)
    );
  };

  const addManualOutsourceItem = () => {
    const productName = manualOutsource.productName.trim();
    const quantity = Number(manualOutsource.quantity);
    const pricePerUnit = Number(manualOutsource.pricePerUnit);
    const unit = manualOutsource.unit.trim();

    if (!productName) {
      setMessage("Enter outsource material name");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage("Enter valid outsource quantity");
      return;
    }

    if (!unit) {
      setMessage("Enter outsource unit");
      return;
    }

    if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
      setMessage("Enter valid outsource sale rate");
      return;
    }

    setSelectedItems([
      ...selectedItems,
      {
        productId: `manual-${Date.now()}`,
        isManual: true,
        name: productName,
        selectedUnit: unit,
        unit,
        stockBaseUnit: unit,
        conversionToBase: 1,
        pricePerUnit,
        currentStock: 0,
        quantity,
        source: "outsourced",
        quickQuantities: [],
        saleUnits: [{ unit, conversionToBase: 1, pricePerUnit }],
      },
    ]);

    setManualOutsource({
      productName: "",
      quantity: "",
      unit: "",
      pricePerUnit: "",
    });
    setMessage("");
  };

  const itemsTotal = selectedItems.reduce((sum, item) => {
    return sum + safeNumber(item.quantity) * safeNumber(item.pricePerUnit);
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

  const deliveryChargeAmount = safeNumber(deliveryCharge);
  const grandTotal = itemsTotal + deliveryChargeAmount;
  const previousDue =
    customerMode === "existing" ? customerBalance.previousDue : 0;
  const previousAdvance =
    customerMode === "existing" ? customerBalance.previousAdvance : 0;

  const totalPayable = Math.max(grandTotal + previousDue - previousAdvance, 0);
  const finalPaidAmount =
    paymentOption === "full"
      ? totalPayable
      : paymentOption === "later"
      ? 0
      : safeNumber(paidAmount);

  const dueAmount = Math.max(grandTotal - finalPaidAmount, 0);
  const customerOutstanding = Math.max(
    previousDue + grandTotal - previousAdvance - finalPaidAmount,
    0
  );
  const customerAdvance = Math.max(finalPaidAmount - totalPayable, 0);
  const isRentalOrder = orderType === "rental" || orderType === "both";

  const getItemsValidationError = () => {
    if (selectedItems.length === 0) return "Please add at least one item";

    for (const item of selectedItems) {
      const quantity = toNumber(item.quantity);
      const pricePerUnit = toNumber(item.pricePerUnit);
      const conversionToBase = toNumber(item.conversionToBase || 1);

      if (!isValidNumber(item.quantity) || quantity <= 0) {
        return `Enter a valid quantity for ${item.name}`;
      }

      if (!isValidNumber(item.pricePerUnit) || pricePerUnit <= 0) {
        return `Enter a valid rate for ${item.name}`;
      }

      if (!isValidNumber(item.conversionToBase) || conversionToBase <= 0) {
        return `Invalid unit conversion for ${item.name}`;
      }

      if (
        item.source !== "outsourced" &&
        quantity * conversionToBase > Number(item.currentStock || 0)
      ) {
        return `${item.name} stock not enough`;
      }

    }

    if (!Number.isFinite(itemsTotal) || itemsTotal <= 0) {
      return "Order total is not valid";
    }

    return "";
  };

  const getCustomerValidationError = () => {
    if (customerMode === "existing") {
      return selectedCustomerId ? "" : "Please select a customer";
    }

    const phoneDigits = getPhoneDigits(newCustomer.phone);

    if (!newCustomer.name.trim()) return "Customer name is required";
    if (phoneDigits.length !== 10) {
      return "Enter exactly 10 mobile digits";
    }

    return "";
  };

  const getPaymentValidationError = () => {
    if (!isValidNumber(deliveryChargeAmount) || deliveryChargeAmount < 0) {
      return "Labour charge cannot be negative";
    }

    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      return "Bill total is not valid";
    }

    if (!Number.isFinite(finalPaidAmount) || finalPaidAmount < 0) {
      return "Paid amount cannot be negative";
    }

    if (paymentOption === "partial") {
      if (!paidAmount || !isValidNumber(paidAmount) || Number(paidAmount) <= 0) {
        return "Enter a valid partial payment amount";
      }

    }

    if (isRentalOrder) {
      if (!rentalDetails.rentalStartDate || !rentalDetails.rentalEndDate) {
        return "Rental start date and expected return date are required";
      }

      if (
        new Date(rentalDetails.rentalEndDate) < new Date(rentalDetails.rentalStartDate)
      ) {
        return "Return date cannot be before rental start date";
      }

      if (
        rentalDetails.rentalPeriodValue &&
        (!isValidNumber(rentalDetails.rentalPeriodValue) ||
          Number(rentalDetails.rentalPeriodValue) < 0)
      ) {
        return "Rental duration cannot be negative";
      }

      if (
        rentalDetails.lateChargePerDay &&
        (!isValidNumber(rentalDetails.lateChargePerDay) ||
          Number(rentalDetails.lateChargePerDay) < 0)
      ) {
        return "Late charge cannot be negative";
      }

      if (
        securityDeposit &&
        (!isValidNumber(securityDeposit) || Number(securityDeposit) < 0)
      ) {
        return "Security deposit cannot be negative";
      }
    }

    return "";
  };

  const goToStep = (nextStep) => {
    setMessage("");

    if (activeStep === 0) {
      const error = getItemsValidationError();
      if (error) {
        setMessage(error);
        return;
      }
    }

    if (activeStep === 1) {
      const error = getCustomerValidationError();
      if (error) {
        setMessage(error);
        return;
      }
    }

    setActiveStep(nextStep);
  };

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
      phone: `+91 ${getPhoneDigits(newCustomer.phone)}`,
      address: newCustomer.address,
      openingDue: 0,
    });

    return res.data.customer._id;
  };

  const handleCreateOrder = async () => {
    try {
      setSubmitting(true);
      setMessage("");

      const validationError =
        getItemsValidationError() ||
        getCustomerValidationError() ||
        getPaymentValidationError();

      if (validationError) {
        setMessage(validationError);
        return;
      }

      const customerId = await createCustomerIfNeeded();

      const payload = {
        orderType: orderType === "both" ? "mixed" : isRentalOrder ? "rental" : "sale",
        customerId,
        paidAmount: finalPaidAmount,
        paymentMode,
        deliveryAddress,
        deliveryCharge: deliveryChargeAmount,
        notes,
        items: selectedItems.map((item) => ({
          productId: item.isManual ? undefined : item.productId,
          productName: item.name,
          selectedUnit: item.selectedUnit,
          quantity: Number(item.quantity),
          pricePerUnit: Number(item.pricePerUnit),
          conversionToBase: Number(item.conversionToBase || 1),
          source: item.source || "shop_stock",
          itemType:
            orderType === "both"
              ? item.source === "outsourced"
                ? "rental"
                : ["timber", "other"].includes(item.category)
                ? "rental"
                : "sale"
              : isRentalOrder
              ? "rental"
              : "sale",
        })),
      };

      if (isRentalOrder) {
        payload.rentalStartDate = rentalDetails.rentalStartDate;
        payload.rentalEndDate = rentalDetails.rentalEndDate;
        payload.rentalPeriodType = rentalDetails.rentalPeriodType;
        payload.rentalPeriodValue = Number(rentalDetails.rentalPeriodValue || 0);
        payload.lateChargePerDay = Number(rentalDetails.lateChargePerDay || 0);

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
    setManualOutsource({
      productName: "",
      quantity: "",
      unit: "",
      pricePerUnit: "",
    });
    setCustomerMode("existing");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setNewCustomer({
      name: "",
      phone: "",
      address: "",
    });
    setCustomerBalance({
      loading: false,
      previousDue: 0,
      previousAdvance: 0,
    });

    setPaymentMode("cash");
    setPaymentOption("later");
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
    <div className="fixed inset-0 z-50 bg-slate-100">
      <div className="flex h-full flex-col overflow-hidden bg-slate-100">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">
              POS Billing
            </p>
            <h2 className="text-xl font-black text-slate-950">
              New Order
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Add material, customer and payment without changing stock rules.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="btn-muted p-2"
          >
            <X size={22} />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className={`rounded-xl border px-3 py-3 text-center text-sm font-black ${
                  index === activeStep
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {index + 1}. {step}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-28 sm:p-6">
          {message && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {message}
            </div>
          )}

          {dataLoading ? (
            <LoadingState label="Loading products and customers..." />
          ) : activeStep === 0 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
              <section className="space-y-5">
                <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                  {orderTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setOrderType(tab.value);
                        setSelectedItems([]);
                      }}
                      className={`rounded-xl border px-3 py-3 font-bold ${
                        orderType === tab.value
                          ? "border-[color:var(--shop-primary)] bg-[color:var(--shop-primary)] text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search godown product..."
                    className="form-control py-3 pl-11 pr-4"
                  />
                </div>

                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Manual Outsource Item
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Use when material is not coming from godown stock.
                      </p>
                    </div>
                    <StatusBadge label="Outsource" tone="outsource" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <input
                      value={manualOutsource.productName}
                      onChange={(e) =>
                        setManualOutsource({
                          ...manualOutsource,
                          productName: e.target.value,
                        })
                      }
                      className="form-control px-3 py-2 text-sm lg:col-span-2"
                      placeholder="Example: Balu"
                    />
                    <input
                      value={manualOutsource.quantity}
                      onChange={(e) =>
                        setManualOutsource({
                          ...manualOutsource,
                          quantity: e.target.value,
                        })
                      }
                      type="number"
                      min="0.001"
                      step="0.001"
                      className="form-control px-3 py-2 text-sm"
                      placeholder="Example: 50"
                    />
                    <input
                      value={manualOutsource.unit}
                      onChange={(e) =>
                        setManualOutsource({
                          ...manualOutsource,
                          unit: e.target.value,
                        })
                      }
                      className="form-control px-3 py-2 text-sm"
                      placeholder="Example: feet"
                    />
                    <input
                      value={manualOutsource.pricePerUnit}
                      onChange={(e) =>
                        setManualOutsource({
                          ...manualOutsource,
                          pricePerUnit: e.target.value,
                        })
                      }
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="form-control px-3 py-2 text-sm"
                      placeholder="Example: 35"
                    />
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-black text-slate-700">
                      Amount:{" "}
                      {formatMoney(
                        safeNumber(manualOutsource.quantity) *
                          safeNumber(manualOutsource.pricePerUnit)
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={addManualOutsourceItem}
                      className="btn-primary text-sm"
                    >
                      <Plus size={16} />
                      Add Outsource Item
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredProducts.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 md:col-span-2">
                      No products found.
                    </div>
                  ) : (
                    filteredProducts.map((product) => {
                      const selected = getSelectedItem(product._id);
                      const isOutOfStock = (product.currentStock || 0) <= 0;
                      const defaultUnit = getSaleUnitOptions(product)[0];

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
                                {getStockBaseUnit(product)}
                              </p>
                            </div>

                            <StatusBadge
                              label={`Stock: ${product.currentStock || 0}`}
                              tone={isOutOfStock ? "out of stock" : "in stock"}
                            />
                          </div>

                          {!selected ? (
                            <div className="mt-4 flex items-center justify-between">
                              <p className="text-lg font-black text-slate-900">
                                <AmountDisplay amount={defaultUnit.pricePerUnit} />
                                <span className="text-sm font-medium text-slate-500">
                                  /{defaultUnit.unit}
                                </span>
                              </p>

                              <button
                                type="button"
                                onClick={() => addProduct(product)}
                                className="btn-primary text-sm"
                              >
                                Add
                              </button>
                            </div>
                          ) : (
                            <div className="mt-4 space-y-3">
                              <div>
                                <p className="mb-2 text-xs font-bold text-slate-500">
                                  Sell As
                                </p>

                                <div className="flex flex-wrap gap-2">
                                  {selected.saleUnits.map((unitOption) => (
                                    <button
                                      key={unitOption.unit}
                                      type="button"
                                      onClick={() =>
                                        updateSelectedUnit(
                                          product._id,
                                          unitOption.unit
                                        )
                                      }
                                      className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                        selected.selectedUnit === unitOption.unit
                                          ? "bg-[color:var(--shop-primary)] text-white"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {unitOption.unit}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {selected.quickQuantities?.length > 0 && (
                                <div>
                                  <p className="mb-2 text-xs font-bold text-slate-500">
                                    Quick Qty
                                  </p>

                                  <div className="flex flex-wrap gap-2">
                                    {selected.quickQuantities.map((qty) => (
                                      <button
                                        key={qty}
                                        type="button"
                                        onClick={() =>
                                          updateQuantity(product._id, qty)
                                        }
                                        className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 hover:bg-green-100"
                                      >
                                        {qty}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div>
                                <p className="mb-2 text-xs font-bold text-slate-500">
                                  Source
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { label: "Godown", value: "shop_stock" },
                                    { label: "Outsource", value: "outsourced" },
                                  ].map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() =>
                                        updateItemSource(product._id, option.value)
                                      }
                                      className={`rounded-lg px-3 py-2 text-xs font-bold ${
                                        (selected.source || "shop_stock") === option.value
                                          ? "bg-[color:var(--shop-primary)] text-white"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <label className="mb-1 block text-xs font-bold text-slate-500">
                                    Rate / {selected.selectedUnit}
                                  </label>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={selected.pricePerUnit}
                                    onChange={(e) =>
                                      updatePrice(product._id, e.target.value)
                                    }
                                    className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-black"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(
                                        product._id,
                                        safeNumber(selected.quantity) - 1,
                                        true
                                      )
                                    }
                                    className="btn-muted p-2"
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
                                    type="button"
                                    onClick={() =>
                                      updateQuantity(
                                        product._id,
                                        safeNumber(selected.quantity) + 1
                                      )
                                    }
                                    className="btn-muted p-2"
                                  >
                                    <Plus size={15} />
                                  </button>
                                </div>
                              </div>

                              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                                {(selected.source || "shop_stock") === "outsourced"
                                  ? "Godown stock: no deduction"
                                  : `Stock deduct: ${(
                                      Number(selected.quantity || 0) *
                                      Number(selected.conversionToBase || 1)
                                    ).toFixed(2)} ${selected.stockBaseUnit}`}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-4 xl:self-start">
                <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-black text-slate-950">
                  Selected Items
                </h3>
                <ShoppingCart size={20} className="text-amber-700" />
                </div>

                <div className="mt-4 space-y-3">
                  {selectedItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                      No items selected.
                    </div>
                  ) : (
                    selectedItems.map((item) => (
                      <div
                        key={item.productId}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-slate-900">
                              {item.name}
                            </h4>
                            <p className="text-sm text-slate-500">
                              {item.quantity} {item.selectedUnit} × ₹
                              {item.pricePerUnit}
                            </p>
                            <StatusBadge
                              label={item.source === "outsourced" ? "Outsource" : "Godown"}
                              tone={item.source === "outsourced" ? "outsource" : "godown"}
                              className="mt-2"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="text-red-600"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <p className="mt-2 text-right font-bold text-slate-900">
                          ₹{safeNumber(item.quantity) * safeNumber(item.pricePerUnit)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                  <div className="flex justify-between">
                    <span>Items Total</span>
                    <span className="font-bold">{formatMoney(itemsTotal)}</span>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {!dataLoading && activeStep === 1 && (
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCustomerMode("existing")}
                  className={`rounded-xl border px-3 py-3 font-bold ${
                    customerMode === "existing"
                      ? "border-[color:var(--shop-primary)] bg-[color:var(--shop-primary)] text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Existing Customer
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerMode("new")}
                  className={`rounded-xl border px-3 py-3 font-bold ${
                    customerMode === "new"
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  New Customer
                </button>
              </div>

              {customerMode === "existing" ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Search Customer
                  </label>
                  <div className="relative mb-3">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search by name, phone or address"
                      className="form-control py-3 pl-11 pr-4"
                    />
                  </div>

                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="form-control px-4 py-3"
                  >
                    <option value="">Choose customer</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} - {customer.phone}
                      </option>
                    ))}
                  </select>

                  {selectedCustomerId && (
                    <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-xs font-bold uppercase text-orange-700">
                        Previous Balance
                      </p>
                      <p className="mt-1 text-2xl font-black text-orange-900">
                        {customerBalance.loading
                          ? "Checking..."
                          : previousDue > 0
                          ? `Due ₹${previousDue}`
                          : previousAdvance > 0
                          ? `Advance ₹${previousAdvance}`
                          : "₹0"}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="space-y-4">
                    <input
                      name="name"
                      value={newCustomer.name}
                      onChange={handleNewCustomerChange}
                      placeholder="Customer name"
                      className="form-control px-4 py-3"
                    />

                    <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-100">
                      <span className="flex min-h-12 items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-600">+91</span>
                      <input
                        name="phone"
                        value={getPhoneDigits(newCustomer.phone)}
                        onChange={(event) =>
                          handleNewCustomerChange({
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

                    <textarea
                      name="address"
                      value={newCustomer.address}
                      onChange={handleNewCustomerChange}
                      rows="3"
                      placeholder="Customer address (optional)"
                      className="form-control resize-none px-4 py-3"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {!dataLoading && activeStep === 2 && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
              <section className="space-y-5">
                {isRentalOrder && (
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5">
                    <h3 className="mb-4 font-bold text-orange-800">
                      Rental Details
                    </h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <input
                        name="rentalStartDate"
                        type="date"
                        value={rentalDetails.rentalStartDate}
                        onChange={handleRentalDetailsChange}
                        className="form-control px-4 py-3"
                      />

                      <input
                        name="rentalEndDate"
                        type="date"
                        value={rentalDetails.rentalEndDate}
                        onChange={handleRentalDetailsChange}
                        className="form-control px-4 py-3"
                      />

                      <select
                        name="rentalPeriodType"
                        value={rentalDetails.rentalPeriodType}
                        onChange={handleRentalDetailsChange}
                        className="form-control px-4 py-3"
                      >
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                      </select>

                      <input
                        name="rentalPeriodValue"
                        type="number"
                        value={rentalDetails.rentalPeriodValue}
                        onChange={handleRentalDetailsChange}
                        placeholder="Duration"
                        className="form-control px-4 py-3"
                      />

                      <input
                        name="lateChargePerDay"
                        type="number"
                        value={rentalDetails.lateChargePerDay}
                        onChange={handleRentalDetailsChange}
                        placeholder="Late charge / day"
                        className="form-control px-4 py-3"
                      />

                      <input
                        type="number"
                        value={securityDeposit}
                        onChange={(e) => setSecurityDeposit(e.target.value)}
                        placeholder="Security deposit"
                        className="form-control px-4 py-3"
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-black text-slate-950">
                    Payment Details
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <select
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      className="form-control px-4 py-3"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                    </select>

                    <select
                      value={paymentOption}
                      onChange={(e) => {
                        setPaymentOption(e.target.value);
                        setPaidAmount("");
                      }}
                      className="form-control px-4 py-3"
                    >
                      <option value="later">Pay Later</option>
                      <option value="partial">Custom Payment</option>
                      <option value="full">Full Payment</option>
                    </select>

                    {paymentOption === "partial" && (
                      <input
                        type="number"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        placeholder="Paid amount"
                        className="form-control px-4 py-3"
                      />
                    )}

                    <input
                      type="number"
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(e.target.value)}
                      placeholder="Labour charge"
                      className="form-control px-4 py-3"
                    />
                  </div>

                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    rows="2"
                    placeholder="Delivery address"
                    className="mt-4 form-control resize-none px-4 py-3"
                  />

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="2"
                    placeholder="Notes"
                    className="mt-4 form-control resize-none px-4 py-3"
                  />
                </div>
              </section>

              <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-4 xl:self-start">
                <h3 className="text-lg font-black text-slate-950">
                  Order Summary
                </h3>

                <div className="mt-4 space-y-3">
                  {selectedItems.map((item) => (
                    <div key={item.productId} className="rounded-xl bg-slate-50 p-3">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-semibold text-slate-900">
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-900">
                          ₹{safeNumber(item.quantity) * safeNumber(item.pricePerUnit)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.quantity} {item.selectedUnit} × ₹
                        {item.pricePerUnit}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                  <div className="flex justify-between text-sm">
                    <span>Items Total</span>
                    <span className="font-bold">₹{itemsTotal}</span>
                  </div>

                  <div className="mt-2 flex justify-between text-sm">
                    <span>Labour Charge</span>
                    <span className="font-bold">₹{deliveryChargeAmount}</span>
                  </div>

                  <div className="mt-3 border-t border-slate-700 pt-3">
                    <div className="flex justify-between text-lg">
                      <span>This Bill</span>
                      <span className="font-bold">₹{grandTotal}</span>
                    </div>

                    {(previousDue > 0 || previousAdvance > 0) && (
                      <>
                        <div className="mt-2 flex justify-between text-sm">
                          <span>Previous Due</span>
                          <span className="font-bold text-orange-300">
                            ₹{previousDue}
                          </span>
                        </div>

                        {previousAdvance > 0 && (
                          <div className="mt-2 flex justify-between text-sm">
                            <span>Previous Advance</span>
                            <span className="font-bold text-green-300">
                              ₹{previousAdvance}
                            </span>
                          </div>
                        )}

                        <div className="mt-2 flex justify-between text-sm">
                          <span>Total Bill</span>
                          <span className="font-bold text-amber-300">
                            ₹{totalPayable}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="mt-2 flex justify-between text-sm">
                      <span>Paid Now</span>
                      <span className="font-bold text-green-300">
                        ₹{finalPaidAmount}
                      </span>
                    </div>

                    <div className="mt-3 border-t border-slate-700 pt-3">
                      {customerAdvance > 0 ? (
                        <div className="flex justify-between text-base">
                          <span>Customer Advance</span>
                          <span className="font-black text-green-300">
                            ₹{customerAdvance}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between text-base">
                          <span>Remaining</span>
                          <span className="font-black text-red-300">
                            ₹{previousDue > 0 || previousAdvance > 0 ? customerOutstanding : dueAmount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>

        <div className="thumb-footer flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
          <div className="hidden text-sm font-bold text-slate-600 sm:block">
            Total: <span className="text-lg text-slate-950">{formatMoney(totalPayable || grandTotal || itemsTotal)}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeStep === 0) {
                handleClose();
              } else {
                setActiveStep(activeStep - 1);
              }
            }}
            className="btn-muted"
          >
            {activeStep === 0 ? "Cancel" : "Back"}
          </button>

          {activeStep === 0 && (
            <button
              type="button"
              disabled={dataLoading || selectedItems.length === 0}
              onClick={() => goToStep(1)}
              className="btn-primary"
            >
              Next: Customer
            </button>
          )}

          {activeStep === 1 && (
            <button
              type="button"
              disabled={dataLoading || !canGoToPayment}
              onClick={() => goToStep(2)}
              className="btn-primary"
            >
              Next: Payment
            </button>
          )}

          {activeStep === 2 && (
            <button
              type="button"
              onClick={handleCreateOrder}
              disabled={dataLoading || submitting}
              className="btn-success"
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
