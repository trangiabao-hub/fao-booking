import React from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/solid";
import { cn, ptb } from "../../lib/theme";

export default function SaveToAlbumButton({
  onClick,
  disabled,
  saving,
  hasFrame,
  label,
}) {
  const text =
    label ??
    (saving ? "Đang lưu…" : hasFrame ? "Lưu vào album" : "Chọn khung trước");

  return (
    <button
      type="button"
      disabled={disabled || saving}
      onClick={onClick}
      aria-label="Lưu strip vào album"
      className={cn(ptb.btnPrimary)}
    >
      <ArrowUpTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
      {text}
    </button>
  );
}
