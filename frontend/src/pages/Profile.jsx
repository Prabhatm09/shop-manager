import { useEffect, useState } from "react";
import { Eye, EyeOff, Image, KeyRound, Save, Store } from "lucide-react";
import API from "../api/axios";
import AppLayout from "../components/AppLayout";
import LoadingState from "../components/LoadingState";

const Profile = () => {
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    shopName: "",
    shopPhone: "",
    shopAddress: "",
    logoUrl: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setDataLoading(true);
        const res = await API.get("/auth/me");
        const user = res.data.user || {};

        setProfileForm({
          name: user.name || "",
          email: user.email || "",
          shopName: user.shopName || "",
          shopPhone: user.shopPhone || "",
          shopAddress: user.shopAddress || "",
          logoUrl: user.logoUrl || "",
        });
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Failed to load profile");
      } finally {
        setDataLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleProfileChange = (e) => {
    setProfileForm({
      ...profileForm,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({
      ...passwordForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setProfileLoading(true);

    try {
      const res = await API.put("/auth/profile", profileForm);
      localStorage.setItem("shop_user", JSON.stringify(res.data.user));
      setMessage("Profile updated");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Profile update failed");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError("Current password and new password are required");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setPasswordLoading(true);

    try {
      await API.put("/auth/change-password", passwordForm);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
      });
      setMessage("Password changed");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Password change failed");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <AppLayout
      title="Retailer Profile"
      subtitle="Manage shop details, bill identity and account password"
    >
      {message && (
        <div className="toast mb-5 px-4 py-3 text-sm font-semibold">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {dataLoading ? (
        <LoadingState label="Loading retailer profile..." />
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="metric-card p-5 sm:p-6">
            <div className="mb-6 flex items-start gap-4">
              <div className="brand-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white">
                <Store size={25} />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Shop Details
                </h2>
                <p className="text-sm font-medium text-slate-500">
                  This information is used as your shop identity.
                </p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="field-label">Shop Name</label>
                  <input
                    name="shopName"
                    value={profileForm.shopName}
                    onChange={handleProfileChange}
                    placeholder="Example: RM Trader"
                    className="form-control mt-2 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="field-label">Shop Phone</label>
                  <input
                    name="shopPhone"
                    value={profileForm.shopPhone}
                    onChange={handleProfileChange}
                    placeholder="Example: 9876543210"
                    className="form-control mt-2 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="field-label">Owner Name</label>
                  <input
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    placeholder="Example: Prabhat Mishra"
                    className="form-control mt-2 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="field-label">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={profileForm.email}
                    onChange={handleProfileChange}
                    placeholder="Example: shop@example.com"
                    className="form-control mt-2 px-4 py-3"
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Shop Address</label>
                <textarea
                  name="shopAddress"
                  value={profileForm.shopAddress}
                  onChange={handleProfileChange}
                  rows="3"
                  placeholder="Example: Main market, Lucknow, Uttar Pradesh"
                  className="form-control mt-2 resize-none px-4 py-3"
                />
              </div>

              <div>
                <label className="field-label">Logo URL</label>
                <input
                  name="logoUrl"
                  value={profileForm.logoUrl}
                  onChange={handleProfileChange}
                  placeholder="Example: https://example.com/logo.png"
                  className="form-control mt-2 px-4 py-3"
                />
              </div>

              <button
                disabled={profileLoading}
                className="btn-success w-full sm:w-auto"
              >
                <Save size={18} />
                {profileLoading ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </section>

          <div className="space-y-6">
            <section className="metric-card p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--shop-panel-2)] text-[color:var(--shop-primary-strong)]">
                  <Image size={22} />
                </div>
                <div>
                  <h2 className="font-black text-slate-900">Bill Preview</h2>
                  <p className="text-sm font-medium text-slate-500">
                    Current shop identity
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-[color:var(--shop-panel-2)] p-4">
                <div className="flex items-center gap-3">
                  {profileForm.logoUrl ? (
                    <img
                      src={profileForm.logoUrl}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="brand-mark flex h-14 w-14 items-center justify-center rounded-xl text-white">
                      <Store size={28} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-900">
                      {profileForm.shopName || "RM Trader"}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-500">
                      {profileForm.shopPhone || "Shop phone not set"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-600">
                  {profileForm.shopAddress || "Shop address not set"}
                </p>
              </div>
            </section>

            <section className="metric-card p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--shop-brick-soft)] text-red-700">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h2 className="font-black text-slate-900">Password</h2>
                  <p className="text-sm font-medium text-slate-500">
                    Change login password
                  </p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="field-label">Current Password</label>
                  <input
                    name="currentPassword"
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    type={showPasswords ? "text" : "password"}
                    placeholder="Enter current password"
                    className="form-control mt-2 px-4 py-3"
                  />
                </div>

                <div>
                  <label className="field-label">New Password</label>
                  <input
                    name="newPassword"
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    type={showPasswords ? "text" : "password"}
                    placeholder="Minimum 6 characters"
                    className="form-control mt-2 px-4 py-3"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswords((value) => !value)}
                  className="btn-muted w-full text-sm"
                >
                  {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                  {showPasswords ? "Hide Passwords" : "Show Passwords"}
                </button>

                <button
                  disabled={passwordLoading}
                  className="btn-primary w-full"
                >
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </section>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Profile;
