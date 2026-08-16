import React from "react";
import { cn, ptb } from "../../lib/theme";

export default function AlbumPageLayout({ children, className }) {
  return (
    <div
      className={cn(
        ptb.pageBg,
        // Mobile: khóa viewport trên SlideNav — tránh scroll cắt nút Chọn frame
        "max-lg:h-dvh max-lg:overflow-hidden max-lg:pb-[calc(5.25rem+env(safe-area-inset-bottom))]",
        // Desktop: fill viewport như staff free-device
        "lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pb-0",
      )}
    >
      <div
        className={cn(
          // Full-bleed — không max-width container (giống staff)
          "flex w-full min-h-0 flex-1 flex-col px-2.5 pt-2 sm:px-4 sm:pt-3 lg:gap-2 lg:px-4 lg:pb-3 lg:pt-3",
          "max-lg:h-full max-lg:gap-2",
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
    <div
      className={cn(
        "flex min-h-0 flex-col gap-2 sm:gap-3",
        "lg:flex-1 lg:gap-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Desktop: preview + gallery cạnh nhau, full height.
 * Mobile: chỉ preview (gallery mở bằng bottom drawer trong StripEditor).
 */
export function FrameEditorRow({ children, className }) {
  return (
    <div
      className={cn(
        "flex min-h-0 gap-2 sm:gap-3 lg:gap-4",
        "lg:flex-1 lg:items-stretch",
        className,
      )}
    >
      {children}
    </div>
  );
}
