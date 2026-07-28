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
  Menu,
  X,
} from "lucide-react";

const AppLayout = ({ children, title, subtitle, headerAction }) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("shop_user"));

  const logout = () => {
    localStorage.removeItem("shop_token");
    localStorage.removeItem("shop_user");
    setMobileMenuOpen(false);
    navigate("/signin");
  };

  const navItems = [
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
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center gap-3 border-b px-6 py-5"
        style={{ borderColor: "var(--shop-border)" }}
      >
        <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-xl text-white">
          <Store size={26} />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">RM Trader</h2>
          <p className="text-xs font-semibold text-slate-500">
            Counter, stock and ledger
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
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
    <div className="shop-shell min-h-screen lg:flex">
      <aside className="shop-sidebar fixed inset-y-0 left-0 hidden w-72 border-r lg:block">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileMenuOpen(false)}
          />

          <aside className="shop-sidebar relative h-full w-[82vw] max-w-80 border-r">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                aria-label="Close menu"
                className="btn-muted p-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="min-h-screen flex-1 lg:ml-72">
        <header className="shop-header sticky top-0 z-30 border-b px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                className="btn-muted mt-0.5 p-2 lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-black text-slate-950">{title}</h1>
                {subtitle && (
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {headerAction && (
              <div className="w-full md:w-auto">{headerAction}</div>
            )}
          </div>
        </header>
        <main className="pb-24 p-4 sm:p-5 md:p-6 lg:pb-6">{children}</main>
      </div>

      <nav
        className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
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
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
