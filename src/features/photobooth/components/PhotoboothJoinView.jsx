import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import PhotoboothShell from "./PhotoboothShell";
import JoinRoomForm from "./JoinRoomForm";

/** Màn hình join phòng — dùng shell chung với album */
export default function PhotoboothJoinView({ onJoin, loading, defaultName, error, shareToken }) {
  return (
    <PhotoboothShell>
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-8">
        <div className="w-full max-w-sm md:hidden">
          <JoinRoomForm onJoin={onJoin} loading={loading} defaultName={defaultName} />
        </div>

        <div className="hidden md:grid md:grid-cols-2 md:gap-10 lg:gap-16 items-center w-full max-w-4xl lg:max-w-5xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-left space-y-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-pink-500">
              FAO Photobooth
            </p>
            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-slate-900 leading-[1.15]">
              Album kỷ niệm
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#E85C9C] to-[#FF9FCA]">
                cùng nhóm bạn
              </span>
            </h1>
            <p className="text-slate-600 text-base lg:text-lg leading-relaxed max-w-md">
              Mỗi người tạo strip riêng — tất cả gom về một album, cập nhật ngay lập tức.
            </p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                Chọn khung · chỉnh ảnh · xuất strip
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF9FCA]" />
                Xem & tải ảnh của cả nhóm
              </li>
            </ul>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <JoinRoomForm onJoin={onJoin} loading={loading} defaultName={defaultName} />
          </motion.div>
        </div>

        {error && <p className="mt-6 text-sm text-red-600 text-center">{error}</p>}
        {!shareToken && (
          <Link to="/" className="mt-8 text-sm text-pink-600 font-semibold hover:underline">
            ← Về trang chủ
          </Link>
        )}
      </div>
    </PhotoboothShell>
  );
}
