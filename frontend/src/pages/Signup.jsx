import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Store } from "lucide-react";
import API from "../api/axios";

const Signup = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/signup", form);

      localStorage.setItem("shop_token", res.data.token);
      localStorage.setItem("shop_user", JSON.stringify(res.data.user));

      navigate("/dashboard");
    } catch (error) {
      setError(error.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex justify-center mb-5">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
            <Store size={32} />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-slate-900">
          Create Shop Account
        </h1>

        <p className="text-center text-slate-500 mt-2 mb-6">
          Manage products, orders and payments
        </p>

        {error && (
          <div className="mb-4 bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Full Name
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your name"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Email Address
            </label>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="Enter your email"
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Password
            </label>

            <div className="relative mt-2">
              <input
                name="password"
                value={form.password}
                onChange={handleChange}
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold disabled:opacity-70"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link to="/signin" className="text-blue-600 font-semibold">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;