import React, { useMemo, useState } from "react";
import FrameCard from "./FrameCard";
import SkeletonFrameCard from "./SkeletonFrameCard";
import EmptyState from "./EmptyState";
import { groupFramesBySize } from "../../lib/frameUtils";
import { cn, ptb } from "../../lib/theme";

const SKELETON_COUNT = 8;
const ALL_SIZES = "all";

function FrameGrid({ frames, selectedFrameId, onSelect, sizeType }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {frames.map((frame) => (
        <FrameCard
          key={frame.id}
          frame={frame}
          selected={selectedFrameId === frame.id}
          onSelect={onSelect}
          sizeType={sizeType}
        />
      ))}
    </div>
  );
}

export default function FrameGalleryPanel({
  frames,
  selectedFrameId,
  onSelect,
  loading,
  className,
}) {
  const groups = useMemo(() => groupFramesBySize(frames), [frames]);
  const [sizeFilter, setSizeFilter] = useState(ALL_SIZES);

  const selectedFrame = frames.find((f) => f.id === selectedFrameId);
  const selectedSize = selectedFrame?.sizeType ?? selectedFrame?.layoutType;

  const visibleGroups = useMemo(() => {
    if (sizeFilter === ALL_SIZES) return groups;
    return groups.filter((g) => g.size === sizeFilter);
  }, [groups, sizeFilter]);

  const selectedCount = selectedFrameId ? 1 : 0;

  return (
    <section className={cn(ptb.card, "flex min-h-0 flex-1 flex-col p-4 sm:p-5", className)}>
      <header className="shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className={ptb.textSection}>Chọn khung</h2>
            <p className={cn(ptb.textBody, "mt-1")}>
              Chọn 1 khung để áp dụng lên strip bên trái
            </p>
          </div>
          {!loading && frames.length > 0 ? (
            <span className="rounded-full bg-[#FCE7F3] px-3 py-1 text-[11px] font-bold text-[#E6007E]">
              {frames.length} khung
            </span>
          ) : null}
        </div>

        {!loading && groups.length > 1 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSizeFilter(ALL_SIZES)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors",
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
                  "rounded-full border px-3 py-1.5 text-[12px] font-bold transition-colors",
                  sizeFilter === group.size
                    ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                    : "border-[#F1E4EC] bg-white text-[#667085] hover:border-[#F3D4E4] hover:text-[#E6007E]",
                )}
              >
                {group.size}
                <span className="ml-1 font-semibold opacity-70">({group.frames.length})</span>
              </button>
            ))}
          </div>
        ) : null}

        {selectedCount > 0 ? (
          <p className="mt-3 text-[12px] font-semibold text-emerald-700">
            Đã chọn 1 khung{selectedSize ? ` · ${selectedSize}` : ""}
          </p>
        ) : null}
      </header>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5 -mr-0.5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          <div className="space-y-6">
            {visibleGroups.map((group) => (
              <section key={group.size}>
                {sizeFilter === ALL_SIZES && groups.length > 1 ? (
                  <div className="mb-3 flex items-center gap-2">
                    <h3 className="text-[13px] font-bold text-[#172033]">{group.label}</h3>
                    <span className="rounded-full bg-[#F9FAFB] px-2 py-0.5 text-[11px] font-semibold text-[#667085]">
                      {group.frames.length}
                    </span>
                  </div>
                ) : null}
                <FrameGrid
                  frames={group.frames}
                  selectedFrameId={selectedFrameId}
                  onSelect={onSelect}
                  sizeType={group.size}
                />
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
