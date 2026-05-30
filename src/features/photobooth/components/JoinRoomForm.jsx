import React, { useState } from "react";
import { motion } from "framer-motion";
import { CameraIcon, ArrowRightIcon } from "@heroicons/react/24/solid";
import { loadCustomerInfo } from "../../../utils/storage";
import { ptbBtnGradient, ptbHeroGradient } from "../theme";

export default function JoinRoomForm({ onJoin, loading, defaultName }) {
  const saved = loadCustomerInfo();
  const [name, setName] = useState(defaultName || saved?.fullName || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onJoin(name.trim() || "Bạn");
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="relative max-w-sm mx-auto overflow-hidden rounded-3xl bg-white border border-pink-100 shadow-xl shadow-pink-500/10"
    >
      <div className={`h-28 ${ptbHeroGradient} relative`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
        <div className="absolute bottom-4 left-5 flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <CameraIcon className="w-6 h-6 text-white" />
          </span>
          <div className="text-white">
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-90">Photobooth</p>
            <p className="text-lg font-bold leading-tight">Album chuyến đi</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-600 text-center">
          Nhập tên hiển thị để mọi người biết ảnh của bạn
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="VD: Linh, Minh, Team FAO..."
          maxLength={60}
          className="w-full px-4 py-3.5 rounded-2xl border border-pink-100 bg-pink-50/40 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 min-h-[52px] rounded-2xl ${ptbBtnGradient} text-sm flex items-center justify-center gap-2 disabled:opacity-60`}
        >
          {loading ? "Đang vào phòng..." : "Vào phòng ngay"}
          {!loading && <ArrowRightIcon className="w-4 h-4" />}
        </button>
      </div>
    </motion.form>
  );
}
