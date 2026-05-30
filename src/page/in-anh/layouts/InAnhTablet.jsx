import React from "react";
import { Link } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/solid";
import FloatingContactButton from "../../../components/FloatingContactButton";
import { ptbShellBg } from "../../../features/photobooth/theme";
import InAnhSamplesShowcase from "../components/InAnhSamplesShowcase";
import InAnhCta from "../components/InAnhCta";

export default function InAnhTablet() {
  return (
    <div className={`${ptbShellBg} min-h-dvh pb-10`}>
      <div className="mx-auto max-w-4xl px-5 md:px-8 pt-6 pb-10">
        <header className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 text-pink-800">
            <CameraIcon className="w-7 h-7 text-pink-500" />
            <span className="text-lg font-bold">FAO Booking</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold text-slate-600">
            <Link to="/catalog" className="hover:text-pink-600 transition-colors">
              Đặt máy
            </Link>
            <Link to="/my-bookings" className="hover:text-pink-600 transition-colors">
              Đơn của tôi
            </Link>
          </nav>
        </header>

        <InAnhSamplesShowcase variant="tablet" />
        <InAnhCta layout="row" variant="tablet" className="mt-8 max-w-2xl mx-auto" />
      </div>

      <FloatingContactButton />
    </div>
  );
}
