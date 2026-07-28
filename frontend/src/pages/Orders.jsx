import { useEffect, useMemo, useState } from "react";
import { FileText, RotateCcw, Search, ShoppingCart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import LoadingState from "../components/LoadingState";
import getBillNumber from "../utils/billNumber";

const tabs = [
  { label: "All", value: "all" },
  { label: "Sale", value: "sale" },
  { label: "Rental", value: "rental" },
  { label: "Due", value: "due" },
  { label: "Paid", value: "paid" },
  { label: "Today", value: "today" },
];

const Orders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnModal, setReturnModal] = useState({
    open: false,
    order: null,
    productId: "",
    quantity: "",
    unit: "",
    conversionToBase: "1",
    returnRate: "",
    labourCharge: "",
    stockImpact: "add_to_stock",
    note: "",
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await API.get("/orders");
      setOrders(res.data.orders || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        order.customerName?.toLowerCase().includes(keyword) ||
        order.customerPhone?.toLowerCase().includes(keyword) ||
        order._id?.toLowerCase().includes(keyword) ||
        order.items?.some((item) =>
          item.productName?.toLowerCase().includes(keyword)
        );

      if (!matchesSearch) return false;

      if (activeTab === "sale") return order.orderType !== "rental";
      if (activeTab === "rental") return order.orderType === "rental";
      if (activeTab === "due") return Number(order.dueAmount || 0) > 0;
      if (activeTab === "paid") return order.paymentStatus === "paid";
      if (activeTab === "today") {
        return (
          new Date(order.createdAt).toDateString() === new Date().toDateString()
        );
      }

      return true;
    });
  }, [orders, activeTab, search]);

  const summary = useMemo(() => {
    return filteredOrders.reduce(
      (acc, order) => {
        acc.total += Number(order.subTotal || 0);
        acc.paid += Number(order.paidAmount || 0);
        acc.due += Number(order.dueAmount || 0);
        acc.count += 1;
        return acc;
      },
      { count: 0, total: 0, paid: 0, due: 0 }
    );
  }, [filteredOrders]);

  const formatMoney = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const getPaymentPillClass = (status) => {
    if (status === "paid") return "bg-green-50 text-green-700 ring-green-100";
    if (status === "partial") return "bg-yellow-50 text-yellow-700 ring-yellow-100";
    return "bg-red-50 text-red-700 ring-red-100";
  };

  const getProductId = (item) =>
    typeof item?.product === "object" ? item.product?._id : item?.product;

  const getReturnEntries = (order) =>
    (order?.adjustments || []).filter((entry) => entry.type === "return");

  const getReturnTotal = (order) =>
    getReturnEntries(order).reduce(
      (sum, entry) => sum + Number(entry.amount || 0),
      0
    );

  const getReturnedBaseQuantity = (order, productId) =>
    getReturnEntries(order)
      .filter((entry) => {
        const entryProductId =
          typeof entry.product === "object" ? entry.product?._id : entry.product;
        return entryProductId === productId;
      })
      .reduce(
        (sum, entry) =>
          sum +
          Number(entry.quantity || 0) * Number(entry.conversionToBase || 1),
        0
      );

  const getPurchasedBaseQuantity = (order, productId) =>
    (order?.items || [])
      .filter((item) => getProductId(item) === productId)
      .reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.conversionToBase || 1),
        0
      );

  const getSelectedReturnItem = () =>
    returnModal.order?.items?.find(
      (item) => getProductId(item) === returnModal.productId
    );

  const getUnitOptions = (item) => {
    if (!item) return [];

    const units = [
      {
        unit: item.selectedUnit || item.unit,
        conversionToBase: Number(item.conversionToBase || 1),
        pricePerUnit: Number(item.pricePerUnit || 0),
      },
      ...((item.product?.saleUnits || []).map((unit) => ({
        unit: unit.unit,
        conversionToBase: Number(unit.conversionToBase || 1),
        pricePerUnit: Number(unit.pricePerUnit || item.pricePerUnit || 0),
      })) || []),
    ];

    return units.filter(
      (unit, index, list) =>
        unit.unit && list.findIndex((entry) => entry.unit === unit.unit) === index
    );
  };

  const returnSummary = useMemo(() => {
    const gross =
      Number(returnModal.quantity || 0) * Number(returnModal.returnRate || 0);
    const labour = Number(returnModal.labourCharge || 0);
    const credit = Math.max(gross - labour, 0);
    const currentDue = Number(returnModal.order?.dueAmount || 0);
    const dueAfter = Math.max(currentDue - credit, 0);
    const refund = Math.max(credit - currentDue, 0);

    return { gross, labour, credit, currentDue, dueAfter, refund };
  }, [returnModal]);

  const openReturnModal = (order) => {
    setMessage("");
    setReturnModal({
      open: true,
      order,
      productId: "",
      quantity: "",
      unit: "",
      conversionToBase: "1",
      returnRate: "",
      labourCharge: "",
      stockImpact: "add_to_stock",
      note: "",
    });
  };

  const closeReturnModal = () => {
    setReturnModal({
      open: false,
      order: null,
      productId: "",
      quantity: "",
      unit: "",
      conversionToBase: "1",
      returnRate: "",
      labourCharge: "",
      stockImpact: "add_to_stock",
      note: "",
    });
  };

  const handleReturnItemChange = (productId) => {
    const item = returnModal.order?.items?.find(
      (orderItem) => getProductId(orderItem) === productId
    );
    const unitOption = getUnitOptions(item)[0];

    setReturnModal({
      ...returnModal,
      productId,
      quantity: "",
      unit: unitOption?.unit || item?.selectedUnit || item?.unit || "",
      conversionToBase: String(unitOption?.conversionToBase || 1),
      returnRate: String(unitOption?.pricePerUnit || item?.pricePerUnit || ""),
      labourCharge: "",
    });
  };

  const handleReturnUnitChange = (unit) => {
    const item = getSelectedReturnItem();
    const unitOption = getUnitOptions(item).find((entry) => entry.unit === unit);

    setReturnModal({
      ...returnModal,
      unit,
      conversionToBase: String(unitOption?.conversionToBase || 1),
      returnRate: String(unitOption?.pricePerUnit || returnModal.returnRate),
    });
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();

    const quantity = Number(returnModal.quantity);
    const returnRate = Number(returnModal.returnRate);
    const labourCharge = Number(returnModal.labourCharge || 0);
    const conversionToBase = Number(returnModal.conversionToBase || 1);

    if (!returnModal.order || !returnModal.productId) {
      setMessage("Please select returned item");
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMessage("Return quantity must be greater than 0");
      return;
    }

    if (!Number.isFinite(returnRate) || returnRate <= 0) {
      setMessage("Return rate must be greater than 0");
      return;
    }

    if (!Number.isFinite(labourCharge) || labourCharge < 0) {
      setMessage("Labour charge cannot be negative");
      return;
    }

    if (returnSummary.credit <= 0) {
      setMessage("Return credit must be greater than 0");
      return;
    }

    if (!Number.isFinite(conversionToBase) || conversionToBase <= 0) {
      setMessage("Stock unit value must be greater than 0");
      return;
    }

    const purchasedBase = getPurchasedBaseQuantity(
      returnModal.order,
      returnModal.productId
    );
    const returnedBase = getReturnedBaseQuantity(
      returnModal.order,
      returnModal.productId
    );

    if (quantity * conversionToBase > purchasedBase - returnedBase + 0.0001) {
      setMessage("Return quantity cannot be more than remaining purchased quantity");
      return;
    }

    try {
      setReturnLoading(true);
      setMessage("");

      await API.post(`/orders/${returnModal.order._id}/adjustments`, {
        type: "return",
        productId: returnModal.productId,
        quantity,
        unit: returnModal.unit,
        conversionToBase,
        returnRate,
        labourCharge,
        amount: returnSummary.credit,
        stockImpact: returnModal.stockImpact,
        condition:
          returnModal.stockImpact === "add_to_stock" ? "sealed" : "loose",
        note: returnModal.note,
      });

      setMessage("Order return saved");
      closeReturnModal();
      fetchOrders();
    } catch (error) {
      setMessage(error.response?.data?.message || "Return failed");
    } finally {
      setReturnLoading(false);
    }
  };

  return (
    <AppLayout
      title="Orders"
      subtitle="View sale and rental order history"
    >
      {message && (
        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </div>
      )}

      <div className="surface overflow-hidden">
        <div className="grid grid-cols-2 gap-3 border-b px-5 py-5 md:grid-cols-4" style={{ borderColor: "var(--shop-border)" }}>
          <div className="rounded-xl border bg-[color:var(--shop-panel)] p-4" style={{ borderColor: "var(--shop-border)" }}>
            <p className="text-xs font-bold uppercase text-slate-500">Bills</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{summary.count}</p>
          </div>
          <div className="rounded-xl border bg-[color:var(--shop-panel)] p-4" style={{ borderColor: "var(--shop-border)" }}>
            <p className="text-xs font-bold uppercase text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-black text-slate-900">
              {formatMoney(summary.total)}
            </p>
          </div>
          <div className="rounded-xl border bg-[color:var(--shop-panel)] p-4" style={{ borderColor: "var(--shop-border)" }}>
            <p className="text-xs font-bold uppercase text-slate-500">Paid</p>
            <p className="mt-1 text-2xl font-black text-green-700">
              {formatMoney(summary.paid)}
            </p>
          </div>
          <div className="rounded-xl border bg-[color:var(--shop-panel)] p-4" style={{ borderColor: "var(--shop-border)" }}>
            <p className="text-xs font-bold uppercase text-slate-500">Due</p>
            <p className="mt-1 text-2xl font-black text-red-700">
              {formatMoney(summary.due)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-b px-5 py-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: "var(--shop-border)" }}>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${
                  activeTab === tab.value
                    ? "bg-[color:var(--shop-primary)] text-white"
                    : "bg-[color:var(--shop-panel-2)] text-slate-600 hover:bg-[color:var(--shop-primary-soft)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-80">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or item..."
              className="form-control py-3 pl-11 pr-4"
            />
          </div>
        </div>

        <div className="px-4 pb-5 pt-4 sm:px-5">
          {loading ? (
            <LoadingState label="Loading shop orders..." />
          ) : (
            <>
          <div className="space-y-3 md:hidden">
            {filteredOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-5 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--shop-primary-soft)] text-[color:var(--shop-primary)]">
                  <ShoppingCart size={24} />
                </div>
                <h3 className="mt-4 text-base font-black text-slate-900">
                  No orders found
                </h3>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  New sale and rental bills will appear here.
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <article key={order._id} className="surface-flat p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-slate-500">
                        {getBillNumber(order)}
                      </p>
                      <h3 className="mt-1 text-base font-black text-slate-900">
                        {order.customerName}
                      </h3>
                      <p className="text-sm font-semibold text-slate-500">
                        {order.customerPhone}
                      </p>
                    </div>
                    <span
                      className={`status-pill ${
                        order.orderType === "rental"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-[color:var(--shop-info-soft)] text-[color:var(--shop-primary-strong)]"
                      }`}
                    >
                      {order.orderType === "rental" ? "Rental" : "Sale"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-1 rounded-xl bg-[color:var(--shop-panel-2)] p-3">
                    {order.items?.slice(0, 3).map((item, index) => (
                      <p key={index} className="text-sm font-semibold text-slate-600">
                        {item.productName} × {item.quantity}{" "}
                        {item.selectedUnit || item.unit}
                      </p>
                    ))}
                    {order.items?.length > 3 && (
                      <p className="text-xs font-black text-[color:var(--shop-primary)]">
                        +{order.items.length - 3} more items
                      </p>
                    )}
                    {getReturnEntries(order).length > 0 && (
                      <p className="pt-1 text-xs font-black text-orange-700">
                        Returned {formatMoney(getReturnTotal(order))}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                    <div className="rounded-xl bg-[color:var(--shop-panel-2)] p-3">
                      <p className="text-xs font-bold text-slate-500">Total</p>
                      <p className="font-black text-slate-900">
                        {formatMoney(order.subTotal)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[color:var(--shop-primary-soft)] p-3">
                      <p className="text-xs font-bold text-green-700">Paid</p>
                      <p className="font-black text-green-800">
                        {formatMoney(order.paidAmount)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-[color:var(--shop-brick-soft)] p-3">
                      <p className="text-xs font-bold text-red-700">Due</p>
                      <p className="font-black text-red-800">
                        {formatMoney(order.dueAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2">
                    <button
                      onClick={() => openReturnModal(order)}
                      className="btn-muted w-full text-sm text-orange-700"
                    >
                      <RotateCcw size={16} />
                      Return
                    </button>
                    <button
                      onClick={() => navigate(`/orders/${order._id}/invoice`)}
                      className="btn-success w-full text-sm"
                    >
                      <FileText size={16} />
                      Open Bill
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="hidden overflow-hidden rounded-xl border md:block" style={{ borderColor: "var(--shop-border)" }}>
        <div className="overflow-x-auto">
          <table className="shop-table w-full min-w-[1060px]">
            <thead>
              <tr className="text-left">
                <th className="px-5 py-3.5">Bill</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5 text-right">Total</th>
                <th className="px-5 py-3.5 text-right">Paid</th>
                <th className="px-5 py-3.5 text-right">Due</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="bg-[color:var(--shop-panel)] px-6 py-16"
                  >
                    <div className="mx-auto flex max-w-md flex-col items-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--shop-primary-soft)] text-[color:var(--shop-primary)]">
                        <ShoppingCart size={24} />
                      </div>
                      <h3 className="mt-4 text-base font-black text-slate-900">
                        No orders found
                      </h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        New sale and rental bills will appear here after you create an order.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="text-sm align-top"
                  >
                    <td className="px-5 py-4">
                      <div className="min-w-[130px]">
                        <p className="text-sm font-black text-slate-950">
                          {getBillNumber(order)}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="min-w-[190px]">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-slate-900">
                            {order.customerName}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-500">
                            {order.orderType === "rental" ? "Rental" : "Sale"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {order.customerPhone}
                        </p>
                        <p className="mt-1 max-w-[190px] truncate text-xs text-slate-400">
                          {order.deliveryAddress || order.customer?.address || "Counter sale"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="min-w-[280px]">
                        <div className="space-y-1.5">
                          {order.items?.slice(0, 3).map((item, index) => (
                            <p key={index} className="text-sm font-semibold text-slate-700">
                              {item.productName}{" "}
                              <span className="text-slate-400">×</span>{" "}
                              <span className="text-slate-600">
                                {item.quantity} {item.selectedUnit || item.unit}
                              </span>
                            </p>
                          ))}

                          <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs font-bold text-slate-500">
                            <span>
                              {order.items?.length || 0} item
                              {(order.items?.length || 0) === 1 ? "" : "s"}
                            </span>
                            {order.items?.length > 3 && (
                              <span>+{order.items.length - 3} more</span>
                            )}
                            {Number(order.deliveryCharge || 0) > 0 && (
                              <span>Delivery {formatMoney(order.deliveryCharge)}</span>
                            )}
                            {getReturnEntries(order).length > 0 && (
                              <span className="text-orange-700">
                                Return {formatMoney(getReturnTotal(order))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-black text-slate-950">
                      {formatMoney(order.subTotal)}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-green-700">
                      {formatMoney(order.paidAmount)}
                    </td>

                    <td className="px-5 py-4 text-right font-black text-red-700">
                      {formatMoney(order.dueAmount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black capitalize ring-1 ${getPaymentPillClass(
                          order.paymentStatus
                        )}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openReturnModal(order)}
                          className="btn-muted text-sm text-orange-700"
                        >
                          <RotateCcw size={16} />
                          Return
                        </button>
                        <button
                          onClick={() => navigate(`/orders/${order._id}/invoice`)}
                          className="btn-success text-sm"
                        >
                          <FileText size={16} />
                          Bill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
          </div>
            </>
          )}
        </div>
      </div>
      {returnModal.open && (
        <div className="mobile-sheet fixed inset-0 z-50 flex bg-black/50 sm:px-4">
          <div className="modal-panel max-h-[92vh] w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-6" style={{ borderColor: "var(--shop-border)" }}>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Return From Bill
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Bill {getBillNumber(returnModal.order)} ·{" "}
                  {returnModal.order?.customerName}
                </p>
              </div>

              <button
                type="button"
                onClick={closeReturnModal}
                disabled={returnLoading}
                className="btn-muted p-2"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleReturnSubmit}>
              <div className="max-h-[68vh] space-y-4 overflow-y-auto p-4 sm:p-6">
                <div className="rounded-xl bg-[color:var(--shop-panel-2)] p-4">
                  <p className="text-sm font-bold text-slate-900">
                    Use this when customer returns material from this bill.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Return rate can be lower than sale rate. Labour charge reduces the customer credit.
                  </p>
                </div>

                <div>
                  <label className="field-label">Returned Item</label>
                  <select
                    value={returnModal.productId}
                    onChange={(e) => handleReturnItemChange(e.target.value)}
                    className="form-control px-4 py-3"
                  >
                    <option value="">Choose purchased item</option>
                    {returnModal.order?.items?.map((item, index) => (
                      <option key={`${getProductId(item)}-${index}`} value={getProductId(item)}>
                        {item.productName} · bought {item.quantity}{" "}
                        {item.selectedUnit || item.unit} at {formatMoney(item.pricePerUnit)}
                      </option>
                    ))}
                  </select>
                </div>

                {getSelectedReturnItem() && (
                  <div className="rounded-xl bg-[color:var(--shop-primary-soft)] p-4 text-sm">
                    <p className="font-black text-[color:var(--shop-primary-strong)]">
                      Remaining returnable stock unit:{" "}
                      {(
                        getPurchasedBaseQuantity(
                          returnModal.order,
                          returnModal.productId
                        ) -
                        getReturnedBaseQuantity(
                          returnModal.order,
                          returnModal.productId
                        )
                      ).toFixed(2)}
                    </p>
                    <p className="mt-1 font-semibold text-slate-600">
                      Example: if 1 cement bag = 50 kg, return 5 kg uses stock unit value 0.02.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label">Return Quantity</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={returnModal.quantity}
                      onChange={(e) =>
                        setReturnModal({
                          ...returnModal,
                          quantity: e.target.value,
                        })
                      }
                      className="form-control px-4 py-3"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="field-label">Return Unit</label>
                    <select
                      value={returnModal.unit}
                      onChange={(e) => handleReturnUnitChange(e.target.value)}
                      className="form-control px-4 py-3"
                    >
                      <option value="">Choose unit</option>
                      {getUnitOptions(getSelectedReturnItem()).map((unit) => (
                        <option key={unit.unit} value={unit.unit}>
                          {unit.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="field-label">Return Rate</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={returnModal.returnRate}
                      onChange={(e) =>
                        setReturnModal({
                          ...returnModal,
                          returnRate: e.target.value,
                        })
                      }
                      className="form-control px-4 py-3"
                      placeholder="10"
                    />
                  </div>

                  <div>
                    <label className="field-label">Labour Charge</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={returnModal.labourCharge}
                      onChange={(e) =>
                        setReturnModal({
                          ...returnModal,
                          labourCharge: e.target.value,
                        })
                      }
                      className="form-control px-4 py-3"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="field-label">Stock Unit Value</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={returnModal.conversionToBase}
                      onChange={(e) =>
                        setReturnModal({
                          ...returnModal,
                          conversionToBase: e.target.value,
                        })
                      }
                      className="form-control px-4 py-3"
                    />
                  </div>

                  <div>
                    <label className="field-label">Stock Handling</label>
                    <select
                      value={returnModal.stockImpact}
                      onChange={(e) =>
                        setReturnModal({
                          ...returnModal,
                          stockImpact: e.target.value,
                        })
                      }
                      className="form-control px-4 py-3"
                    >
                      <option value="add_to_stock">Add back to stock</option>
                      <option value="no_stock_change">Do not add stock</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-[color:var(--shop-panel-2)] p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500">Gross</p>
                      <p className="font-black text-slate-900">
                        {formatMoney(returnSummary.gross)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-500">Labour</p>
                      <p className="font-black text-slate-900">
                        {formatMoney(returnSummary.labour)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-700">Credit</p>
                      <p className="font-black text-green-800">
                        {formatMoney(returnSummary.credit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-700">Refund</p>
                      <p className="font-black text-red-800">
                        {formatMoney(returnSummary.refund)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    Due: {formatMoney(returnSummary.currentDue)} →{" "}
                    {formatMoney(returnSummary.dueAfter)}
                  </p>
                </div>

                <div>
                  <label className="field-label">Note</label>
                  <textarea
                    rows="3"
                    value={returnModal.note}
                    onChange={(e) =>
                      setReturnModal({
                        ...returnModal,
                        note: e.target.value,
                      })
                    }
                    className="form-control resize-none px-4 py-3"
                    placeholder="Example: 5 kg cement returned at lower rate"
                  />
                </div>
              </div>

              <div className="thumb-footer flex flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-6" style={{ borderColor: "var(--shop-border)" }}>
                <button
                  type="button"
                  onClick={closeReturnModal}
                  disabled={returnLoading}
                  className="btn-muted"
                >
                  Cancel
                </button>

                <button
                  disabled={
                    returnLoading ||
                    !returnModal.productId ||
                    !returnModal.quantity ||
                    !returnModal.returnRate
                  }
                  className="btn-success"
                >
                  {returnLoading ? "Saving..." : "Save Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Orders;
