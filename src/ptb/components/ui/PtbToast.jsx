import React, { useEffect } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { cn } from "../../lib/theme";

export default function PtbToast({ message, type = "success", onDismiss, duration = 4000 }) {
  useEffect(() => {
    if (!message || !onDismiss) return undefined;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [message, onDismiss, duration]);

  if (!message) return null;

  const isError = type === "error";

  return (
    <div
      role="status"
      className={cn(
        "fixed left-1/2 z-[100] flex max-w-sm -translate-x-1/2 items-center gap-2.5 rounded-2xl border px-4 py-3 shadow-[0_16px_40px_rgba(16,24,40,0.12)] backdrop-blur-md",
        "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-8",
        isError
          ? "border-red-200/80 bg-white/95 text-red-800"
          : "border-[#F1E4EC] bg-white/95 text-[#172033]",
      )}
    >
      {isError ? (
        <XCircleIcon className="h-5 w-5 shrink-0 text-red-500" />
      ) : (
        <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-500" />
      )}
      <p className="text-[13px] font-semibold leading-snug">{message}</p>
    </div>
  );
}
