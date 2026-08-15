import React, { useMemo, useState } from "react";
import FrameCard from "./FrameCard";
import SkeletonFrameCard from "./SkeletonFrameCard";
import EmptyState from "./EmptyState";
import { groupFramesBySize } from "../../lib/frameUtils";
import { cn } from "../../lib/theme";

const SKELETON_COUNT = 12;
const ALL_SIZES = "all";
const FRAME_GRID =
  "grid grid-cols-3 justify-items-end gap-1.5 sm:grid-cols-4 lg:grid-cols-6";

export default function FrameGalleryPanel({
  frames,
  selectedFrameId,
  onSelect,
  loading,
  className,
}) {
  const groups = useMemo(() => groupFramesBySize(frames), [frames]);
  const [sizeFilter, setSizeFilter] = useState(ALL_SIZES);

  const visibleGroups = useMemo(() => {
    if (sizeFilter === ALL_SIZES) return groups;
    return groups.filter((g) => g.size === sizeFilter);
  }, [groups, sizeFilter]);

  return (
    <section className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}>
      {!loading && groups.length > 1 ? (
        <div className="mb-2 flex shrink-0 justify-end gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setSizeFilter(ALL_SIZES)}
            className={cn(
              "shrink-0 border px-2.5 py-1 text-[12px] font-bold transition-colors",
              sizeFilter === ALL_SIZES
                ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                : "border-[#F1E4EC] bg-white text-[#667085] hover:border-[#F3D4E4] hover:text-[#E6007E]",
            )}
          >
            Tất cả
          </button>
          {groups.map((group) => (
            <button
              key={group.size}
              type="button"
              onClick={() => setSizeFilter(group.size)}
              className={cn(
                "shrink-0 border px-2.5 py-1 text-[12px] font-bold transition-colors",
                sizeFilter === group.size
                  ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                  : "border-[#F1E4EC] bg-white text-[#667085] hover:border-[#F3D4E4] hover:text-[#E6007E]",
              )}
            >
              {group.size}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border border-[#F1E4EC] bg-white p-2 sm:p-2.5">
        {loading ? (
          <div className={FRAME_GRID}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonFrameCard key={i} />
            ))}
          </div>
        ) : !frames.length ? (
          <EmptyState
            title="Chưa có khung ảnh"
            description="Liên hệ shop FAO để được hỗ trợ thêm khung."
          />
        ) : (
          <div className="space-y-3">
            {visibleGroups.map((group) => (
              <section key={group.size}>
                {sizeFilter === ALL_SIZES && groups.length > 1 ? (
                  <h3 className="mb-1.5 text-right text-[11px] font-bold uppercase tracking-wide text-[#98A2B3]">
                    {group.label}
                  </h3>
                ) : null}
                <div
                  role="radiogroup"
                  aria-label={`Khung ${group.label}`}
                  className={FRAME_GRID}
                >
                  {group.frames.map((frame) => (
                    <FrameCard
                      key={frame.id}
                      frame={frame}
                      selected={selectedFrameId === frame.id}
                      onSelect={onSelect}
                      sizeType={group.size}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
