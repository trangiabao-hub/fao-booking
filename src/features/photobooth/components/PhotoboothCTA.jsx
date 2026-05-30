import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CameraIcon, UserGroupIcon } from "@heroicons/react/24/solid";
import PhotoboothMarketingShowcase from "./PhotoboothMarketingShowcase";

export default function PhotoboothCTA({ orderIdNew, orderCode, compact = false }) {
  if (!orderIdNew && !orderCode) return null;

  const createHref = orderIdNew
    ? `/photobooth/create?orderIdNew=${encodeURIComponent(orderIdNew)}`
    : `/photobooth/create?orderCode=${encodeURIComponent(orderCode)}`;

  if (compact) {
    return (
      <Link
        to={createHref}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 text-white text-sm font-bold hover:bg-pink-700 transition-colors"
      >
        <CameraIcon className="w-4 h-4" />
        Tạo photobooth
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 via-white to-pink-50/80 p-5 shadow-md shadow-pink-500/10 overflow-hidden relative"
    >
      <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider bg-pink-600 text-white px-2 py-0.5 rounded-full">
        Mới
      </span>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center shrink-0">
          <CameraIcon className="w-6 h-6 text-pink-600" />
        </div>
        <div>
          <h3 className="text-base font-black text-pink-900 pr-12">Tạo ảnh photobooth</h3>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Biến kỷ niệm chuyến đi thành strip ảnh đẹp — miễn phí cho khách đã đặt đơn.
          </p>
        </div>
      </div>

      <PhotoboothMarketingShowcase className="mt-4 py-3 px-2 rounded-xl bg-white/70 border border-pink-100/80" />

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <Link
          to={createHref}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-pink-600 text-white font-bold text-sm hover:bg-pink-700 transition-colors"
        >
          <CameraIcon className="w-4 h-4" />
          Bắt đầu tạo
        </Link>
        {orderIdNew && (
          <Link
            to={createHref}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-pink-200 text-pink-800 font-bold text-sm hover:bg-pink-50 transition-colors"
          >
            <UserGroupIcon className="w-4 h-4" />
            Mời bạn bè
          </Link>
        )}
      </div>
    </motion.div>
  );
}
