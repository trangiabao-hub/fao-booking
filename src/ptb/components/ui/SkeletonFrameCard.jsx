import React from "react";

const SKELETON_ASPECT = {
  "1x4": "aspect-[5/15]",
  "2x2": "aspect-[8401/11813]",
  "1x1": "aspect-[7715/11572]",
};

export default function SkeletonFrameCard({ sizeType = "1x4" }) {
  const aspect = SKELETON_ASPECT[sizeType] ?? SKELETON_ASPECT["1x4"];

  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-[#EEF2F6] bg-white p-2">
      <div
        className={`w-full rounded-xl bg-gradient-to-b from-[#FCE7F3]/40 to-[#F1E4EC]/30 ${aspect}`}
      />
      <div className="mt-2 h-3 w-3/4 rounded-md bg-[#F1E4EC]/80" />
    </div>
  );
}
