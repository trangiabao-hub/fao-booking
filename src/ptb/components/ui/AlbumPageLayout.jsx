import React from "react";
import { cn, ptb } from "../../lib/theme";

export default function AlbumPageLayout({ children, className }) {
  return (
    <div className={cn(ptb.pageBg, ptb.contentPb)}>
      <div
        className={cn(
          ptb.container,
          "max-w-[1240px] space-y-4 pt-4 sm:space-y-5 sm:pt-5",
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
        "flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
