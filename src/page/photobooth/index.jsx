import React from "react";
import { Link } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/solid";

export default function PhotoBoothPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-white to-pink-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-pink-100 shadow-lg p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-100 flex items-center justify-center">
          <CameraIcon className="w-8 h-8 text-pink-600" />
        </div>
        <h1 className="text-xl font-bold text-pink-800 mb-2">Photobooth</h1>
        <p className="text-slate-600 mb-6">
          Tính năng photobooth đang được cập nhật. Vui lòng liên hệ shop để sử dụng.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 transition-colors"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
