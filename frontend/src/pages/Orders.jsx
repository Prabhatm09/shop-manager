import { useEffect, useMemo, useState } from "react";
import { FileText, Plus, RotateCcw, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import CreateOrderModal from "../components/CreateOrderModal";
import LoadingState from "../components/LoadingState";
import { AmountDisplay, EmptyState, StatCard, StatusBadge } from "../components/pos";
import getBillNumber from "../utils/billNumber";

const tabs = [
  { label: "All", value: "all" },
  { label: "Sale", value: "sale" },
  { label: "Rental", value: "rental" },
  { label: "Due", value: "due" },
  { label: "Paid", value: "paid" },
  { label: "Today", value: "today" },
  { label: "Returns", value: "returns" },
];

const createReturnRow = (orderId = "") => ({
  orderId,
  productId: "",
  quantity: "",
  unit: "",
  conversionToBase: "1",
  returnRate: "",
  labourCharge: "",
  stockImpact: "add_to_stock",
  note: "",
});

const Orders = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(
    new URLSearchParams(location.search).get("tab") === "returns"
      ? "returns"
      : "all"
  );
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [returnLoading, setReturnLoading] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [returnModal, setReturnModal] = useState({
    open: false,
    order: null,
    customerOrders: [],
    rows: [],
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

  const formatMoney = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const getProductId = (item) =>
    typeof item?.product === "object" ? item.product?._id : item?.product;

  const getReturnEntries = (order) =>
    (order?.adjustments || []).filter((entry) => entry.type === "return");

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
      if (activeTab === "returns") return getReturnEntries(order).length > 0;
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

  const getSelectedReturnOrder = (row) =>
    returnModal.customerOrders.find((order) => order._id === row.orderId);

  const getSelectedReturnItem = (row) =>
    getSelectedReturnOrder(row)?.items?.find(
      (item) => getProductId(item) === row.productId
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
    const remainingDueByOrder = new Map(
      returnModal.customerOrders.map((order) => [
        order._id,
        Number(order.dueAmount || 0),
      ])
    );

    return returnModal.rows.reduce(
      (summary, row) => {
        const gross = Number(row.quantity || 0) * Number(row.returnRate || 0);
        const labour = Number(row.labourCharge || 0);
        const credit = Math.max(gross - labour, 0);
        const currentDue = Number(remainingDueByOrder.get(row.orderId) || 0);

        summary.gross += gross;
        summary.labour += labour;
        summary.credit += credit;
        summary.refund += Math.max(credit - currentDue, 0);
        remainingDueByOrder.set(row.orderId, Math.max(currentDue - credit, 0));

        return summary;
      },
      { gross: 0, labour: 0, credit: 0, refund: 0 }
    );
  }, [returnModal]);

  const openReturnModal = (order) => {
    const customerId =
      typeof order.customer === "object" ? order.customer?._id : order.customer;
    const customerOrders = orders
      .filter((entry) => {
        const entryCustomerId =
          typeof entry.customer === "object" ? entry.customer?._id : entry.customer;

        return entryCustomerId === customerId;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setMessage("");
    setReturnModal({
      open: true,
      order,
      customerOrders,
      rows: [createReturnRow(order._id)],
    });
  };

  const closeReturnModal = () => {
    setReturnModal({
      open: false,
      order: null,
      customerOrders: [],
      rows: [],
    });
  };

  const updateReturnRow = (index, patch) => {
    setReturnModal({
      ...returnModal,
      rows: returnModal.rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      ),
    });
  };

  const addReturnRow = () => {
    setReturnModal({
      ...returnModal,
      rows: [...returnModal.rows, createReturnRow(returnModal.order?._id || "")],
    });
  };

  const removeReturnRow = (index) => {
    setReturnModal({
      ...returnModal,
      rows: returnModal.rows.filter((_, rowIndex) => rowIndex !== index),
    });
  };

  const handleReturnOrderChange = (index, orderId) => {
    updateReturnRow(index, {
      ...createReturnRow(orderId),
    });
  };

  const handleReturnItemChange = (index, productId) => {
    const row = returnModal.rows[index];
    const order = getSelectedReturnOrder(row);
    const item = order?.items?.find(
      (orderItem) => getProductId(orderItem) === productId
    );
    const unitOption = getUnitOptions(item)[0];

    updateReturnRow(index, {
      productId,
      quantity: "",
      unit: unitOption?.unit || item?.selectedUnit || item?.unit || "",
      conversionToBase: String(unitOption?.conversionToBase || 1),
      returnRate: String(unitOption?.pricePerUnit || item?.pricePerUnit || ""),
      labourCharge: "",
    });
  };

  const handleReturnUnitChange = (index, unit) => {
    const row = returnModal.rows[index];
    const item = getSelectedReturnItem(row);
    const unitOption = getUnitOptions(item).find((entry) => entry.unit === unit);

    updateReturnRow(index, {
      unit,
      conversionToBase: String(unitOption?.conversionToBase || row.conversionToBase || 1),
      returnRate: String(unitOption?.pricePerUnit || row.returnRate),
    });
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();

    if (!returnModal.rows.length) {
      setMessage("Add at least one returned item");
      return;
    }

    for (const [index, row] of returnModal.rows.entries()) {
      const rowNumber = index + 1;
      const rowOrder = getSelectedReturnOrder(row);
      const quantity = Number(row.quantity);
      const returnRate = Number(row.returnRate);
      const labourCharge = Number(row.labourCharge || 0);
      const conversionToBase = Number(row.conversionToBase || 1);
      const credit = Math.max(quantity * returnRate - labourCharge, 0);

      if (!rowOrder || !row.productId) {
        setMessage(`Choose bill and item for return row ${rowNumber}`);
        return;
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        setMessage(`Return quantity must be greater than 0 in row ${rowNumber}`);
        return;
      }

      if (!Number.isFinite(returnRate) || returnRate <= 0) {
        setMessage(`Return rate must be greater than 0 in row ${rowNumber}`);
        return;
      }

      if (!Number.isFinite(labourCharge) || labourCharge < 0) {
        setMessage(`Labour charge cannot be negative in row ${rowNumber}`);
        return;
      }

      if (credit <= 0) {
        setMessage(`Return credit must be greater than 0 in row ${rowNumber}`);
        return;
      }

      if (!Number.isFinite(conversionToBase) || conversionToBase <= 0) {
        setMessage(`Stock unit value must be greater than 0 in row ${rowNumber}`);
        return;
      }

      const purchasedBase = getPurchasedBaseQuantity(rowOrder, row.productId);
      const returnedBase = getReturnedBaseQuantity(rowOrder, row.productId);

      if (quantity * conversionToBase > purchasedBase - returnedBase + 0.0001) {
        setMessage(
          `Return quantity cannot be more than remaining purchased quantity in row ${rowNumber}`
        );
        return;
      }
    }

    try {
      setReturnLoading(true);
      setMessage("");

      for (const row of returnModal.rows) {
        const quantity = Number(row.quantity);
        const returnRate = Number(row.returnRate);
        const labourCharge = Number(row.labourCharge || 0);

        await API.post(`/orders/${row.orderId}/adjustments`, {
          type: "return",
          productId: row.productId,
          quantity,
          unit: row.unit,
          conversionToBase: Number(row.conversionToBase || 1),
          returnRate,
          labourCharge,
          amount: Math.max(quantity * returnRate - labourCharge, 0),
          stockImpact: row.stockImpact,
          condition: row.stockImpact === "add_to_stock" ? "sealed" : "loose",
          note: row.note,
        });
      }

      setMessage("Return saved");
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
      subtitle="Fast billing history, returns and invoice actions"
      headerAction={
        <button
          type="button"
          onClick={() => setCreateOrderOpen(true)}
          className="btn-primary w-full md:w-auto"
        >
          <Plus size={18} />
          New Order
        </button>
      }
    >
      {message && (
        <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {message}
        </div>
      )}

      <div className="surface overflow-hidden">
        <div className="grid grid-cols-2 gap-3 border-b px-5 py-5 md:grid-cols-4" style={{ borderColor: "var(--shop-border)" }}>
          <StatCard label="Bills" value={summary.count} icon={ShoppingCart} />
          <StatCard label="Total" value={formatMoney(summary.total)} icon={FileText} />
          <StatCard label="Paid" value={formatMoney(summary.paid)} icon={ShoppingCart} tone="success" />
          <StatCard label="Due" value={formatMoney(summary.due)} icon={ShoppingCart} tone="danger" />
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
              <EmptyState
                icon={ShoppingCart}
                title="No orders found"
                message="New sale and rental bills will appear here."
                action={
                  <button
                    type="button"
                    onClick={() => setCreateOrderOpen(true)}
                    className="btn-primary"
                  >
                    <Plus size={18} />
                    New Order
                  </button>
                }
              />
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
                    <StatusBadge
                      label={order.orderType === "rental" ? "Rental" : "Sale"}
                      tone={order.orderType === "rental" ? "rental" : "sale"}
                    />
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
                      <AmountDisplay amount={order.subTotal} />
                    </div>
                    <div className="rounded-xl bg-[color:var(--shop-primary-soft)] p-3">
                      <p className="text-xs font-bold text-green-700">Paid</p>
                      <AmountDisplay amount={order.paidAmount} tone="success" />
                    </div>
                    <div className="rounded-xl bg-[color:var(--shop-brick-soft)] p-3">
                      <p className="text-xs font-bold text-red-700">Due</p>
                      <AmountDisplay amount={order.dueAmount} tone="danger" />
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
                              <span>Labour {formatMoney(order.deliveryCharge)}</span>
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
                      <StatusBadge
                        label={order.paymentStatus}
                        tone={order.paymentStatus}
                      />
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
                    Add every returned material line here, even when it belongs to another bill for this customer.
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Each row is saved against its selected bill, so stock and bill balance stay separate.
                  </p>
                </div>

                <div className="space-y-4">
                  {returnModal.rows.map((row, index) => {
                    const selectedOrder = getSelectedReturnOrder(row);
                    const selectedItem = getSelectedReturnItem(row);
                    const rowGross =
                      Number(row.quantity || 0) * Number(row.returnRate || 0);
                    const rowLabour = Number(row.labourCharge || 0);
                    const rowCredit = Math.max(rowGross - rowLabour, 0);
                    const remainingBase =
                      selectedOrder && row.productId
                        ? getPurchasedBaseQuantity(selectedOrder, row.productId) -
                          getReturnedBaseQuantity(selectedOrder, row.productId)
                        : 0;

                    return (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-[color:var(--shop-panel)] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-900">
                            Return Item {index + 1}
                          </p>
                          {returnModal.rows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeReturnRow(index)}
                              disabled={returnLoading}
                              className="btn-muted p-2 text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div>
                            <label className="field-label">Bill</label>
                            <select
                              value={row.orderId}
                              onChange={(e) =>
                                handleReturnOrderChange(index, e.target.value)
                              }
                              className="form-control px-4 py-3"
                            >
                              <option value="">Choose bill</option>
                              {returnModal.customerOrders.map((order) => (
                                <option key={order._id} value={order._id}>
                                  {getBillNumber(order)} ·{" "}
                                  {new Date(order.createdAt).toLocaleDateString()} · due{" "}
                                  {formatMoney(order.dueAmount)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="field-label">Returned Item</label>
                            <select
                              value={row.productId}
                              onChange={(e) =>
                                handleReturnItemChange(index, e.target.value)
                              }
                              className="form-control px-4 py-3"
                            >
                              <option value="">Choose purchased item</option>
                              {selectedOrder?.items?.map((item, itemIndex) => (
                                <option
                                  key={`${getProductId(item)}-${itemIndex}`}
                                  value={getProductId(item)}
                                >
                                  {item.productName} · bought {item.quantity}{" "}
                                  {item.selectedUnit || item.unit} at{" "}
                                  {formatMoney(item.pricePerUnit)}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="field-label">Return Quantity</label>
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={row.quantity}
                              onChange={(e) =>
                                updateReturnRow(index, { quantity: e.target.value })
                              }
                              className="form-control px-4 py-3"
                              placeholder="5"
                            />
                          </div>

                          <div>
                            <label className="field-label">Return Unit</label>
                            <select
                              value={row.unit}
                              onChange={(e) =>
                                handleReturnUnitChange(index, e.target.value)
                              }
                              className="form-control px-4 py-3"
                            >
                              <option value="">Choose unit</option>
                              {getUnitOptions(selectedItem).map((unit) => (
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
                              value={row.returnRate}
                              onChange={(e) =>
                                updateReturnRow(index, {
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
                              value={row.labourCharge}
                              onChange={(e) =>
                                updateReturnRow(index, {
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
                              value={row.conversionToBase}
                              onChange={(e) =>
                                updateReturnRow(index, {
                                  conversionToBase: e.target.value,
                                })
                              }
                              className="form-control px-4 py-3"
                            />
                          </div>

                          <div>
                            <label className="field-label">Stock Handling</label>
                            <select
                              value={row.stockImpact}
                              onChange={(e) =>
                                updateReturnRow(index, {
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

                        {selectedItem && (
                          <div className="mt-4 rounded-lg bg-[color:var(--shop-primary-soft)] px-3 py-2 text-sm">
                            <p className="font-black text-[color:var(--shop-primary-strong)]">
                              Remaining returnable stock unit: {remainingBase.toFixed(2)}
                            </p>
                            <p className="mt-1 font-semibold text-slate-600">
                              Row credit: {formatMoney(rowCredit)}
                            </p>
                          </div>
                        )}

                        <div className="mt-4">
                          <label className="field-label">Note</label>
                          <textarea
                            rows="2"
                            value={row.note}
                            onChange={(e) =>
                              updateReturnRow(index, { note: e.target.value })
                            }
                            className="form-control resize-none px-4 py-3"
                            placeholder="Example: returned from site"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={addReturnRow}
                  disabled={returnLoading}
                  className="btn-muted w-full text-sm text-orange-700"
                >
                  <Plus size={16} />
                  Add Another Return Item
                </button>

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
                    returnModal.rows.some(
                      (row) => !row.orderId || !row.productId || !row.quantity || !row.returnRate
                    )
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
      <CreateOrderModal
        open={createOrderOpen}
        onClose={() => setCreateOrderOpen(false)}
      />
    </AppLayout>
  );
};

export default Orders;
