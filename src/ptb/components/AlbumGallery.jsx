import React from "react";
import { resolveMediaUrl } from "../lib/frameUtils";
import EmptyState from "./ui/EmptyState";
import { cn, ptb } from "../lib/theme";

const STATUS_LABEL = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  PRINTING: "Đang in",
  DONE: "In xong",
  DELIVERED: "Đã giao",
  CANCELLED: "Đã hủy",
};

const STATUS_STYLE = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200/80",
  CONFIRMED: "bg-blue-50 text-blue-800 border-blue-200/80",
  PRINTING: "bg-violet-50 text-violet-800 border-violet-200/80",
  DONE: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  DELIVERED: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
  CANCELLED: "bg-slate-50 text-slate-600 border-slate-200/80",
};

export default function AlbumGallery({ images = [], printRequests = [] }) {
  if (!images.length && !printRequests.length) {
    return (
      <EmptyState
        title="Album trống"
        description="Hãy tạo strip đầu tiên từ tab Ghép ảnh."
      />
    );
  }

  const printRequestsSection =
    printRequests.length > 0 ? (
      <section>
        <h2 className={ptb.textSection}>Yêu cầu in</h2>
        <ul className="mt-4 space-y-3">
          {printRequests.map((req) => (
            <li
              key={req.id}
              className="rounded-2xl border border-[#F1E4EC] bg-white px-4 py-3.5 shadow-[0_4px_12px_rgba(16,24,40,0.04)]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-bold text-[#172033]">#{req.id}</span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                    STATUS_STYLE[req.status] ?? STATUS_STYLE.PENDING,
                  )}
                >
                  {STATUS_LABEL[req.status] || req.status}
                </span>
              </div>
              <p className={cn(ptb.textBody, "mt-2 text-[12px]")}>
                {req.freeCount} miễn phí
                {req.paidCount > 0 ? ` · ${req.paidCount} in thêm` : ""}
                {req.note ? ` · ${req.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-6 xl:grid-cols-[1fr_320px]">
      {images.length > 0 ? (
        <section>
          <h2 className={ptb.textSection}>Strip trong album</h2>
          <p className={cn(ptb.textBody, "mt-1 mb-4")}>
            {images.length} strip đã lưu
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
            {images.map((img) => (
              <div
                key={img.id}
                className="overflow-hidden rounded-2xl border border-[#EEF2F6] bg-white p-1.5 shadow-[0_4px_12px_rgba(16,24,40,0.04)]"
              >
                <img
                  src={resolveMediaUrl(img.imageUrl || img.thumbUrl)}
                  alt=""
                  className="aspect-[5/15] w-full rounded-xl object-cover"
                  loading="lazy"
                />
                {img.createdByName ? (
                  <p className="truncate px-1 py-2 text-[11px] font-medium text-[#667085]">
                    {img.createdByName}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {printRequestsSection ? (
        <aside className="mt-6 lg:sticky lg:top-4 lg:mt-0">{printRequestsSection}</aside>
      ) : null}
    </div>
  );
}
