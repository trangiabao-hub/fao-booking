import React from "react";
import { cn, ptb } from "../../lib/theme";

export default function AlbumPageLayout({ children, className }) {
  return (
    <div
      className={cn(
        ptb.pageBg,
        // Mobile: khóa viewport trên SlideNav — tránh scroll cắt nút Chọn frame
        "max-lg:h-dvh max-lg:overflow-hidden max-lg:pb-[calc(5.25rem+env(safe-area-inset-bottom))]",
        "lg:pb-10",
      )}
    >
      <div
        className={cn(
          ptb.container,
          "max-w-[1240px] pt-3 sm:pt-5",
          "max-lg:flex max-lg:h-full max-lg:min-h-0 max-lg:flex-col max-lg:gap-2.5",
          "lg:space-y-5",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function FrameEditorWorkspace({ children, className }) {
  return (
    <div className={cn("flex min-h-0 flex-col gap-3 sm:gap-4", className)}>
      {children}
    </div>
  );
}

/**
 * Desktop: preview + gallery cạnh nhau.
 * Mobile: chỉ preview (gallery mở bằng bottom drawer trong StripEditor).
 */
export function FrameEditorRow({ children, className }) {
  return (
    <div
      className={cn("flex min-h-0 gap-2 sm:gap-4 lg:gap-6", className)}
    >
      {children}
    </div>
  );
}
