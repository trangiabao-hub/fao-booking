import React from "react";

/** Giữ đúng metric của FrameCard để không bị layout shift khi frame load xong. */
export default function SkeletonFrameCard() {
  return (
    <div className="flex w-full min-w-0 items-center justify-end border border-transparent p-1">
      <div className="aspect-[1/3] w-full animate-pulse bg-gradient-to-b from-[#FCE7F3]/40 to-[#F1E4EC]/30" />
    </div>
  );
}
