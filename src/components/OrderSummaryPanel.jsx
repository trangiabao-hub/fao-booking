import React from "react";
import { buildOrderSummaryFields } from "../utils/orderSummary";

/**
 * Khối tóm tắt đơn — dễ quét (label trên, value dưới).
 * Dùng ở bước xác nhận, sau thanh toán và trang tra cứu đơn.
 */
export default function OrderSummaryPanel({
  details,
  title = "📋 Tóm tắt đơn hàng",
  subtitle,
  className = "",
  compact = false,
}) {
  const fields = buildOrderSummaryFields(details);
  if (fields.length === 0) return null;

  return (
    <section
      className={`rounded-2xl border border-pink-200/90 bg-white text-left shadow-sm ${className}`}
      aria-label="Tóm tắt đơn hàng"
    >
      <div
        className={`border-b border-pink-100/80 ${compact ? "px-3.5 py-2.5" : "px-4 py-3 sm:px-5 sm:py-3.5"}`}
      >
        <h2
          className={`font-black text-pink-900 tracking-tight ${compact ? "text-sm" : "text-sm sm:text-base"}`}
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{subtitle}</p>
        ) : null}
      </div>

      <dl
        className={`grid gap-x-4 gap-y-3 sm:grid-cols-2 ${compact ? "p-3.5" : "p-4 sm:p-5"}`}
      >
        {fields.map((field) => (
          <div
            key={field.id}
            className={field.fullWidth ? "sm:col-span-2" : ""}
          >
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {field.label}
            </dt>
            <dd
              className={`mt-0.5 leading-snug break-words ${
                compact ? "text-[13px]" : "text-sm sm:text-[15px]"
              } ${
                field.highlight
                  ? "font-bold text-pink-900"
                  : "font-semibold text-slate-900"
              } ${field.mono ? "font-mono tabular-nums" : ""}`}
            >
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
