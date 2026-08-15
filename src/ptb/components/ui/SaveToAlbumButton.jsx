import React from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/solid";
import { cn, ptb } from "../../lib/theme";

/**
 * CTA chính của màn ghép ảnh — chỉ lo việc lưu.
 * Thêm ảnh thực hiện bằng cách chạm trực tiếp vào ô trống trên strip.
 */
export default function SaveToAlbumButton({
  onSave,
  saving,
  hasFrame,
  missingCount = 0,
  disabled,
  label,
}) {
  const text =
    label ??
    (saving
      ? "Đang lưu…"
      : !hasFrame
        ? "Chọn khung trước"
        : missingCount > 0
          ? `Thêm ${missingCount} ảnh nữa`
          : "Lưu vào Album");

  return (
    <button
      type="button"
      disabled={disabled || saving}
      onClick={onSave}
      className={cn(ptb.btnPrimary)}
    >
      <ArrowUpTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
      {text}
    </button>
  );
}
