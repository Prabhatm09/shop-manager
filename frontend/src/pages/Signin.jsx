import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Store } from "lucide-react";
import API from "../api/axios";

const Signin = () => {
  const navigate = useNavigate();

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

  return (
    <div className="shop-shell min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="modal-panel p-8">
          <div className="flex justify-center mb-6">
            <div className="brand-mark h-16 w-16 rounded-xl text-white flex items-center justify-center">
              <Store size={34} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-slate-900">
            Welcome Back
          </h1>

          <p className="text-center text-slate-500 mt-2 mb-8">
            Sign in to manage your shop
          </p>

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSignin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>

              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="form-control px-4 py-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>

              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="form-control px-4 py-3 pr-12"
                />

                <button
                  type="button"
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
            <Link to="/forgot-password" className="text-sm font-semibold text-[color:var(--shop-primary)]">
              Forgot password?
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
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
