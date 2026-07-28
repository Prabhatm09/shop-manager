import { useState } from "react";
import { Link } from "react-router-dom";
import { Store } from "lucide-react";
import API from "../api/axios";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setResetUrl("");

    try {
      const res = await API.post("/auth/forgot-password", { email });
      setMessage(res.data.message || "Password reset link generated");
      setResetUrl(res.data.resetUrl || "");
    } catch (error) {
      setMessage(error.response?.data?.message || "Password reset request failed");
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
          Reset Password
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Enter your account email to generate a reset link.
        </p>

        {message && (
          <div className="toast mt-5 px-4 py-3 text-sm font-semibold">
            {message}
          </div>
        )}

        {resetUrl && (
          <Link
            to={new URL(resetUrl).pathname}
            className="btn-muted mt-4 block w-full text-center text-sm text-green-700"
          >
            Open Reset Link
          </Link>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="form-control px-4 py-3"
            />
          </div>

          <button
            disabled={loading || !email}
            className="btn-primary w-full py-3"
          >
            {loading ? "Generating..." : "Generate Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Remember password?{" "}
          <Link to="/signin" className="font-semibold text-[color:var(--shop-primary)]">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
