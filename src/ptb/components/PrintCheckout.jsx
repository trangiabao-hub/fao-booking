import React, { useMemo, useState } from "react";
import { PrinterIcon } from "@heroicons/react/24/solid";
import {
  DUPLICATE_COPY_PRICE_VND,
  FREE_PRINT_QUOTA,
  LAMINATION_PRICE_VND,
  PAID_PRINT_PRICE_VND,
} from "../lib/constants";
import { resolveMediaUrl } from "../lib/frameUtils";
import { createPrintPaymentLink } from "../api/ptbApi";
import EmptyState from "./ui/EmptyState";
import { cn, ptb } from "../lib/theme";

function computePricing(selectedCount, freeRemaining, { duplicateCopy, lamination }) {
  let freeUsed = 0;
  let paidCount = 0;
  let subtotal = 0;

  for (let i = 0; i < selectedCount; i++) {
    if (freeUsed < freeRemaining) {
      freeUsed++;
    } else {
      paidCount++;
      subtotal += PAID_PRINT_PRICE_VND;
    }
  }

  if (duplicateCopy && selectedCount > 0) {
    subtotal += DUPLICATE_COPY_PRICE_VND * selectedCount;
  }
  if (lamination && selectedCount > 0) {
    subtotal += LAMINATION_PRICE_VND * selectedCount;
  }

  return { freeUsed, paidCount, subtotal };
}

export default function PrintCheckout({
  images = [],
  freeRemaining,
  disabled,
  shareToken,
  onSubmit,
  submitting,
  onToast,
}) {
  const [selected, setSelected] = useState(() => new Set());
  const [duplicateCopy, setDuplicateCopy] = useState(false);
  const [lamination, setLamination] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);
  const [message, setMessage] = useState("");

  const selectedIds = useMemo(() => [...selected], [selected]);
  const pricing = computePricing(selectedIds.length, freeRemaining, {
    duplicateCopy,
    lamination,
  });

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildNote = () => {
    const parts = [];
    if (duplicateCopy) parts.push("Bản sao thứ 2");
    if (lamination) parts.push("Cán bóng/mờ");
    return parts.length ? parts.join(" · ") : undefined;
  };

  const handleSubmit = async (paymentMethod) => {
    if (!selectedIds.length) return;
    setMessage("");
    try {
      const result = await onSubmit({
        imageIds: selectedIds,
        paymentMethod,
        note: buildNote(),
      });
      setSelected(new Set());
      const msg =
        pricing.paidCount > 0 && paymentMethod === "PAY_AT_STORE"
          ? `Đã gửi yêu cầu in. Thanh toán ${pricing.subtotal.toLocaleString("vi-VN")}đ tại shop.`
          : "Đã gửi yêu cầu in. Shop sẽ in và giao khi bạn trả máy.";
      setMessage(msg);
      onToast?.(msg);
      return result;
    } catch (err) {
      const errMsg = err?.message || "Không gửi được yêu cầu in";
      setMessage(errMsg);
      onToast?.(errMsg, "error");
    }
  };

  const handlePayOnline = async () => {
    if (!selectedIds.length || pricing.subtotal <= 0) return;
    setPayingOnline(true);
    setMessage("");
    try {
      const printReq = await onSubmit({
        imageIds: selectedIds,
        paymentMethod: "ONLINE",
        note: buildNote(),
      });
      const origin = window.location.origin;
      const pay = await createPrintPaymentLink(printReq.id, {
        amount: pricing.subtotal,
        returnSuccessUrl: `${origin}/trip/${shareToken}?pay=success`,
        returnFailUrl: `${origin}/trip/${shareToken}?pay=fail`,
      });
      if (pay?.checkoutUrl) {
        window.location.href = pay.checkoutUrl;
        return;
      }
      throw new Error("Không tạo được link thanh toán");
    } catch (err) {
      const errMsg =
        err?.response?.data?.detail || err?.message || "Thanh toán online thất bại";
      setMessage(errMsg);
      onToast?.(errMsg, "error");
    } finally {
      setPayingOnline(false);
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
      <div className="space-y-3 rounded-2xl border border-[#F1E4EC] bg-[#FFF9FC] p-4">
        <p className={cn(ptb.textCaption, "normal-case tracking-normal text-[#172033]")}>
          Tùy chọn thêm
        </p>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[13px] font-medium text-[#172033]">
          <input
            type="checkbox"
            checked={duplicateCopy}
            onChange={(e) => setDuplicateCopy(e.target.checked)}
            className="h-4 w-4 rounded border-[#F1E4EC] text-[#E6007E] focus:ring-[#EC4899]/30"
          />
          In bản sao thứ 2 (+{DUPLICATE_COPY_PRICE_VND.toLocaleString("vi-VN")}đ/strip)
        </label>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-[13px] font-medium text-[#172033]">
          <input
            type="checkbox"
            checked={lamination}
            onChange={(e) => setLamination(e.target.checked)}
            className="h-4 w-4 rounded border-[#F1E4EC] text-[#E6007E] focus:ring-[#EC4899]/30"
          />
          Cán bóng / cán mờ (+{LAMINATION_PRICE_VND.toLocaleString("vi-VN")}đ/strip)
        </label>
      </div>

      {selectedIds.length > 0 ? (
        <div className="rounded-2xl border border-[#FCE7F3] bg-[#FFF1F8] px-4 py-3 text-[13px] text-[#172033]">
          <p className="font-medium">
            {pricing.freeUsed > 0 ? `${pricing.freeUsed} ảnh miễn phí` : null}
            {pricing.freeUsed > 0 && pricing.paidCount > 0 ? " · " : null}
            {pricing.paidCount > 0
              ? `${pricing.paidCount} ảnh × ${PAID_PRINT_PRICE_VND.toLocaleString("vi-VN")}đ`
              : null}
          </p>
          {pricing.subtotal > 0 ? (
            <p className="mt-1 text-[15px] font-bold">
              Tổng phụ thu: {pricing.subtotal.toLocaleString("vi-VN")}đ
            </p>
          ) : (
            <p className="mt-1 text-[15px] font-bold text-emerald-700">
              Miễn phí trong quota
            </p>
          )}
        </div>
      ) : (
        <p className={cn(ptb.textBody, "rounded-xl border border-dashed border-[#F1E4EC] px-3 py-4 text-center text-[12px]")}>
          Chọn ít nhất 1 strip bên trái để đặt in
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={disabled || !selectedIds.length || submitting}
          onClick={() => handleSubmit(pricing.paidCount > 0 ? "PAY_AT_STORE" : "FREE_ONLY")}
          className={cn(ptb.btnPrimary)}
        >
          <PrinterIcon className="h-5 w-5" />
          {submitting ? "Đang gửi…" : "Đặt in"}
        </button>
        {pricing.paidCount > 0 && pricing.subtotal > 0 ? (
          <button
            type="button"
            disabled={disabled || !selectedIds.length || payingOnline}
            onClick={handlePayOnline}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#F3D4E4] bg-white text-sm font-bold text-[#E6007E] transition-all duration-200 hover:bg-[#FCE7F3]/50 disabled:opacity-50 lg:h-[52px]"
          >
            {payingOnline ? "Đang chuyển…" : "Thanh toán online"}
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="text-center text-[13px] font-semibold text-emerald-700">{message}</p>
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
