import React, { useMemo, useState } from "react";
import { PrinterIcon } from "@heroicons/react/24/solid";
import FrameCard from "./FrameCard";
import SkeletonFrameCard from "./SkeletonFrameCard";
import EmptyState from "./EmptyState";
import { FREE_PRINT_QUOTA } from "../../lib/constants";
import { groupFramesBySize, resolveMediaUrl } from "../../lib/frameUtils";
import { cn, ptb } from "../../lib/theme";

const SKELETON_COUNT = 12;
const ALL_SIZES = "all";
const FRAME_GRID =
  "grid grid-cols-3 justify-items-end gap-1.5 sm:grid-cols-4 lg:grid-cols-6";
const ALBUM_GRID =
  "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3";

const PANEL_TABS = [
  { id: "frames", label: "Danh sách frame" },
  { id: "album", label: "Ảnh của bạn" },
];

function collectPrintedImageIds(printRequests = []) {
  const ids = new Set();
  for (const req of printRequests) {
    if (!req || req.status === "CANCELLED") continue;
    for (const item of req.items || []) {
      const id = item.ptbImageId ?? item.imageId;
      if (id != null) ids.add(Number(id));
    }
  }
  return ids;
}

function sortAlbumImages(images, printedIds) {
  return [...images].sort((a, b) => {
    const aPrinted = printedIds.has(Number(a.id)) ? 0 : 1;
    const bPrinted = printedIds.has(Number(b.id)) ? 0 : 1;
    if (aPrinted !== bPrinted) return aPrinted - bPrinted;
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

function countPrintSplit(selectedCount, freeRemaining) {
  const freeUsed = Math.min(selectedCount, Math.max(0, freeRemaining));
  return { freeUsed, extraCount: Math.max(0, selectedCount - freeUsed) };
}

export default function FrameGalleryPanel({
  frames,
  selectedFrameId,
  onSelect,
  loading,
  className,
  /** Trong bottom drawer: không khóa chiều cao, cuộn theo panel ngoài. */
  embedded = false,
  albumImages = [],
  printRequests = [],
  freeRemaining = 0,
  printDisabled = false,
  printSubmitting = false,
  onSubmitPrint,
  galleryTab: galleryTabProp,
  onGalleryTabChange,
}) {
  const groups = useMemo(() => groupFramesBySize(frames), [frames]);
  const [sizeFilter, setSizeFilter] = useState(ALL_SIZES);
  const [internalTab, setInternalTab] = useState("frames");
  const [selectedPrintIds, setSelectedPrintIds] = useState(() => new Set());
  const galleryTab = galleryTabProp ?? internalTab;

  const setGalleryTab = (id) => {
    if (galleryTabProp === undefined) setInternalTab(id);
    onGalleryTabChange?.(id);
  };

  const visibleGroups = useMemo(() => {
    if (sizeFilter === ALL_SIZES) return groups;
    return groups.filter((g) => g.size === sizeFilter);
  }, [groups, sizeFilter]);

  const printedIds = useMemo(
    () => collectPrintedImageIds(printRequests),
    [printRequests],
  );

  const sortedAlbumImages = useMemo(
    () => sortAlbumImages(albumImages, printedIds),
    [albumImages, printedIds],
  );

  const albumCount = albumImages.length;
  const selectedCount = selectedPrintIds.size;
  const split = countPrintSplit(selectedCount, freeRemaining);

  const togglePrintSelect = (id) => {
    if (printDisabled) return;
    setSelectedPrintIds((prev) => {
      const next = new Set(prev);
      const key = Number(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmitPrint = async () => {
    if (!selectedCount || !onSubmitPrint) return;
    try {
      await onSubmitPrint({
        imageIds: [...selectedPrintIds],
        paymentMethod: split.extraCount > 0 ? "PAY_AT_STORE" : "FREE_ONLY",
      });
      setSelectedPrintIds(new Set());
    } catch {
      /* parent toasts */
    }
  };

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col",
        embedded ? "min-h-0" : "min-h-0 flex-1",
        className,
      )}
    >
      <div
        className={cn(
          "mb-2 flex shrink-0 gap-1 border border-[#F1E4EC] bg-[#FFF7FB] p-1",
          embedded && "sticky top-0 z-[1]",
        )}
        role="tablist"
        aria-label="Thư viện"
      >
        {PANEL_TABS.map((tab) => {
          const active = galleryTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setGalleryTab(tab.id)}
              className={cn(
                "relative flex-1 px-2 py-2 text-[12px] font-bold transition-colors sm:text-[13px]",
                active
                  ? "bg-[#E6007E] text-white"
                  : "bg-transparent text-[#667085] hover:text-[#E6007E]",
              )}
            >
              {tab.label}
              {tab.id === "album" && albumCount > 0 ? (
                <span
                  className={cn(
                    "ml-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full px-1 text-[10px] font-bold",
                    active
                      ? "bg-white/25 text-white"
                      : "bg-[#FCE7F3] text-[#E6007E]",
                  )}
                >
                  {albumCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {galleryTab === "album" ? (
        <div
          className={cn(
            "border border-[#F1E4EC] bg-white p-2 sm:p-2.5",
            embedded
              ? "overflow-visible"
              : "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          )}
        >
          {!albumImages.length ? (
            <EmptyState
              title="Chưa có ảnh lưu"
              description="Ghép và lưu strip để xem tại đây."
            />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cn(ptb.textBody, "text-[12px]")}>
                  {albumCount} strip · chạm để chọn in
                </p>
                <p className="text-[11px] font-semibold text-emerald-700">
                  Còn {freeRemaining}/{FREE_PRINT_QUOTA} miễn phí
                </p>
              </div>
              <div className={ALBUM_GRID}>
                {sortedAlbumImages.map((img) => {
                  const id = Number(img.id);
                  const printed = printedIds.has(id);
                  const active = selectedPrintIds.has(id);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      disabled={printDisabled}
                      onClick={() => togglePrintSelect(img.id)}
                      className={cn(
                        "relative overflow-hidden border-2 bg-white p-1 text-left transition-all",
                        active
                          ? "border-[#E6007E] shadow-[0_6px_18px_rgba(230,0,126,0.18)] ring-2 ring-[#FCE7F3]"
                          : printed
                            ? "border-emerald-500"
                            : "border-[#EEF2F6] hover:border-[#F3D4E4]",
                        printDisabled && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <img
                        src={resolveMediaUrl(img.imageUrl || img.thumbUrl)}
                        alt=""
                        className="aspect-[5/15] w-full object-cover"
                        loading="lazy"
                      />
                      {printed ? (
                        <span className="absolute left-1 top-1 rounded-full border border-emerald-600/30 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 shadow-sm">
                          Đã in
                        </span>
                      ) : null}
                      {active ? (
                        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E6007E] text-[11px] font-bold text-white">
                          ✓
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {selectedCount > 0 ? (
                <p className="text-center text-[12px] font-medium text-[#344054]">
                  {split.freeUsed > 0 ? `${split.freeUsed} miễn phí` : null}
                  {split.freeUsed > 0 && split.extraCount > 0 ? " · " : null}
                  {split.extraCount > 0 ? `${split.extraCount} in thêm` : null}
                </p>
              ) : null}

              {onSubmitPrint ? (
                <button
                  type="button"
                  disabled={
                    printDisabled || !selectedCount || printSubmitting
                  }
                  onClick={handleSubmitPrint}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 py-2.5 text-[13px] font-bold transition-colors",
                    selectedCount && !printDisabled && !printSubmitting
                      ? "bg-[#E6007E] text-white"
                      : "cursor-not-allowed bg-[#F2F4F7] text-[#98A2B3]",
                  )}
                >
                  <PrinterIcon className="h-4 w-4" aria-hidden />
                  {printSubmitting
                    ? "Đang gửi…"
                    : selectedCount
                      ? `Đặt in (${selectedCount})`
                      : "Chọn ảnh để đặt in"}
                </button>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <>
          {!loading && groups.length > 1 ? (
            <div
              className={cn(
                "mb-2 flex shrink-0 justify-end gap-1.5 overflow-x-auto pb-0.5",
                embedded && "sticky top-11 z-[1] bg-white pt-0.5",
              )}
            >
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

          <div
            className={cn(
              "border border-[#F1E4EC] bg-white p-2 sm:p-2.5",
              embedded
                ? "overflow-visible"
                : "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            )}
          >
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
        </>
      )}
    </section>
  );
}
