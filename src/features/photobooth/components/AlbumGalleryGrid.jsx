import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PhotoIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useBreakpoint } from "../hooks/useBreakpoint";
import {
  resolveUploadUrl,
  sortGalleryImagesByLayout,
  getGalleryLayoutAspectRatio,
  getGalleryColumnCount,
  getGalleryGridRowSpan,
  GALLERY_ROW_UNIT_PX,
} from "../utils";

/** Gallery chung — dense masonry grid + lightbox */
export default function AlbumGalleryGrid({
  images,
  emptyLabel = "Chưa có ảnh nào",
  emptyHint = "Strip đầu tiên sẽ hiện ở đây",
}) {
  const [lightbox, setLightbox] = useState(null);
  const containerRef = useRef(null);
  const bp = useBreakpoint();
  const cols = getGalleryColumnCount(bp);
  const [gridMetrics, setGridMetrics] = useState({ colWidth: 0, gap: 8 });

  const displayImages = useMemo(
    () => sortGalleryImagesByLayout(images),
    [images]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      const gap =
        parseFloat(style.rowGap) ||
        parseFloat(style.gap) ||
        parseFloat(style.columnGap) ||
        8;
      const width = el.clientWidth;
      const colWidth = cols > 0 ? (width - gap * (cols - 1)) / cols : width;
      setGridMetrics({ colWidth, gap });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols, displayImages.length]);

  if (!displayImages.length) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-pink-200/70 bg-gradient-to-b from-pink-50/40 to-white py-16 md:py-20 px-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-pink-100 flex items-center justify-center mb-4">
          <PhotoIcon className="w-8 h-8 text-pink-400" />
        </div>
        <p className="text-base font-semibold text-slate-700">{emptyLabel}</p>
        <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto">{emptyHint}</p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3 lg:gap-4 grid-flow-dense"
        style={{ gridAutoRows: `${GALLERY_ROW_UNIT_PX}px` }}
      >
        {displayImages.map((img, index) => {
          const aspectRatio = getGalleryLayoutAspectRatio(img.layoutType);
          const rowSpan = getGalleryGridRowSpan(
            aspectRatio,
            gridMetrics.colWidth,
            gridMetrics.gap
          );

          return (
            <motion.figure
              key={img.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              style={{ gridRowEnd: `span ${rowSpan}` }}
              className="group relative w-full min-h-0 overflow-hidden bg-neutral-900 shadow-sm ring-1 ring-black/5 cursor-pointer"
              onClick={() => setLightbox(img)}
            >
              <img
                src={resolveUploadUrl(img.thumbUrl || img.imageUrl)}
                alt=""
                className="absolute inset-0 block w-full h-full object-contain scale-[1.02] transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-transparent opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity pointer-events-none" />
              {img.createdByName && (
                <figcaption className="absolute bottom-0 inset-x-0 px-2.5 py-2 md:py-3 flex items-center gap-1.5 pointer-events-none">
                  <UserCircleIcon className="w-3.5 h-3.5 text-white/80 shrink-0 hidden md:block" />
                  <span className="text-[10px] md:text-xs font-semibold text-white truncate">
                    {img.createdByName}
                  </span>
                </figcaption>
              )}
              <a
                href={resolveUploadUrl(img.imageUrl)}
                download
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2 right-2 p-2 rounded-xl bg-white/95 text-slate-700 shadow-md opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-white"
                aria-label="Tải ảnh"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
              </a>
            </motion.figure>
          );
        })}
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 md:top-6 md:right-6 p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={resolveUploadUrl(lightbox.imageUrl)}
              alt=""
              className="max-h-[85vh] max-w-full shadow-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.createdByName && (
              <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/80 font-medium">
                {lightbox.createdByName}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
