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
    <div className="min-h-screen bg-slate-100 lg:flex">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Store size={26} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">Shop Manager</h2>
              <p className="text-xs text-slate-500">Building material shop</p>
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
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-900">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen flex-1 lg:ml-72">
        <header className="border-b border-slate-200 bg-white px-6 py-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                </div>

                {headerAction && <div>{headerAction}</div>}
            </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;