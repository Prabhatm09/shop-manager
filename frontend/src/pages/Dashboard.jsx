import { useEffect, useState } from "react";
import { IndianRupee, Package, ShoppingCart, Users } from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import CreateOrderModal from "../components/CreateOrderModal";
import LoadingState from "../components/LoadingState";
import QuickSaleModal from "../components/QuickSaleModal";


const Dashboard = () => {

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
  totalProducts: 0,
  totalCustomers: 0,
  totalOrders: 0,
  totalSales: 0,
  totalPaid: 0,
  totalDueAmount: 0,
  lowStockCount: 0,
  lowStockProducts: [],
});

const [returnData, setReturnData] = useState({
  totalPendingReturns: 0,
  dueTodayCount: 0,
  overdueCount: 0,
  upcomingCount: 0,
  reminders: [],
});

const fetchStats = async () => {
  try {
    setLoading(true);
    const [statsRes, returnsRes] = await Promise.all([
      API.get("/dashboard/stats"),
      API.get("/orders/returns/reminders"),
    ]);

    setStats(statsRes.data);
    setReturnData(returnsRes.data);
  } catch (error) {
    console.log(error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = [
  {
    label: "Products",
    value: stats.totalProducts,
    icon: Package,
    color: "text-[color:var(--shop-info)]",
    metricColor: "var(--shop-info)",
  },
  {
    label: "Customers",
    value: stats.totalCustomers,
    icon: Users,
    color: "text-[color:var(--shop-primary)]",
    metricColor: "var(--shop-primary)",
  },
  {
    label: "Orders",
    value: stats.totalOrders,
    icon: ShoppingCart,
    color: "text-[color:var(--shop-brick)]",
    metricColor: "var(--shop-brick)",
  },
  {
    label: "Total Sales",
    value: `₹${stats.totalSales || 0}`,
    icon: IndianRupee,
    color: "text-[color:var(--shop-info)]",
    metricColor: "var(--shop-info)",
  },
  {
    label: "Total Paid",
    value: `₹${stats.totalPaid || 0}`,
    icon: IndianRupee,
    color: "text-[color:var(--shop-primary)]",
    metricColor: "var(--shop-primary)",
  },
  {
    label: "Total Due",
    value: `₹${stats.totalDueAmount || 0}`,
    icon: IndianRupee,
    color: "text-[color:var(--shop-brick)]",
    metricColor: "var(--shop-brick)",
  },
  {
    label: "Low Stock",
    value: stats.lowStockCount || 0,
    icon: Package,
    color: "text-[color:var(--shop-brick)]",
    metricColor: "var(--shop-brick)",
   },
];

const handleMarkReturned = async (orderId) => {
  const confirmReturn = window.confirm("Mark this rental order as returned?");
  if (!confirmReturn) return;

  try {
    await API.patch(`/orders/${orderId}/mark-returned`, {
      returnedDate: new Date(),
      addLateCharge: true,
    });

    fetchStats();
  } catch (error) {
    alert(error.response?.data?.message || "Failed to mark returned");
  }
};

  return (
  <AppLayout
      title="Dashboard"
      subtitle="Money, stock and returns at counter speed"
      headerAction={
    <div className="flex items-center gap-3">
    <button
  onClick={() => setQuickSaleOpen(true)}
  className="btn-success w-full md:w-auto"
>
  + Quick Sale
</button>
   <button
      onClick={() => setIsCreateModalOpen(true)}
      className="btn-primary w-full md:w-auto"
    >
      + Create Order
    </button>
    </div>
 
  }
    >
      {loading ? (
        <LoadingState label="Loading shop dashboard..." />
      ) : (
        <>
        
      <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.9fr]">
        <div className="bill-panel p-6">
          <p className="text-sm font-bold text-slate-300">Ledger Position</p>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Sales</p>
              <h2 className="mt-1 text-3xl font-black">₹{stats.totalSales || 0}</h2>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Received</p>
              <h2 className="mt-1 text-3xl font-black text-green-200">₹{stats.totalPaid || 0}</h2>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Due</p>
              <h2 className="mt-1 text-3xl font-black text-orange-200">₹{stats.totalDueAmount || 0}</h2>
            </div>
          </div>
        </div>

        <div className="surface p-6">
          <p className="text-sm font-bold text-slate-500">Today’s Attention</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-[color:var(--shop-brick-soft)] p-4">
              <p className="text-xs font-bold text-red-700">Low Stock</p>
              <h3 className="mt-1 text-2xl font-black text-red-800">{stats.lowStockCount || 0}</h3>
            </div>
            <div className="rounded-xl bg-[color:var(--shop-sand-soft)] p-4">
              <p className="text-xs font-bold text-yellow-800">Due Today</p>
              <h3 className="mt-1 text-2xl font-black text-yellow-900">{returnData.dueTodayCount}</h3>
            </div>
            <div className="rounded-xl bg-[color:var(--shop-info-soft)] p-4">
              <p className="text-xs font-bold text-blue-800">Pending Returns</p>
              <h3 className="mt-1 text-2xl font-black text-blue-900">
                {returnData.totalPendingReturns}
              </h3>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.label}
              className="metric-card p-6"
              style={{ "--metric-color": card.metricColor }}
            >
              <Icon className={card.color} size={30} />

              <p className="mt-4 text-sm font-medium text-slate-500">
                {card.label}
              </p>

              <h2 className="mt-1 text-3xl font-black text-slate-950">
                {card.value}
              </h2>
            </div>
          );
        })}
      </div>

      <div className="surface mt-8 p-6">
         <div className="mb-5 flex items-center justify-between">
            <div>
            <h2 className="text-lg font-bold text-slate-900">Low Stock Alerts</h2>
            <p className="text-sm text-slate-500">
                Products that need restocking soon
            </p>
            </div>
        </div>

        {stats.lowStockProducts?.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
            No low stock products. Inventory looks good.
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stats.lowStockProducts.map((product) => (
                <div
                key={product._id}
                className="surface-flat bg-[color:var(--shop-brick-soft)] p-4"
                >
                <h3 className="font-bold text-slate-900">{product.name}</h3>

                <p className="mt-1 text-sm capitalize text-slate-500">
                    {product.category} / {product.unit}
                </p>

                <div className="mt-4 flex items-center justify-between">
                    <div>
                    <p className="text-xs text-red-600">Current Stock</p>
                    <p className="text-xl font-bold text-red-700">
                        {product.currentStock} {product.unit}
                    </p>
                    </div>

                    <div className="text-right">
                    <p className="text-xs text-slate-500">Alert Level</p>
                    <p className="font-bold text-slate-900">
                        {product.lowStockAlert} {product.unit}
                    </p>
                    </div>
                </div>
                </div>
            ))}
            </div>
        )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
  <div className="surface-flat bg-[color:var(--shop-brick-soft)] p-5">
    <p className="text-sm font-semibold text-red-600">Overdue Returns</p>
    <h2 className="mt-2 text-3xl font-bold text-red-700">
      {returnData.overdueCount}
    </h2>
  </div>

  <div className="surface-flat bg-[color:var(--shop-sand-soft)] p-5">
    <p className="text-sm font-semibold text-yellow-700">Due Today</p>
    <h2 className="mt-2 text-3xl font-bold text-yellow-700">
      {returnData.dueTodayCount}
    </h2>
  </div>

  <div className="surface-flat bg-[color:var(--shop-info-soft)] p-5">
    <p className="text-sm font-semibold text-blue-700">Pending Returns</p>
    <h2 className="mt-2 text-3xl font-bold text-blue-700">
      {returnData.totalPendingReturns}
    </h2>
  </div>
</div>

<div className="surface mt-8 p-6">
  <div className="mb-5">
    <h2 className="text-lg font-bold text-slate-900">Return Reminders</h2>
    <p className="text-sm text-slate-500">
      Rental items that should come back from customers
    </p>
  </div>

  {returnData.reminders.length === 0 ? (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
      No pending rental returns.
    </div>
  ) : (
    <div className="space-y-4">
      {returnData.reminders.map((item) => {
        const isLate = item.overdueDays > 0;
        const isDueToday =
          new Date(item.rentalEndDate).toDateString() ===
          new Date().toDateString();

        return (
          <div
            key={item._id}
            className={`rounded-2xl border p-5 ${
              isLate
                ? "border-red-200 bg-red-50"
                : isDueToday
                ? "border-yellow-200 bg-yellow-50"
                : "border-[color:var(--shop-border)] bg-[color:var(--shop-panel)]"
            }`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {item.customerName}
                  </h3>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                      isLate
                        ? "bg-red-100 text-red-700"
                        : isDueToday
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {isLate
                      ? `Overdue ${item.overdueDays} days`
                      : isDueToday
                      ? "Due Today"
                      : "Upcoming"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {item.customerPhone}
                </p>

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Return Date:{" "}
                  {new Date(item.rentalEndDate).toLocaleDateString()}
                </p>

                <div className="mt-4 space-y-2">
                  {item.items.map((orderItem, index) => (
                    <div
                      key={index}
                      className="flex flex-wrap items-center gap-2 text-sm"
                    >
                      <span className="font-semibold text-slate-900">
                        {orderItem.productName}
                      </span>
                      <span className="text-slate-500">
                        × {orderItem.quantity} {orderItem.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface-flat p-4 lg:min-w-[220px]">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Due Amount</span>
                  <span className="font-bold text-slate-900">
                    ₹{item.dueAmount}
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">Late Charge</span>
                  <span className="font-bold text-red-700">
                    ₹{item.runningLateCharge || 0}
                  </span>
                </div>

                <button
                  onClick={() => handleMarkReturned(item._id)}
                  className="btn-success mt-4 w-full text-sm"
                >
                  Mark Returned
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
        </>
      )}
<CreateOrderModal
  open={isCreateModalOpen}
  onClose={() => setIsCreateModalOpen(false)}
/>
<QuickSaleModal
  open={quickSaleOpen}
  onClose={() => setQuickSaleOpen(false)}
/>
    </AppLayout>
  );
};

export default Dashboard;
