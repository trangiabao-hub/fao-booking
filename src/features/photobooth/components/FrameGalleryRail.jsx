import React, { useEffect, useMemo, useState } from "react";
import { MagnifyingGlassIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import FrameThumb from "./FrameThumb";
import { warmFrameForEditor } from "../frameImageLoader";

const LAYOUT_GROUPS = [
  { id: "1x4", label: "Strip 1×4", desc: "Hàn Quốc" },
  { id: "2x2", label: "Grid 2×2", desc: "4 ô vuông" },
  { id: "1x1", label: "Single", desc: "1 ảnh lớn" },
];

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "1x4", label: "1×4" },
  { id: "2x2", label: "2×2" },
  { id: "1x1", label: "1×1" },
];

const THUMB_BY_LAYOUT = {
  "1x4": { w: 76, h: 228 },
  "2x2": { w: 104, h: 104 },
  "1x1": { w: 88, h: 132 },
};

function frameThemeName(frame) {
  const raw = frame?.label || "";
  const idx = raw.indexOf(" · ");
  return idx > 0 ? raw.slice(0, idx) : raw || "Frame";
}

function getThumbSpec(layoutType) {
  return THUMB_BY_LAYOUT[layoutType] ?? THUMB_BY_LAYOUT["1x4"];
}

export default function FrameGalleryRail({ frames, selectedId, onSelect }) {
  const [search, setSearch] = useState("");
  const [sizeFilter, setSizeFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return frames.filter((f) => {
      if (sizeFilter !== "all" && f.layoutType !== sizeFilter) return false;
      if (!q) return true;
      return (
        (f.label || "").toLowerCase().includes(q) ||
        (f.frameCategoryName || "").toLowerCase().includes(q)
      );
    });
  }, [frames, search, sizeFilter]);

  const grouped = useMemo(() => {
    return LAYOUT_GROUPS.map((group) => ({
      ...group,
      items: filtered.filter((f) => f.layoutType === group.id),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  useEffect(() => {
    if (!selectedId) return;
    const selected = frames.find((f) => f.id === selectedId);
    if (selected?.src) warmFrameForEditor(selected.src);
  }, [selectedId, frames]);

  return (
    <div className="rounded-3xl bg-white border border-pink-100/80 shadow-sm overflow-hidden flex flex-col min-h-[320px] lg:max-h-[calc(100vh-8rem)]">
      <div className="px-4 pt-4 pb-3 border-b border-pink-50 bg-gradient-to-r from-pink-50/80 to-[#FFF8FB]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Chọn khung</p>
            <p className="text-xs text-slate-500">{filtered.length} mẫu · đổi live trên preview</p>
          </div>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theme, chủ đề..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-pink-100 bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-300/60 focus:border-pink-200"
          />
        </div>

        <div className="flex gap-1.5 mt-3 p-1 rounded-2xl bg-white/80 border border-pink-100">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSizeFilter(f.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                sizeFilter === f.id
                  ? "bg-pink-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {grouped.map((group) => (
          <section key={group.id}>
            <div className="flex items-baseline gap-2 mb-2.5">
              <h3 className="text-xs font-bold text-slate-800">{group.label}</h3>
              <span className="text-[11px] text-slate-500">{group.desc}</span>
              <span className="ml-auto text-[10px] font-semibold text-pink-500">{group.items.length}</span>
            </div>
            <div className="flex flex-wrap gap-2.5 items-end">
              {group.items.map((frame) => {
                const active = selectedId === frame.id;
                const thumb = getThumbSpec(frame.layoutType);
                return (
                  <motion.button
                    key={frame.id}
                    type="button"
                    onClick={() => onSelect(frame)}
                    whileTap={{ scale: 0.98 }}
                    className="shrink-0 text-left"
                    style={{ width: thumb.w }}
                  >
                    <div
                      className={`relative overflow-hidden rounded-lg transition-shadow duration-200 ${
                        active
                          ? "ring-2 ring-[#E85C9C] shadow-md shadow-pink-500/25"
                          : "ring-1 ring-pink-100/80 hover:ring-pink-200"
                      }`}
                      style={{ width: thumb.w, height: thumb.h }}
                    >
                      {active && (
                        <span className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full bg-[#E85C9C] text-white flex items-center justify-center shadow-sm">
                          <CheckCircleIcon className="w-3 h-3" />
                        </span>
                      )}
                      <FrameThumb
                        src={frame.src}
                        active={active}
                        alt={frame.label}
                        wrapperClassName="relative w-full h-full"
                      />
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 mt-1 truncate leading-tight">
                      {frameThemeName(frame)}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </section>
        ))}

        {grouped.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-medium text-slate-500">Không tìm thấy khung phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Thử bộ lọc khác hoặc xóa từ khóa</p>
          </div>
        )}
      </div>
    </div>
  );
}
