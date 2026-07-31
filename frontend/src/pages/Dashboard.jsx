import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  IndianRupee,
  Package,
  ShoppingCart,
  Users,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import CreateOrderModal from "../components/CreateOrderModal";
import LoadingState from "../components/LoadingState";
import QuickSaleModal from "../components/QuickSaleModal";
import { AmountDisplay, EmptyState, SectionPanel, StatCard, StatusBadge } from "../components/pos";
import getBillNumber from "../utils/billNumber";


const Dashboard = () => {
  const navigate = useNavigate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  
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
    const [statsRes, returnsRes, ordersRes, customersRes, paymentsRes] = await Promise.all([
      API.get("/dashboard/stats"),
      API.get("/orders/returns/reminders"),
      API.get("/orders"),
      API.get("/customers"),
      API.get("/payments"),
    ]);

    setStats(statsRes.data);
    setReturnData(returnsRes.data);
    setOrders(ordersRes.data.orders || []);
    setCustomers(customersRes.data.customers || []);
    setPayments(paymentsRes.data.payments || []);
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
    label: "Today's Orders",
    value: 0,
    icon: ShoppingCart,
    tone: "primary",
  },
  {
    label: "Today's Sales",
    value: "₹0",
    icon: IndianRupee,
    tone: "success",
  },
  {
    label: "Customer Due",
    value: `₹${stats.totalDueAmount || 0}`,
    icon: WalletCards,
    tone: "danger",
  },
  {
    label: "Low Stock",
    value: stats.lowStockCount || 0,
    icon: AlertTriangle,
    tone: "warning",
  },
];

const dashboardData = useMemo(() => {
  const isToday = (date) =>
    new Date(date).toDateString() === new Date().toDateString();

  const todayOrders = orders.filter((order) => isToday(order.createdAt));
  const todaySales = todayOrders.reduce(
    (sum, order) => sum + Number(order.subTotal || 0),
    0
  );

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.paymentDate || b.createdAt) - new Date(a.paymentDate || a.createdAt))
    .slice(0, 5);

  const customerDueById = orders.reduce((map, order) => {
    const customerId =
      typeof order.customer === "object" ? order.customer?._id : order.customer;

    if (!customerId) return map;

    map.set(customerId, (map.get(customerId) || 0) + Number(order.dueAmount || 0));
    return map;
  }, new Map());

  const highDueCustomers = customers
    .map((customer) => ({
      ...customer,
      displayDue: Number(customer.openingDue || 0) + Number(customerDueById.get(customer._id) || 0),
    }))
    .filter((customer) => customer.displayDue > 0)
    .sort((a, b) => b.displayDue - a.displayDue)
    .slice(0, 5);

  return {
    todayOrders,
    todaySales,
    recentOrders,
    recentPayments,
    highDueCustomers,
  };
}, [orders, customers, payments]);

const summaryCards = [
  {
    ...cards[0],
    value: dashboardData.todayOrders.length,
  },
  {
    ...cards[1],
    value: `₹${dashboardData.todaySales.toLocaleString("en-IN")}`,
  },
  cards[2],
  cards[3],
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
      title="POS Dashboard"
      subtitle="Fast view of today’s billing, dues, stock and payments"
      headerAction={
    <div className="grid grid-cols-2 gap-3 md:flex md:items-center">
    <button
  onClick={() => setQuickSaleOpen(true)}
  className="btn-muted w-full md:w-auto"
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
      <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Shop Ledger Position
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Total sales <AmountDisplay amount={stats.totalSales} className="text-2xl" />
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Products</p>
              <p className="text-lg font-black text-slate-950">{stats.totalProducts}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">Customers</p>
              <p className="text-lg font-black text-slate-950">{stats.totalCustomers}</p>
            </div>
            <div className="rounded-xl bg-green-50 p-3">
              <p className="text-xs font-bold text-green-700">Received</p>
              <AmountDisplay amount={stats.totalPaid} tone="success" />
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-xs font-bold text-red-700">Due</p>
              <AmountDisplay amount={stats.totalDueAmount} tone="danger" />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <SectionPanel
            title="Recent Orders"
            subtitle="Latest counter bills"
            action={
              <button
                type="button"
                onClick={() => navigate("/orders")}
                className="btn-muted text-sm"
              >
                View Orders
                <ArrowRight size={16} />
              </button>
            }
          >
            {dashboardData.recentOrders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No orders yet"
                message="Create a sale bill to start today’s counter flow."
              />
            ) : (
              <div className="space-y-3">
                {dashboardData.recentOrders.map((order) => (
                  <button
                    key={order._id}
                    type="button"
                    onClick={() => navigate(`/orders/${order._id}/invoice`)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-black text-slate-950">
                          {getBillNumber(order)}
                        </p>
                        <StatusBadge
                          label={order.paymentStatus}
                          tone={order.paymentStatus}
                        />
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-600">
                        {order.customerName} · {order.items?.length || 0} items
                      </p>
                    </div>
                    <div className="text-right">
                      <AmountDisplay amount={order.subTotal} />
                      {Number(order.dueAmount || 0) > 0 && (
                        <p className="mt-1 text-xs font-black text-red-700">
                          Due ₹{order.dueAmount}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionPanel>

          <SectionPanel title="Low Stock Products" subtitle="Restock before billing slows down">
            {stats.lowStockProducts?.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Inventory looks good"
                message="No low-stock products right now."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {stats.lowStockProducts.map((product) => (
                  <div key={product._id} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-950">{product.name}</h3>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-600">
                          {product.category} · {product.unit}
                        </p>
                      </div>
                      <StatusBadge label="Low Stock" tone="low stock" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs font-bold text-amber-700">Stock</p>
                        <p className="font-black text-slate-950">
                          {product.currentStock} {product.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500">Alert</p>
                        <p className="font-black text-slate-950">
                          {product.lowStockAlert} {product.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>

        <div className="space-y-5">
          <SectionPanel title="High Due Customers" subtitle="Largest pending customer balances">
            {dashboardData.highDueCustomers.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No customer due"
                message="Customer ledger is clear."
              />
            ) : (
              <div className="space-y-3">
                {dashboardData.highDueCustomers.map((customer) => (
                  <button
                    key={customer._id}
                    type="button"
                    onClick={() => navigate(`/customers/${customer._id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950">{customer.name}</p>
                      <p className="text-sm font-semibold text-slate-500">{customer.phone}</p>
                    </div>
                    <AmountDisplay amount={customer.displayDue} tone="danger" />
                  </button>
                ))}
              </div>
            )}
          </SectionPanel>

          <SectionPanel title="Payment Activity" subtitle="Recent collections">
            {dashboardData.recentPayments.length === 0 ? (
              <EmptyState
                icon={WalletCards}
                title="No payments"
                message="Collections will appear here."
              />
            ) : (
              <div className="space-y-3">
                {dashboardData.recentPayments.map((payment) => (
                  <div key={payment._id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{payment.customerName}</p>
                        <p className="mt-1 text-xs font-semibold capitalize text-slate-500">
                          {payment.paymentMode} ·{" "}
                          {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <AmountDisplay amount={payment.amount} tone="success" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionPanel>
        </div>
      </div>

<div className="surface mt-6 p-6">
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
                        : "bg-slate-100 text-slate-700"
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
