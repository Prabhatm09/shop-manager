import { Search } from "lucide-react";

const currency = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const statusStyles = {
  paid: "bg-green-50 text-green-700 border-green-200",
  "full payment": "bg-green-50 text-green-700 border-green-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  "partial payment": "bg-amber-50 text-amber-700 border-amber-200",
  due: "bg-red-50 text-red-700 border-red-200",
  "no payment": "bg-red-50 text-red-700 border-red-200",
  advance: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  "in stock": "bg-green-50 text-green-700 border-green-200",
  "low stock": "bg-amber-50 text-amber-700 border-amber-200",
  "out of stock": "bg-red-50 text-red-700 border-red-200",
  godown: "bg-slate-100 text-slate-700 border-slate-300",
  outsource: "bg-purple-50 text-purple-700 border-purple-200",
  rental: "bg-amber-50 text-amber-700 border-amber-200",
  sale: "bg-slate-100 text-slate-700 border-slate-300",
};

export const AmountDisplay = ({ amount, tone = "default", className = "" }) => {
  const toneClass =
    tone === "success"
      ? "text-green-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
      ? "text-red-700"
      : tone === "primary"
      ? "text-slate-800"
      : "text-slate-950";

  return (
    <span className={`font-black tabular-nums ${toneClass} ${className}`}>
      {currency(amount)}
    </span>
  );
};

export const StatusBadge = ({ label, tone, className = "" }) => {
  const key = String(tone || label || "").toLowerCase();
  const style = statusStyles[key] || "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black capitalize leading-none ${style} ${className}`}
    >
      {label}
    </span>
  );
};

export const StatCard = ({ label, value, icon: Icon, tone = "primary" }) => {
  const iconClass =
    tone === "success"
      ? "bg-green-50 text-green-700 ring-green-100"
      : tone === "warning"
      ? "bg-amber-50 text-amber-700 ring-amber-100"
      : tone === "danger"
      ? "bg-red-50 text-red-700 ring-red-100"
      : "bg-amber-50 text-amber-700 ring-amber-100";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-white/70 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${iconClass}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
};

export const SearchInput = ({ value, onChange, placeholder = "Search..." }) => (
  <div className="relative">
    <Search
      size={18}
      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
    />
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="form-control py-3 pl-11 pr-4"
    />
  </div>
);

export const EmptyState = ({ icon: Icon, title, message, action }) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
    {Icon && (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
        <Icon size={24} />
      </div>
    )}
    <h3 className="mt-4 text-base font-black text-slate-950">{title}</h3>
    {message && (
      <p className="mx-auto mt-1 max-w-sm text-sm font-medium text-slate-500">
        {message}
      </p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const SectionPanel = ({ title, subtitle, action, children, className = "" }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {(title || action) && (
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          {title && <h2 className="text-lg font-black text-slate-950">{title}</h2>}
          {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

export const MobileListCard = ({ children, className = "" }) => (
  <article className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
    {children}
  </article>
);

export const BottomActionBar = ({ children }) => (
  <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-12px_28px_rgb(15_23_42_/_0.08)] lg:hidden">
    <div className="mx-auto flex max-w-3xl items-center gap-3">{children}</div>
  </div>
);
