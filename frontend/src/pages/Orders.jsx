import { useEffect, useMemo, useState } from "react";
import { FileText, Search, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";

const tabs = [
  { label: "All", value: "all" },
  { label: "Sale", value: "sale" },
  { label: "Rental", value: "rental" },
  { label: "Due", value: "due" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Delivered", value: "delivered" },
];

const orderStatusOptions = [
  "pending",
  "confirmed",
  "dispatched",
  "delivered",
  "cancelled",
];

const orderStatusConfig = {
  pending: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-[color:var(--shop-info-soft)] text-[color:var(--shop-primary-strong)] border-[color:var(--shop-info)]",
  },
  dispatched: {
    label: "Dispatched",
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

const Orders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      setOrders(res.data.orders || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load orders");
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
      order.items?.some((item) =>
        item.productName?.toLowerCase().includes(keyword)
      );

    if (!matchesSearch) return false;

    if (activeTab === "sale") return order.orderType !== "rental";
    if (activeTab === "rental") return order.orderType === "rental";
    if (activeTab === "due") return Number(order.dueAmount || 0) > 0;
    if (activeTab === "paid") return order.paymentStatus === "paid";
    if (activeTab === "pending") return order.orderStatus === "pending";
    if (activeTab === "delivered") return order.orderStatus === "delivered";

    return true;
  }); // ✅ CLOSE FILTER HERE
}, [orders, activeTab, search]); // ✅ useMemo ends here

  const handleStatusChange = async (orderId, orderStatus) => {
  try {
    await API.patch(`/orders/${orderId}/status`, { orderStatus });
    fetchOrders();
  } catch (error) {
    alert(error.response?.data?.message || "Failed to update status");
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

        <div className="px-5 pb-5 pt-4">
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--shop-border)" }}>
        <div className="overflow-x-auto">
          <table className="shop-table w-full min-w-[1050px]">
            <thead>
              <tr className="text-left">
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Customer</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Items</th>
                <th className="px-5 py-3.5 text-right">Total</th>
                <th className="px-5 py-3.5 text-right">Paid</th>
                <th className="px-5 py-3.5 text-right">Due</th>
                <th className="px-5 py-3.5">Payment</th>
                <th className="px-5 py-3.5">Order Status</th>
                <th className="px-5 py-3.5">Return</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="11"
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
                    className="text-sm"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900">
                        #{order._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.customerPhone}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                          order.orderType === "rental"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-[color:var(--shop-info-soft)] text-[color:var(--shop-primary-strong)]"
                        }`}
                      >
                        {order.orderType === "rental" ? "Rental" : "Sale"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {order.items?.slice(0, 2).map((item, index) => (
                          <p key={index} className="text-slate-600">
                            {item.productName} × {item.quantity} {item.unit}
                          </p>
                        ))}

                        {order.items?.length > 2 && (
                          <p className="text-xs font-semibold text-[color:var(--shop-primary)]">
                            +{order.items.length - 2} more
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      ₹{order.subTotal}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-green-700">
                      ₹{order.paidAmount}
                    </td>

                    <td className="px-5 py-4 text-right font-bold text-red-700">
                      ₹{order.dueAmount}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          order.paymentStatus === "paid"
                            ? "bg-green-100 text-green-700"
                            : order.paymentStatus === "partial"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                  <td className="px-5 py-4">
  <div className="space-y-2">
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
        orderStatusConfig[order.orderStatus || "pending"]?.className
      }`}
    >
      {orderStatusConfig[order.orderStatus || "pending"]?.label}
    </span>

    <select
      value={order.orderStatus || "pending"}
      onChange={(e) => handleStatusChange(order._id, e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[color:var(--shop-primary)]"
    >
      {orderStatusOptions.map((status) => (
        <option key={status} value={status}>
          Mark as {orderStatusConfig[status].label}
        </option>
      ))}
    </select>

    {order.orderStatus !== "cancelled" && (
      <div className="mt-2 flex items-center gap-1">
        {["pending", "confirmed", "dispatched", "delivered"].map((status) => {
          const flow = ["pending", "confirmed", "dispatched", "delivered"];
          const currentIndex = flow.indexOf(order.orderStatus || "pending");
          const index = flow.indexOf(status);
          const isDone = index <= currentIndex;

          return (
            <div
              key={status}
              title={orderStatusConfig[status].label}
              className={`h-2 flex-1 rounded-full ${
                isDone ? "bg-[color:var(--shop-primary)]" : "bg-slate-200"
              }`}
            />
          );
        })}
      </div>
    )}
  </div>
</td>

                    <td className="px-5 py-4">
                      {order.orderType === "rental" ? (
                        <div>
                          <p className="font-semibold text-orange-700">
                            {order.rentalEndDate
                              ? new Date(
                                  order.rentalEndDate
                                ).toLocaleDateString()
                              : "-"}
                          </p>
                          <p className="mt-1 text-xs capitalize text-slate-500">
                            {order.returnStatus || "pending"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/orders/${order._id}/invoice`)}
                        className="btn-muted text-sm text-[color:var(--shop-primary-strong)]"
                      >
                        <FileText size={16} />
                        Invoice
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Orders;
