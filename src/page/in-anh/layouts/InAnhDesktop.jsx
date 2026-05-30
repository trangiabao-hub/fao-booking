import React from "react";
import { Link } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/solid";
import FloatingContactButton from "../../../components/FloatingContactButton";
import { ptbShellBg } from "../../../features/photobooth/theme";
import InAnhSamplesShowcase from "../components/InAnhSamplesShowcase";
import InAnhCta from "../components/InAnhCta";

export default function InAnhDesktop() {
  return (
    <div className={`${ptbShellBg} min-h-dvh`}>
      <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl flex h-16 lg:h-[4.5rem] items-center justify-between px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2.5 text-pink-800">
            <CameraIcon className="w-8 h-8 text-pink-500" />
            <span className="text-xl font-bold tracking-tight">Fao Sài Gòn</span>
          </Link>
          <nav className="flex items-center gap-6 lg:gap-8 text-sm font-semibold text-slate-600">
            <Link to="/" className="hover:text-pink-600 transition-colors">
              Trang chủ
            </Link>
            <Link to="/catalog" className="hover:text-pink-600 transition-colors">
              Đặt máy
            </Link>
            <Link
              to="/in-anh"
              className="text-pink-600 border-b-2 border-pink-500 pb-0.5"
            >
              In ảnh
            </Link>
            <Link to="/my-bookings" className="hover:text-pink-600 transition-colors">
              Đơn của tôi
            </Link>
            <Link
              to="/catalog"
              className="ml-2 rounded-full bg-pink-600 px-5 py-2 text-white hover:bg-pink-700 transition-colors"
            >
              Đặt lịch ngay
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl xl:max-w-7xl px-6 lg:px-10 py-8 lg:py-12 pb-16">
        <InAnhSamplesShowcase variant="desktop" className="shadow-2xl shadow-pink-500/15" />
        <InAnhCta
          layout="row"
          variant="desktop"
          className="mt-10 lg:mt-12 max-w-2xl mx-auto"
        />
      </main>

      <FloatingContactButton />
    </div>
  );
}
