import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function FramePicker({ frames, selectedId, onSelect }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => {
    const set = new Set(frames.map((f) => f.frameCategoryName).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [frames]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return frames.filter((f) => {
      if (category !== "all" && f.frameCategoryName !== category) return false;
      if (!q) return true;
      return (
        (f.label || "").toLowerCase().includes(q) ||
        (f.frameCategoryName || "").toLowerCase().includes(q)
      );
    });
  }, [frames, search, category]);

  const selected = frames.find((f) => f.id === selectedId) ?? filtered[0];

  return (
    <div className="space-y-4">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm frame..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-pink-100 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              category === cat
                ? "bg-pink-600 text-white"
                : "bg-white border border-pink-100 text-slate-600 hover:bg-pink-50"
            }`}
          >
            {cat === "all" ? "Tất cả" : cat}
          </button>
        ))}
      </div>

      {selected && (
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-pink-100 bg-gradient-to-b from-white to-pink-50/40 p-4"
        >
          <div className="flex justify-center">
            <img
              src={selected.src}
              alt={selected.label}
              className="max-h-48 object-contain drop-shadow-md"
            />
          </div>
          <p className="text-center text-sm font-bold text-pink-900 mt-2">{selected.label}</p>
        </motion.div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {filtered.map((frame) => (
          <button
            key={frame.id}
            type="button"
            onClick={() => onSelect(frame)}
            className={`snap-start shrink-0 w-24 rounded-xl border-2 overflow-hidden transition-all hover:scale-105 ${
              selectedId === frame.id
                ? "border-pink-500 ring-2 ring-pink-200 shadow-lg"
                : "border-pink-100 bg-white"
            }`}
          >
            <img src={frame.src} alt={frame.label} className="w-full h-28 object-cover" />
            <p className="text-[9px] font-semibold text-slate-600 px-1 py-1 truncate">
              {frame.layoutType}
            </p>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-slate-500 py-6">Không tìm thấy frame phù hợp</p>
      )}
    </div>
  );
}
