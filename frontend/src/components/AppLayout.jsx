import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  LogOut,
  Store,
  ShoppingCart,
  IndianRupee,
  Truck,
  X,
  UserRound,
  MoreHorizontal,
} from "lucide-react";

const AppLayout = ({ children, title, subtitle, headerAction }) => {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("shop_user"));
  const shopName = user?.shopName || "RM Trader";

  const logout = () => {
    localStorage.removeItem("shop_token");
    localStorage.removeItem("shop_user");
    setMoreOpen(false);
    navigate("/signin");
  };

  const desktopNavItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Products",
      path: "/products",
      icon: Package,
    },
    {
      label: "Customers",
      path: "/customers",
      icon: Users,
    },
    {
      label: "Orders",
      path: "/orders",
      icon: ShoppingCart,
    },
    {
      label: "Payments",
      path: "/payments",
      icon: IndianRupee,
    },
    {
      label: "Suppliers",
      path: "/suppliers",
      icon: Truck,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: UserRound,
    },
  ];

  const mobileNavItems = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Orders",
      path: "/orders",
      icon: ShoppingCart,
    },
    {
      label: "Customers",
      path: "/customers",
      icon: Users,
    },
    {
      label: "Products",
      path: "/products",
      icon: Package,
    },
  ];

  const moreItems = [
    {
      label: "Payments",
      path: "/payments",
      icon: IndianRupee,
    },
    {
      label: "Suppliers",
      path: "/suppliers",
      icon: Truck,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: UserRound,
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center gap-3 border-b px-6 py-5"
        style={{ borderColor: "var(--shop-border)" }}
      >
        {user?.logoUrl ? (
          <img
            src={user.logoUrl}
            alt=""
            className="h-12 w-12 rounded-xl object-cover"
          />
        ) : (
          <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-xl text-white">
            <Store size={26} />
          </div>
        )}

        <div>
          <h2 className="text-lg font-black text-slate-900">{shopName}</h2>
          <p className="text-xs font-semibold text-slate-500">
            Counter, stock and ledger
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {desktopNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link flex items-center gap-3 px-4 py-3 text-sm font-bold ${
                  isActive ? "nav-link-active" : "nav-link-idle"
                }`
              }
            >
              <Icon size={19} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div
        className="border-t p-4"
        style={{ borderColor: "var(--shop-border)" }}
      >
        <div className="surface-flat mb-3 p-3">
          <p className="text-sm font-bold text-slate-900">
            {user?.name || "User"}
          </p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>

        <button
          onClick={logout}
          className="btn-muted w-full text-sm hover:text-red-700"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="shop-shell min-h-screen lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="shop-sidebar hidden h-screen border-r lg:sticky lg:top-0 lg:block">
        {sidebarContent}
      </aside>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close more menu"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMoreOpen(false)}
          />

          <aside className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">More</p>
                <p className="text-xs font-semibold text-slate-500">
                  Payments, suppliers and settings
                </p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                className="btn-muted p-2"
                onClick={() => setMoreOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {moreItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-14 items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black ${
                        isActive
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-slate-200 bg-white text-slate-700"
                      }`
                    }
                  >
                    <Icon size={19} />
                    {item.label}
                  </NavLink>
                );
              })}
              <button
                type="button"
                onClick={logout}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
              >
                <LogOut size={19} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="min-w-0 min-h-screen">
        <header className="shop-header sticky top-0 z-30 border-b px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-black text-slate-950 sm:text-2xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm font-medium text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>

            {headerAction && (
              <div className="w-full md:w-auto">{headerAction}</div>
            )}
          </div>
        </header>
        <main className="p-4 pb-24 sm:p-5 md:p-6 lg:pb-6">{children}</main>
      </div>

      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `mobile-bottom-link flex flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-black ${
                    isActive
                      ? "mobile-bottom-link-active"
                      : "text-slate-500"
                  }`
                }
              >
                <Icon size={20} />
                <span className="leading-none">{item.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="mobile-bottom-link flex flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-black text-slate-500"
          >
            <MoreHorizontal size={20} />
            <span className="leading-none">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
