import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PrinterIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import dayjs from "dayjs";
import { resolveMediaUrl } from "../../lib/frameUtils";
import useBodyScrollLock from "../../../hooks/useBodyScrollLock";

const SWIPE_THRESHOLD_PX = 56;
const SWIPE_VELOCITY = 420;

/** Ảnh mới vào từ phía đang lướt tới, ảnh cũ rời khỏi phía đối diện. */
const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0.4 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0.4 }),
};

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
  onPrint,
  saving = false,
}) {
  const photo = photos[index];
  const [direction, setDirection] = useState(0);

  useBodyScrollLock(!!photo);

  const go = useCallback(
    (step) => {
      const next = index + step;
      if (next < 0 || next >= photos.length) return;
      setDirection(step);
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

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={photo.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 320, damping: 34, mass: 0.7 },
              opacity: { duration: 0.16 },
            }}
            drag="x"
            dragElastic={1}
            dragMomentum={false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              const past =
                info.offset.x <= -SWIPE_THRESHOLD_PX ||
                info.velocity.x <= -SWIPE_VELOCITY;
              const back =
                info.offset.x >= SWIPE_THRESHOLD_PX ||
                info.velocity.x >= SWIPE_VELOCITY;
              if (past) go(1);
              else if (back) go(-1);
            }}
            className="absolute inset-0 flex touch-pan-y items-center justify-center px-3 py-2"
          >
            <img
              src={resolveMediaUrl(photo.imageUrl || photo.thumbUrl)}
              alt=""
              draggable={false}
              className="max-h-full max-w-full select-none object-contain"
            />
          </motion.div>
        </AnimatePresence>

        {index > 0 ? (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Ảnh trước"
            className="absolute left-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 sm:flex"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        ) : null}
        {index < photos.length - 1 ? (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Ảnh sau"
            className="absolute right-1 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60 sm:flex"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        ) : null}
      </div>

      <div className="px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto w-full max-w-md">
          <div className="text-center">
            <p className="truncate text-[13px] font-semibold text-white/90">
              {photo.albumTitle || "Ảnh photobooth"}
            </p>
            {createdAt?.isValid() ? (
              <p className="text-[11px] font-medium text-white/50">
                {createdAt.format("HH:mm, D [tháng] M, YYYY")}
              </p>
            ) : null}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSave?.(photo)}
              disabled={saving}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/12 text-[13px] font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {saving ? "Đang lưu…" : "Lưu về máy"}
            </button>
            <button
              type="button"
              onClick={() => onPrint?.(photo)}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E6007E] text-[13px] font-bold text-white transition hover:bg-[#cf0071]"
            >
              <PrinterIcon className="h-4 w-4" />
              Gửi shop in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
