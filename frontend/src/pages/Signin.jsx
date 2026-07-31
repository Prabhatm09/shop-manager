import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Boxes, Eye, EyeOff, ReceiptText, Store, WalletCards } from "lucide-react";
import API from "../api/axios";

const Signin = () => {
  const navigate = useNavigate();
  const savedUser = JSON.parse(localStorage.getItem("shop_user") || "{}");
  const shopName = savedUser?.shopName || "Shop Ledger";
  const logoUrl = savedUser?.logoUrl || "";

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/signin", form);

      localStorage.setItem("shop_token", res.data.token);
      localStorage.setItem("shop_user", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Signin failed");
    } finally {
      setLoading(false);
    }
  };

  const cycleItems = [
    {
      label: "Billing",
      icon: ReceiptText,
    },
    {
      label: "Stock",
      icon: Boxes,
    },
    {
      label: "Ledger",
      icon: WalletCards,
    },
  ];

  return (
    <div className="shop-shell flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-[27rem]">
        <div className="modal-panel overflow-hidden">
          <div className="px-5 pb-5 pt-7 sm:px-8 sm:pt-8">
            <div className="mb-6 flex justify-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="h-16 w-16 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div className="brand-mark flex h-16 w-16 items-center justify-center rounded-2xl text-white">
                  <Store size={34} />
                </div>
              )}
            </div>

            <h1 className="text-center text-3xl font-black text-slate-950">
              {shopName}
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-center text-sm font-semibold leading-6 text-slate-500">
              Sign in to manage your shop billing, stock and customer payment cycle.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {cycleItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="rounded-xl bg-[color:var(--shop-panel-2)] px-2 py-3 text-center"
                  >
                    <Icon
                      size={18}
                      className="mx-auto text-[color:var(--shop-primary-strong)]"
                    />
                    <p className="mt-1 text-xs font-black text-slate-700">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSignin} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email Address
                </label>

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter registered email"
                  className="form-control px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter account password"
                    className="form-control px-4 py-3 pr-12"
                  />

                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link
                to="/forgot-password"
                className="text-sm font-bold text-[color:var(--shop-primary)]"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <p className="border-t px-5 py-4 text-center text-sm font-semibold text-slate-500 sm:px-8" style={{ borderColor: "var(--shop-border)" }}>
            New user?{" "}
            <Link to="/signup" className="font-semibold text-[color:var(--shop-primary)]">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signin;
