import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FilePlus2, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import { AmountDisplay, SectionPanel } from "../components/pos";

const emptyLine = () => ({
  id: `${Date.now()}-${Math.random()}`,
  itemType: "sale",
  name: "",
  quantity: "",
  unit: "",
  rate: "",
});

const initialCustomer = { name: "", phone: "", address: "" };
const commonUnits = ["pc", "piece", "bag", "bg", "kg", "feet", "thela", "sandeli", "leader"];

const numberValue = (value) => Number(value || 0);
const getTodayDate = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};

const SimpleBilling = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [newCustomer, setNewCustomer] = useState(initialCustomer);
  const [lines, setLines] = useState([emptyLine()]);
  const [orderType, setOrderType] = useState("sale");
  const [rentalDetails, setRentalDetails] = useState({
    startDate: getTodayDate(),
    endDate: "",
    lateChargePerDay: "",
  });
  const [paymentOption, setPaymentOption] = useState("later");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [partialAmount, setPartialAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/customers");
      setCustomers(response.data.customers || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const keyword = customerSearch.trim().toLowerCase();
    if (!keyword) return customers;

    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(keyword) ||
        customer.phone?.toLowerCase().includes(keyword)
    );
  }, [customers, customerSearch]);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + numberValue(line.quantity) * numberValue(line.rate),
        0
      ),
    [lines]
  );

  const paidAmount =
    paymentOption === "full"
      ? total
      : paymentOption === "partial"
      ? numberValue(partialAmount)
      : 0;
  const dueAmount = Math.max(total - paidAmount, 0);

  const updateLine = (id, field, value) => {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, [field]: value } : line))
    );
  };

  const updateLineType = (id, itemType) => {
    setLines((current) =>
      current.map((line) =>
        line.id === id
          ? {
              ...line,
              itemType,
            }
          : line
      )
    );
  };


  const setBillType = (nextType) => {
    setOrderType(nextType);
    if (nextType === "sale") {
      setLines((current) => current.map((line) => ({ ...line, itemType: "sale" })));
    }
    if (nextType === "rental") {
      setLines((current) =>
        current.map((line) => ({
          ...line,
          itemType: "rental",
        }))
      );
    }
  };

  const removeLine = (id) => {
    setLines((current) => {
      const remaining = current.filter((line) => line.id !== id);
      return remaining.length ? remaining : [emptyLine()];
    });
  };

  const validate = () => {
    if (!lines.length) return "Add at least one item";

    for (const line of lines) {
      if (!line.name.trim()) return "Enter an item name for every line";
      if (numberValue(line.quantity) <= 0) {
        return `Enter a valid quantity for ${line.name || "the item"}`;
      }
      if (!line.unit.trim()) return `Enter a unit for ${line.name}`;
      if (numberValue(line.rate) <= 0) {
        return `Enter a valid rate for ${line.name}`;
      }
      const lineType = orderType === "rental" ? "rental" : line.itemType || "sale";
      if (orderType === "mixed" && !lineType) {
        return "Choose sale or rental for every line";
      }
    }

    if (total <= 0) return "Bill total must be greater than zero";
    if (paymentOption === "partial" && (paidAmount <= 0 || paidAmount >= total)) {
      return "Partial payment must be less than the bill total";
    }

    if (customerMode === "existing" && !selectedCustomerId) {
      return "Select a customer";
    }

    if (customerMode === "new") {
      if (!newCustomer.name.trim()) return "Enter the customer name";
      if (newCustomer.phone.length !== 10) {
        return "Enter exactly 10 mobile digits";
      }
    }

    const hasRentalLines =
      orderType === "rental" ||
      (orderType === "mixed" && lines.some((line) => line.itemType === "rental"));

    if (hasRentalLines) {
      if (!rentalDetails.startDate || !rentalDetails.endDate) {
        return "Enter rental start and expected return dates";
      }

      if (new Date(rentalDetails.endDate) < new Date(rentalDetails.startDate)) {
        return "Return date cannot be before rental start date";
      }

      if (
        rentalDetails.lateChargePerDay &&
        (!Number.isFinite(numberValue(rentalDetails.lateChargePerDay)) ||
          numberValue(rentalDetails.lateChargePerDay) < 0)
      ) {
        return "Late charge cannot be negative";
      }
    }

    return "";
  };

  const createCustomerIfNeeded = async () => {
    if (customerMode === "existing") return selectedCustomerId;

    try {
      const response = await API.post("/customers", {
        ...newCustomer,
        phone: `+91 ${newCustomer.phone}`,
        openingDue: 0,
      });

      return response.data.customer._id;
    } catch (error) {
      if (error.response?.status === 409 && error.response.data.customer?._id) {
        return error.response.data.customer._id;
      }
      throw error;
    }
  };

  const resetForm = () => {
    setCustomerMode("existing");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setNewCustomer(initialCustomer);
    setLines([emptyLine()]);
    setOrderType("sale");
    setRentalDetails({
      startDate: getTodayDate(),
      endDate: "",
      lateChargePerDay: "",
    });
    setPaymentOption("later");
    setPaymentMode("cash");
    setPartialAmount("");
    setNotes("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    const validationError = validate();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const customerId = await createCustomerIfNeeded();

      await API.post("/orders", {
        orderType,
        customerId,
        paidAmount,
        paymentMode,
        notes,
        ...(orderType !== "sale"
          ? {
              rentalStartDate: rentalDetails.startDate,
              rentalEndDate: rentalDetails.endDate,
              rentalPeriodType: "day",
              rentalPeriodValue: 0,
              lateChargePerDay: numberValue(rentalDetails.lateChargePerDay),
            }
          : {}),
        items: lines.map((line) => ({
          source: "outsourced",
          itemType: orderType === "rental" ? "rental" : line.itemType || "sale",
          productName: line.name.trim(),
          selectedUnit: line.unit.trim(),
          quantity: numberValue(line.quantity),
          pricePerUnit: numberValue(line.rate),
          conversionToBase: 1,
        })),
      });

      resetForm();
      navigate(orderType !== "sale" ? "/orders?tab=returns" : "/orders");
    } catch (error) {
      setMessage(error.response?.data?.message || "Bill creation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Simple Billing"
      subtitle={
        orderType === "rental"
          ? "Create a timber rental bill without creating products or tracking stock"
          : orderType === "mixed"
          ? "One bill for shop sales and rental items"
          : "Make a bill quickly with free-hand items"
      }
      headerAction={
        <button type="button" onClick={() => navigate("/orders")} className="btn-muted">
          View bills
          <ArrowRight size={17} />
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-3xl border border-purple-200 bg-purple-50 p-3 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex gap-2.5 sm:gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl">
                <ReceiptText size={18} className="sm:hidden" />
                <ReceiptText size={22} className="hidden sm:block" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-purple-700 sm:text-sm">
                  Free-hand bill
                </p>
                <h2 className="mt-0.5 text-lg font-black leading-tight text-slate-950 sm:mt-1 sm:text-xl">
                  Write what the customer bought
                </h2>
                <p className="mt-1 max-w-2xl text-xs font-medium leading-relaxed text-slate-600 sm:text-sm">
                  Type any item and unit, such as 5 bg balu, 10 bg cement, or 1 thelai.
                  Enter every item freely. Inventory is tracked separately for now.
                </p>
              </div>
            </div>
            <div className="w-fit rounded-full border border-purple-200 bg-white px-3 py-1.5 text-xs font-black text-purple-700">
              Free-hand billing
            </div>
          </div>
        </div>

        <div className="flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">
          {[
            { value: "sale", label: "Sale bill" },
            { value: "rental", label: "Rental bill" },
            { value: "mixed", label: "Mixed bill" },
          ].map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setBillType(option.value)}
              className={`flex-1 rounded-xl px-5 py-3 text-sm font-black transition sm:flex-none ${
                orderType === option.value
                  ? "bg-amber-50 text-amber-800 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <SectionPanel
          title="Customer"
          subtitle="Choose an existing customer or add one while billing"
          action={
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setCustomerMode("existing")}
                className={`rounded-lg px-3 py-2 text-xs font-black ${
                  customerMode === "existing" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                }`}
              >
                Existing
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("new")}
                className={`rounded-lg px-3 py-2 text-xs font-black ${
                  customerMode === "new" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                }`}
              >
                New customer
              </button>
            </div>
          }
        >
          {customerMode === "existing" ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
              <label className="block">
                <span className="form-label">Find customer</span>
                <div className="relative">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    className="form-control pl-10"
                    placeholder="Name or phone"
                  />
                </div>
              </label>
              <label className="block">
                <span className="form-label">Customer</span>
                <select
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                  className="form-control"
                  disabled={loading}
                >
                  <option value="">{loading ? "Loading customers..." : "Select customer"}</option>
                  {filteredCustomers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name} · {customer.phone}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="form-label">Customer name</span>
                <input
                  value={newCustomer.name}
                  onChange={(event) => setNewCustomer({ ...newCustomer, name: event.target.value })}
                  className="form-control"
                  placeholder="Customer name"
                />
              </label>
              <label className="block">
                <span className="form-label">Mobile number</span>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-100">
                  <span className="flex min-h-12 items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-600">+91</span>
                  <input
                    value={newCustomer.phone}
                    onChange={(event) =>
                      setNewCustomer({
                        ...newCustomer,
                        phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                      })
                    }
                    className="min-w-0 flex-1 border-0 px-3 py-3 text-base outline-none"
                    placeholder="9876543210"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    aria-label="10 digit mobile number"
                    required
                  />
                </div>
              </label>
              <label className="block">
                <span className="form-label">Address <span className="font-medium text-slate-400">(optional)</span></span>
                <input
                  value={newCustomer.address}
                  onChange={(event) => setNewCustomer({ ...newCustomer, address: event.target.value })}
                  className="form-control"
                  placeholder="Enter address (optional)"
                />
              </label>
            </div>
          )}
        </SectionPanel>

        <SectionPanel
          title="Bill items"
          subtitle={
            orderType === "rental"
              ? "Add timber or rental items, then enter the total rent for each line"
              : orderType === "mixed"
              ? "Mark each line as sale or rental"
              : "Add as many free-hand lines as needed"
          }
          action={
            <button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} className="btn-muted">
              <Plus size={17} />
              Add line
            </button>
          }
        >
          <div className="hidden grid-cols-[minmax(0,1.7fr)_110px_130px_140px_48px] gap-3 px-3 pb-2 text-xs font-black uppercase tracking-wide text-slate-400 md:grid">
            <span>Item</span><span>Qty</span><span>Unit</span><span>Rate</span><span />
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={line.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1.7fr)_110px_130px_140px_48px] md:items-end md:border-0 md:bg-transparent md:p-0">
                <label className="block">
                  <span className="form-label md:hidden">Item {index + 1}</span>
                  {orderType === "mixed" && (
                    <select
                      value={line.itemType || "sale"}
                      onChange={(event) => updateLineType(line.id, event.target.value)}
                      className="form-control mb-2"
                      aria-label={`Billing type ${index + 1}`}
                    >
                      <option value="sale">Sale item</option>
                      <option value="rental">Rental item</option>
                    </select>
                  )}
                  <input
                    value={line.name}
                    onChange={(event) => updateLine(line.id, "name", event.target.value)}
                    className="form-control"
                    placeholder="Balu, cement, thelai..."
                  />
                </label>
                <label className="block">
                  <span className="form-label md:hidden">Quantity</span>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={line.quantity}
                    onChange={(event) => updateLine(line.id, "quantity", event.target.value)}
                    className="form-control"
                    placeholder="5"
                  />
                </label>
                <label className="block">
                  <span className="form-label md:hidden">Unit</span>
                  <input
                    value={line.unit}
                    onChange={(event) => updateLine(line.id, "unit", event.target.value)}
                    className="form-control"
                    placeholder="pc / bg / kg / sandeli"
                    list="simple-billing-units"
                  />
                </label>
                <label className="block">
                  <span className="form-label md:hidden">Rate</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.rate}
                    onChange={(event) => updateLine(line.id, "rate", event.target.value)}
                    className="form-control"
                    placeholder={orderType === "rental" || (orderType === "mixed" && line.itemType === "rental") ? "₹ rent" : "₹ rate"}
                  />
                </label>
                <button type="button" onClick={() => removeLine(line.id)} className="btn-muted justify-center text-red-600 hover:text-red-700" aria-label={`Remove item ${index + 1}`}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <datalist id="simple-billing-units">
            {commonUnits.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          <div className="mt-5 flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-500">
              Items are recorded in the order only. Inventory can be tracked manually.
            </p>
            <p className="text-lg font-black text-slate-950">Items total <AmountDisplay amount={total} className="ml-2 text-xl" /></p>
          </div>
        </SectionPanel>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <SectionPanel title="Payment" subtitle="Collect now or keep the full amount due">
            {(orderType === "rental" || orderType === "mixed") && (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-900">Rental details</p>
                <p className="mt-1 text-xs font-medium text-amber-800">
                  The return reminder will appear in Orders → Returns. This simple rental does not reserve or deduct stock.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="block">
                    <span className="form-label">Rental start</span>
                    <input
                      type="date"
                      value={rentalDetails.startDate}
                      onChange={(event) => setRentalDetails({ ...rentalDetails, startDate: event.target.value })}
                      className="form-control"
                    />
                  </label>
                  <label className="block">
                    <span className="form-label">Expected return</span>
                    <input
                      type="date"
                      value={rentalDetails.endDate}
                      onChange={(event) => setRentalDetails({ ...rentalDetails, endDate: event.target.value })}
                      className="form-control"
                    />
                  </label>
                  <label className="block">
                    <span className="form-label">Late charge / day</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={rentalDetails.lateChargePerDay}
                      onChange={(event) => setRentalDetails({ ...rentalDetails, lateChargePerDay: event.target.value })}
                      className="form-control"
                      placeholder="₹ optional"
                    />
                  </label>
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              {[{ value: "later", label: "Keep as due" }, { value: "partial", label: "Partial payment" }, { value: "full", label: "Paid in full" }].map((option) => (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setPaymentOption(option.value)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                    paymentOption === option.value
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {paymentOption !== "later" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {paymentOption === "partial" && (
                  <label className="block">
                    <span className="form-label">Amount received</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={partialAmount}
                      onChange={(event) => setPartialAmount(event.target.value)}
                      className="form-control"
                      placeholder="₹ amount"
                    />
                  </label>
                )}
                <label className="block">
                  <span className="form-label">Payment mode</span>
                  <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)} className="form-control">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>
            )}
            <label className="mt-4 block">
              <span className="form-label">Note <span className="font-medium text-slate-400">(optional)</span></span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="form-control min-h-24" placeholder="Any note for this bill" />
            </label>
          </SectionPanel>

          <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-lg sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-slate-950"><FilePlus2 size={20} /></div>
              <div><p className="text-sm font-black">Bill summary</p><p className="text-xs font-medium text-slate-400">Ready to save</p></div>
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between text-slate-300"><span>Items</span><span>{lines.length}</span></div>
              <div className="flex justify-between text-slate-300"><span>Total</span><AmountDisplay amount={total} className="text-white" /></div>
              <div className="flex justify-between text-slate-300"><span>Received</span><AmountDisplay amount={paidAmount} className="text-emerald-300" /></div>
              <div className="flex justify-between border-t border-slate-800 pt-3 text-base font-black"><span>Due</span><AmountDisplay amount={dueAmount} className="text-amber-300" /></div>
            </div>
            {message && <p className="mt-5 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-bold text-red-200" role="alert">{message}</p>}
            <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full justify-center bg-amber-400 text-slate-950 hover:bg-amber-300 disabled:opacity-60">
              <ReceiptText size={18} />
              {submitting ? "Saving bill..." : "Create bill"}
            </button>
          </section>
        </div>
      </form>
    </AppLayout>
  );
};

export default SimpleBilling;
