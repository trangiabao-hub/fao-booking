import React from "react";
import { cn, ptb } from "../../lib/theme";

export default function AlbumPageLayout({ children, className }) {
  return (
    <div
      className={cn(
        ptb.pageBg,
        // Mobile Safari: flex + dvh + chừa SlideNav (không cộng thêm thanh Safari — nó overlay)
        "max-lg:flex max-lg:h-dvh max-lg:max-h-dvh max-lg:min-h-0 max-lg:flex-col max-lg:overflow-hidden",
        "max-lg:pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]",
        // Desktop: fill viewport như staff free-device
        "lg:flex lg:h-dvh lg:min-h-0 lg:flex-col lg:overflow-hidden lg:pb-0",
      )}
    >
      <div
        className={cn(
          // Full-bleed — không max-width container (giống staff)
          "flex w-full min-h-0 flex-1 flex-col px-2 pt-1.5 sm:px-4 sm:pt-3 lg:gap-2 lg:px-4 lg:pb-3 lg:pt-3",
          "max-lg:gap-1.5",
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
        "flex min-h-0 flex-1 flex-col gap-1.5 sm:gap-3",
        "lg:gap-0",
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
        "flex min-h-0 flex-1 gap-2 sm:gap-3 lg:gap-4",
        "lg:items-stretch",
        className,
      )}
    >
      {children}
    </div>
  );
}
