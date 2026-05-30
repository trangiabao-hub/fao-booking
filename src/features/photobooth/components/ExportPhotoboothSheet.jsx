import React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { ptbHeroGradient } from "../theme";

export default function ExportPhotoboothSheet({
  previewUrl,
  onClose,
  onDownload,
  onSaveOnline,
  downloading,
  uploading,
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/55 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 48, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 48, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        <div className={`relative px-5 pt-5 pb-4 ${ptbHeroGradient} text-white`}>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/15 hover:bg-white/25 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="w-5 h-5 opacity-90" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">
              Hoàn thành
            </span>
          </div>
          <h2 className="text-xl font-bold">Strip của bạn đã sẵn sàng!</h2>
          <p className="text-sm text-white/80 mt-1">Chọn cách lưu — tải về hoặc gom vào album</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="relative rounded-2xl bg-gradient-to-b from-pink-50 to-white p-4 border border-pink-100">
            <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-pink-300 to-transparent" />
            {previewUrl ? (
              <motion.img
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                src={previewUrl}
                alt="Preview photobooth"
                className="mx-auto max-h-[42vh] w-auto rounded-xl shadow-2xl shadow-pink-500/15 object-contain"
              />
            ) : (
              <div className="h-48 flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-500">Đang render ảnh...</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={onDownload}
              disabled={!previewUrl || downloading}
              className="group w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all text-left disabled:opacity-50"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white group-hover:scale-105 transition-transform">
                <ArrowDownTrayIcon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">
                  {downloading ? "Đang tải..." : "Lưu về máy"}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  JPG chất lượng cao — đăng story ngay
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onSaveOnline}
              disabled={!previewUrl || uploading}
              className="group w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-pink-200 bg-gradient-to-r from-pink-50 to-[#FFF8FB] hover:from-pink-100 hover:to-pink-50 hover:shadow-md transition-all text-left disabled:opacity-50 touch-manipulation min-h-[72px]"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E85C9C] to-[#FF9FCA] text-white group-hover:scale-105 transition-transform">
                <CloudArrowUpIcon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-pink-900">
                  {uploading ? "Đang lưu album..." : "Lưu vào album online"}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Bạn bè trong phòng xem được ngay
                </span>
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
