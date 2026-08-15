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
    <div className={cn("flex flex-col gap-3 sm:gap-4", className)}>{children}</div>
  );
}

/**
 * Preview + chọn khung luôn nằm cạnh nhau ở MỌI breakpoint.
 * Strip 1×4 vốn hẹp (tỉ lệ 1:3) nên xếp khung bên cạnh sẽ thấy được cả hai
 * cùng lúc — không cần chặn chiều cao preview hay cuộn xuống mới thấy khung.
 * `items-stretch` (mặc định) cho cột khung tự cao bằng preview.
 */
export function FrameEditorRow({ children, className }) {
  return (
    <div className={cn("flex gap-2 sm:gap-4 lg:gap-6", className)}>{children}</div>
  );
}
