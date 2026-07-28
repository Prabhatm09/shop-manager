import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  LogOut,
  Store,
  ShoppingCart,
  IndianRupee,
} from "lucide-react";

const AppLayout = ({ children, title, subtitle, headerAction }) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("shop_user"));

  const logout = () => {
    localStorage.removeItem("shop_token");
    localStorage.removeItem("shop_user");
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

  return (
    <div className="shop-shell min-h-screen lg:flex">
      <aside className="shop-sidebar fixed inset-y-0 left-0 hidden w-72 border-r lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b px-6 py-5" style={{ borderColor: "var(--shop-border)" }}>
            <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-xl text-white">
              <Store size={26} />
            </div>

             {/* <img
                src="/rmtrader.jpg"
                alt="RM Trader"
                className="h-full w-full object-cover"
            /> */}

            <div>
              <h2 className="text-lg font-black text-slate-900">RM Trader</h2>
              <p className="text-xs font-semibold text-slate-500">Counter, stock and ledger</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-5">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link flex items-center gap-3 px-4 py-3 text-sm font-bold ${
                      isActive
                        ? "nav-link-active"
                        : "nav-link-idle"
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t p-4" style={{ borderColor: "var(--shop-border)" }}>
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
      </aside>

      <div className="min-h-screen flex-1 lg:ml-72">
        <header className="shop-header sticky top-0 z-30 border-b px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                <h1 className="text-2xl font-black text-slate-950">{title}</h1>
                {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
                </div>

                {headerAction && <div>{headerAction}</div>}
            </div>
        </header>
        <main className="p-5 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
