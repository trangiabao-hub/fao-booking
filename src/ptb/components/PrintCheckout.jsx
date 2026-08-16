import React, { useMemo, useState } from "react";
import { PrinterIcon } from "@heroicons/react/24/solid";
import { FREE_PRINT_QUOTA } from "../lib/constants";
import { resolveMediaUrl } from "../lib/frameUtils";
import { buildPtbPrintNote } from "../lib/printOptions";
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
  printBw: printBwProp,
  printNoCrop: printNoCropProp,
  onPrintBwChange,
  onPrintNoCropChange,
}) {
  const [selected, setSelected] = useState(() => new Set());
  const [message, setMessage] = useState("");
  const [printBwInternal, setPrintBwInternal] = useState(false);
  const [printNoCropInternal, setPrintNoCropInternal] = useState(false);
  const printBw = printBwProp ?? printBwInternal;
  const printNoCrop = printNoCropProp ?? printNoCropInternal;
  const setPrintBw = (v) => {
    if (printBwProp === undefined) setPrintBwInternal(v);
    onPrintBwChange?.(v);
  };
  const setPrintNoCrop = (v) => {
    if (printNoCropProp === undefined) setPrintNoCropInternal(v);
    onPrintNoCropChange?.(v);
  };

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
        note: buildPtbPrintNote({ printBw, printNoCrop }),
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

  const printOptions = (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#F1E4EC] bg-white px-3 py-2.5">
      <label className="flex items-center gap-2 text-[13px] font-semibold text-[#344054]">
        <input
          type="checkbox"
          className="accent-[#E6007E]"
          checked={printBw}
          disabled={disabled}
          onChange={(e) => setPrintBw(e.target.checked)}
        />
        In ảnh trắng đen
      </label>
      <label className="flex items-center gap-2 text-[13px] font-semibold text-[#344054]">
        <input
          type="checkbox"
          className="accent-[#E6007E]"
          checked={printNoCrop}
          disabled={disabled}
          onChange={(e) => setPrintNoCrop(e.target.checked)}
        />
        In không cắt
      </label>
    </div>
  );

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

      {printOptions}

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
