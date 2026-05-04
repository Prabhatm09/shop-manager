import { useEffect, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
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
    className: "bg-blue-100 text-blue-700 border-blue-200",
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

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${
                  activeTab === tab.value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
              className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-sm text-slate-600">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order Status</th>
                <th className="px-4 py-3">Return</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b text-sm hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900">
                        #{order._id.slice(-6).toUpperCase()}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.customerPhone}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase ${
                          order.orderType === "rental"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {order.orderType === "rental" ? "Rental" : "Sale"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {order.items?.slice(0, 2).map((item, index) => (
                          <p key={index} className="text-slate-600">
                            {item.productName} × {item.quantity} {item.unit}
                          </p>
                        ))}

                        {order.items?.length > 2 && (
                          <p className="text-xs font-semibold text-blue-600">
                            +{order.items.length - 2} more
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-slate-900">
                      ₹{order.subTotal}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-green-700">
                      ₹{order.paidAmount}
                    </td>

                    <td className="px-4 py-4 text-right font-bold text-red-700">
                      ₹{order.dueAmount}
                    </td>

                    <td className="px-4 py-4">
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
                  <td className="px-4 py-4">
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
      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-600"
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
                isDone ? "bg-blue-600" : "bg-slate-200"
              }`}
            />
          );
        })}
      </div>
    )}
  </div>
</td>

                    <td className="px-4 py-4">
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

                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => navigate(`/orders/${order._id}/invoice`)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
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
    </AppLayout>
  );
};

export default Orders;