import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Trash2 } from "lucide-react";
import { BRANCHES } from "../../data/bookingConstants";
import { computeAvailabilityRange } from "../BookingPrefsForm";
import { formatPickupReturnRangeVi } from "../../utils/catalogDatetime";
import { FALLBACK_IMG } from "../../constants/catalog";

function summarizeNames(names = []) {
  const counts = new Map();
  for (const n of names.filter(Boolean)) counts.set(n, (counts.get(n) || 0) + 1);
  const parts = [...counts].map(([n, q]) => (q > 1 ? `${n} × ${q}` : n));
  if (parts.length <= 2) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2} máy`;
}

/** Gợi ý mở lại đơn đặt dở (nháp do QuickBookModal tự lưu). */
export default function BookingDraftBanner({ draft, onResume, onDismiss }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const schedule = useMemo(() => {
    const { fromDateTime, toDateTime } = computeAvailabilityRange(draft);
    return fromDateTime && toDateTime
      ? formatPickupReturnRangeVi(fromDateTime, toDateTime)
      : "";
  }, [draft]);

  const branch = (BRANCHES.find((b) => b.id === draft.branchId)?.label || "")
    .replace(/^FAO\s*/i, "")
    .trim();
  const qty = Math.max(draft.sameModelQuantity || 1, 1);
  const names = summarizeNames(draft.names);
  const title = qty > 1 && draft.names?.length === 1 ? `${names} × ${qty}` : names;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 flex items-center gap-3 rounded-2xl border border-[#ffd3e7] bg-gradient-to-r from-[#fff4f9] to-white p-3 shadow-[0_4px_16px_rgba(232,92,156,0.08)] sm:p-3.5"
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.05]">
        <img
          src={draft.img || FALLBACK_IMG}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = FALLBACK_IMG;
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[10.5px] font-bold uppercase tracking-[0.08em] ${
            confirmingDelete ? "text-rose-600" : "text-[#E85C9C]"
          }`}
        >
          {confirmingDelete ? "Xoá đơn nháp này?" : "Bạn có đơn đang đặt dở"}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[13.5px] font-bold text-[#1f1f1f]">
          {title}
        </p>
        <p className="line-clamp-1 text-[12px] text-[#77716c]">
          {[schedule, branch].filter(Boolean).join(" · ")}
        </p>
      </div>

      {confirmingDelete ? (
        <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-rose-700 active:scale-[0.98]"
          >
            <Trash2 size={13} strokeWidth={2.5} />
            Xoá nháp
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className="rounded-xl px-3 py-1.5 text-[12px] font-semibold text-[#77716c] transition-colors hover:bg-black/[0.04]"
          >
            Giữ lại
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-[#E85C9C] px-3 py-2 text-[12.5px] font-bold text-white shadow-[0_6px_14px_rgba(232,92,156,0.28)] transition-colors hover:bg-[#d94d8a] active:scale-[0.98]"
          >
            Đặt tiếp
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-[#a3a09d] transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <Trash2 size={12} />
            Xoá
          </button>
        </div>
      )}
    </motion.div>
  );
}
