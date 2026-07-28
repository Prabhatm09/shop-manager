import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, Store } from "lucide-react";
import API from "../api/axios";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await API.post(`/auth/reset-password/${token}`, { password });
      setSuccess(true);
      setMessage(res.data.message || "Password reset successful");

      setTimeout(() => {
        navigate("/signin");
      }, 900);
    } catch (error) {
      setMessage(error.response?.data?.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shop-shell flex min-h-screen items-center justify-center px-4">
      <div className="modal-panel w-full max-w-md p-8">
        <div className="mb-5 flex justify-center">
          <div className="brand-mark flex h-16 w-16 items-center justify-center rounded-xl text-white">
            <Store size={32} />
          </div>
        </div>

        <h1 className="text-center text-2xl font-bold text-slate-900">
          Create New Password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Use at least 6 characters.
        </p>

        {message && (
          <div
            className={`mt-5 rounded-xl px-4 py-3 text-sm font-semibold ${
              success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
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
            disabled={loading || password.length < 6}
            className="btn-primary w-full py-3"
          >
            {loading ? "Saving..." : "Reset Password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Back to{" "}
          <Link to="/signin" className="font-semibold text-[color:var(--shop-primary)]">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
