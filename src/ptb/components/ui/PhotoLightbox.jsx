import React, { useCallback, useEffect, useRef } from "react";
import {
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import dayjs from "dayjs";
import { resolveMediaUrl } from "../../lib/frameUtils";
import useBodyScrollLock from "../../../hooks/useBodyScrollLock";
import { cn } from "../../lib/theme";

const SWIPE_THRESHOLD_PX = 48;

/**
 * Xem ảnh toàn màn hình theo chuẩn các app ảnh: nền tối, ảnh không bị crop,
 * điều hướng bằng phím ←/→, swipe ngang trên mobile, Esc để đóng.
 */
export default function PhotoLightbox({
  photos = [],
  index = 0,
  onClose,
  onNavigate,
  selectedIds,
  onToggleSelect,
  onSave,
  saving = false,
}) {
  const photo = photos[index];
  const touchStartX = useRef(null);

  useBodyScrollLock(!!photo);

  const go = useCallback(
    (step) => {
      const next = index + step;
      if (next < 0 || next >= photos.length) return;
      onNavigate?.(next);
    },
    [index, photos.length, onNavigate],
  );

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
      else if (event.key === "ArrowLeft") go(-1);
      else if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, onClose]);

  if (!photo) return null;

  const active = selectedIds?.has(photo.id);
  const createdAt = photo.createdAt ? dayjs(photo.createdAt) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
      className="fixed inset-0 z-[150] flex flex-col bg-[#0c0b0e]"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return;
        go(delta < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-2 pt-[max(8px,env(safe-area-inset-top))] text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/90 transition hover:bg-white/10"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <span className="text-[13px] font-semibold tabular-nums text-white/70">
          {index + 1} / {photos.length}
        </span>
        <button
          type="button"
          onClick={() => onToggleSelect?.(photo.id)}
          aria-pressed={!!active}
          aria-label={active ? "Bỏ chọn ảnh" : "Chọn ảnh"}
          className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-white/10"
        >
          {active ? (
            <CheckCircleIcon className="h-7 w-7 text-[#FF3D9A]" />
          ) : (
            <span className="h-6 w-6 rounded-full border-2 border-white/80" />
          )}
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-2">
        <img
          key={photo.id}
          src={resolveMediaUrl(photo.imageUrl || photo.thumbUrl)}
          alt=""
          className="max-h-full max-w-full object-contain"
        />

        {index > 0 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Ảnh trước"
            className="absolute left-1 hidden h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 sm:flex"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        ) : null}
        {index < photos.length - 1 ? (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Ảnh sau"
            className="absolute right-1 hidden h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 sm:flex"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      <div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto flex w-full max-w-md items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-white/90">
              {photo.albumTitle || "Ảnh photobooth"}
            </p>
            {createdAt?.isValid() ? (
              <p className="text-[11px] font-medium text-white/50">
                {createdAt.format("HH:mm, D [tháng] M, YYYY")}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onSave?.(photo)}
            disabled={saving}
            className="flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-[13px] font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
          <button
            type="button"
            onClick={() => onToggleSelect?.(photo.id)}
            className={cn(
              "h-10 rounded-full px-4 text-[13px] font-bold transition",
              active
                ? "bg-white text-[#141216]"
                : "bg-[#E6007E] text-white hover:bg-[#cf0071]",
            )}
          >
            {active ? "Đã chọn" : "Chọn để in"}
          </button>
        </div>
      </div>
    </div>
  );
}
