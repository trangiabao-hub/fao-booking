import React, { useMemo, useState } from "react";
import { PrinterIcon } from "@heroicons/react/24/solid";
import { FREE_PRINT_QUOTA } from "../lib/constants";
import { resolveMediaUrl } from "../lib/frameUtils";
import EmptyState from "./ui/EmptyState";
import { cn, ptb } from "../lib/theme";

function countPrintSplit(selectedCount, freeRemaining) {
  const freeUsed = Math.min(selectedCount, Math.max(0, freeRemaining));
  return { freeUsed, extraCount: Math.max(0, selectedCount - freeUsed) };
}

export default function PrintCheckout({
  images = [],
  freeRemaining,
  disabled,
  onSubmit,
  submitting,
  onToast,
}) {
  const [selected, setSelected] = useState(() => new Set());
  const [message, setMessage] = useState("");

  const selectedIds = useMemo(() => [...selected], [selected]);
  const split = countPrintSplit(selectedIds.length, freeRemaining);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedIds.length) return;
    setMessage("");
    try {
      await onSubmit({
        imageIds: selectedIds,
        paymentMethod: split.extraCount > 0 ? "PAY_AT_STORE" : "FREE_ONLY",
      });
      setSelected(new Set());
      const msg = "Đã gửi yêu cầu in. Shop sẽ in và giao khi bạn trả máy.";
      setMessage(msg);
      onToast?.(msg);
    } catch (err) {
      const errMsg = err?.message || "Không gửi được yêu cầu in";
      setMessage(errMsg);
      onToast?.(errMsg, "error");
    }
  };

  if (!images.length) {
    return (
      <EmptyState
        title="Chưa có strip nào"
        description="Hãy ghép ảnh và lưu vào album trước khi đặt in."
      />
    );
  }

  const checkoutSidebar = (
    <>
      {selectedIds.length > 0 ? (
        <div className="rounded-2xl border border-[#FCE7F3] bg-[#FFF1F8] px-4 py-3 text-[13px] text-[#172033]">
          <p className="font-medium">
            {split.freeUsed > 0 ? `${split.freeUsed} ảnh miễn phí` : null}
            {split.freeUsed > 0 && split.extraCount > 0 ? " · " : null}
            {split.extraCount > 0 ? `${split.extraCount} in thêm` : null}
          </p>
          {split.extraCount === 0 ? (
            <p className="mt-1 text-[15px] font-bold text-emerald-700">
              Trong quota miễn phí
            </p>
          ) : null}
        </div>
      ) : (
        <p
          className={cn(
            ptb.textBody,
            "rounded-xl border border-dashed border-[#F1E4EC] px-3 py-4 text-center text-[12px]",
          )}
        >
          Chọn ít nhất 1 strip bên trái để đặt in
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={disabled || !selectedIds.length || submitting}
          onClick={handleSubmit}
          className={cn(ptb.btnPrimary)}
        >
          <PrinterIcon className="h-5 w-5" />
          {submitting ? "Đang gửi…" : "Đặt in"}
        </button>
      </div>

      {message ? (
        <p className="text-center text-[13px] font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}
    </>
  );

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <header>
          <h2 className={ptb.textSection}>Đặt in strip</h2>
          <p className={cn(ptb.textBody, "mt-1")}>
            Chọn strip cần in (5×15 cm)
          </p>
          <p className="mt-2 text-[12px] font-semibold text-emerald-700">
            Ảnh in miễn phí: {freeRemaining} / {FREE_PRINT_QUOTA}
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
          {images.map((img) => {
            const active = selected.has(img.id);
            return (
              <button
                key={img.id}
                type="button"
                disabled={disabled}
                onClick={() => toggle(img.id)}
                className={cn(
                  "overflow-hidden rounded-2xl border-2 bg-white p-1.5 transition-all duration-200",
                  active
                    ? "border-[#E6007E] shadow-[0_8px_24px_rgba(230,0,126,0.15)] ring-2 ring-[#FCE7F3]"
                    : "border-[#EEF2F6] hover:border-[#F3D4E4] hover:shadow-md",
                )}
              >
                <img
                  src={resolveMediaUrl(img.imageUrl || img.thumbUrl)}
                  alt=""
                  className="aspect-[5/15] w-full rounded-xl object-cover"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>

        <div className="space-y-5 lg:hidden">{checkoutSidebar}</div>
      </div>

      <aside className="hidden lg:sticky lg:top-4 lg:block lg:space-y-4">
        {checkoutSidebar}
      </aside>
    </div>
  );
}
