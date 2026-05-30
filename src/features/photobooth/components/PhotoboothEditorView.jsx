import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  HandRaisedIcon,
  MagnifyingGlassPlusIcon,
} from "@heroicons/react/24/outline";
import StripPreview from "./StripPreview";
import FrameGalleryRail from "./FrameGalleryRail";
import SlotProgressChips from "./SlotProgressChips";
import { ptbBtnGradient } from "../theme";
import { PREVIEW_WIDTH } from "../constants";

export default function PhotoboothEditorView({
  editor,
  frames,
  selectedFrameId,
  onSelectFrame,
  onBack,
  onOpenExport,
  preparingExport,
}) {
  const progress = editor.total > 0 ? editor.filled / editor.total : 0;
  const ready = editor.isComplete;

  const focusSlot = (index) => {
    if (editor.strip.images?.[index]) return;
    editor.triggerUpload(editor.strip.id, index);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-[#FFFCFD] via-[#FFF8FB] to-[#FDF2F7]">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-[#FF9FCA]/25 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-pink-100/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2.5 rounded-2xl bg-slate-50 text-slate-600 hover:bg-pink-50 hover:text-pink-700 transition-colors shrink-0"
            aria-label="Quay lại album"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-pink-500">
              Studio
            </p>
            <h1
              className="text-lg font-bold text-slate-900 truncate leading-tight"
              style={{ fontFamily: "'Great Vibes', 'Playwrite VN', cursive" }}
            >
              Tạo strip kỷ niệm
            </h1>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Tiến độ</p>
            <p className="text-sm font-bold text-pink-600 tabular-nums">
              {editor.filled}/{editor.total}
            </p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 pb-3">
          <div className="h-1 rounded-full bg-pink-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#E85C9C] via-pink-500 to-[#FF9FCA]"
              initial={false}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      </header>

      <div className="relative flex-1 max-w-6xl w-full mx-auto px-4 py-4 pb-32 lg:pb-6 grid grid-cols-1 lg:grid-cols-[minmax(300px,360px)_1fr] gap-5 lg:gap-6 items-start">
        {/* Preview column */}
        <div className="lg:sticky lg:top-[7.5rem] space-y-4">
          <motion.div
            layout
            className="rounded-3xl bg-white border border-pink-100/80 shadow-xl shadow-pink-500/10 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-700">Xem trước</span>
              <span className="text-[11px] font-medium text-slate-500">Live preview</span>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-[min(100%,440px)] drop-shadow-2xl">
                <StripPreview
                  strip={editor.strip}
                  previewWidth={PREVIEW_WIDTH}
                  theme={editor.theme}
                  dragState={editor.dragState}
                  hoverState={editor.hoverState}
                  fileInputRefs={editor.fileInputRefs}
                  pinchRef={editor.pinchRef}
                  onHoverEnter={(id, idx) => editor.setHoverState({ stripId: id, imgIdx: idx })}
                  onHoverLeave={editor.clearHover}
                  onDragStart={editor.startDrag}
                  onDragCancel={editor.cancelDrag}
                  onWheelZoom={editor.handleWheelZoom}
                  onPinchZoom={editor.handlePinchZoom}
                  onUploadClick={editor.triggerUpload}
                  onFileChange={editor.handleSlotUpload}
                  onRemoveImage={editor.removeSlotImage}
                />
              </div>
            </div>

            <div className="mt-4">
              <SlotProgressChips
                total={editor.total}
                filled={editor.filled}
                images={editor.strip.images}
                onSlotClick={focusSlot}
              />
            </div>
          </motion.div>

          <div className="hidden lg:grid grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-100 px-3 py-2.5">
              <HandRaisedIcon className="w-4 h-4 text-pink-400 shrink-0" />
              <span>Kéo để căn vị trí ảnh</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/80 border border-slate-100 px-3 py-2.5">
              <MagnifyingGlassPlusIcon className="w-4 h-4 text-pink-400 shrink-0" />
              <span>Pinch / scroll để zoom</span>
            </div>
          </div>
        </div>

        <FrameGalleryRail
          frames={frames}
          selectedId={selectedFrameId}
          onSelect={onSelectFrame}
        />
      </div>

      {/* Mobile sticky CTA */}
      <div className="lg:hidden fixed inset-x-0 z-50 px-4 pt-3 pointer-events-none bg-gradient-to-t from-[#FFF8FB] via-[#FFF8FB]/98 to-transparent pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ bottom: 0 }}>
        <div className="pointer-events-auto max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {ready ? (
              <motion.button
                key="export"
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                onClick={onOpenExport}
                disabled={preparingExport}
                className={`w-full py-4 min-h-[52px] rounded-2xl ${ptbBtnGradient} text-base flex items-center justify-center gap-2 disabled:opacity-60`}
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                {preparingExport ? "Đang xử lý..." : "Xuất ảnh"}
              </motion.button>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-xs font-medium text-slate-500 bg-white/90 backdrop-blur rounded-2xl py-3 px-4 border border-pink-100 shadow-sm"
              >
                Thêm {editor.total - editor.filled} ảnh nữa để xuất strip ✨
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Desktop export */}
      <div className="hidden lg:block fixed bottom-6 right-6 z-50">
        <motion.button
          type="button"
          onClick={onOpenExport}
          disabled={!ready || preparingExport}
          whileHover={ready ? { scale: 1.03 } : {}}
          whileTap={ready ? { scale: 0.97 } : {}}
          className={`px-6 py-3.5 min-h-[48px] rounded-2xl ${ptbBtnGradient} text-sm flex items-center gap-2 disabled:opacity-45 disabled:shadow-none`}
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          {preparingExport ? "Đang xử lý..." : "Xuất ảnh"}
        </motion.button>
      </div>
    </div>
  );
}
