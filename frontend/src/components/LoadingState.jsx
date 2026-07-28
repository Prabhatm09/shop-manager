import { Hammer } from "lucide-react";

const LoadingState = ({ label = "Loading data..." }) => {
  return (
    <div className="construction-loader rounded-xl border border-dashed px-5 py-10 text-center">
      <div className="loader-house mx-auto">
        <div className="loader-roof" />
        <div className="loader-body">
          <div className="loader-door" />
          <div className="loader-window" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-[color:var(--shop-primary-strong)]">
        <Hammer className="loader-hammer" size={18} />
        <span className="h-1.5 w-12 overflow-hidden rounded-full bg-[color:var(--shop-border)]">
          <span className="loader-progress block h-full rounded-full bg-[color:var(--shop-primary)]" />
        </span>
      </div>

      <p className="mt-4 text-sm font-black text-slate-700">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        Preparing counter details
      </p>
    </div>
  );
};

export default LoadingState;
