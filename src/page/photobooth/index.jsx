import React from "react";
import { Link } from "react-router-dom";
import {
  CameraIcon,
  GiftIcon,
  PhotoIcon,
} from "@heroicons/react/24/solid";
import SlideNav from "../../components/SlideNav";
import { loadRecentOrder } from "../../utils/storage";
import { FREE_PRINT_QUOTA } from "../../ptb/lib/constants";

export default function PhotoBoothPage() {
  const recent = loadRecentOrder();
  const albumHref = recent?.orderIdNew
    ? `/album/order/${recent.orderIdNew}`
    : "/my-bookings";

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white via-pink-50 to-pink-100">
      <SlideNav />
      <div className="mx-auto max-w-lg px-4 py-8 pb-28">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100">
            <CameraIcon className="h-8 w-8 text-pink-600" />
          </div>
          <h1 className="text-2xl font-black text-pink-900">
            Photobooth FAO
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Thuê máy ảnh — ghép ảnh chuyến đi vào khung độc quyền.
            Nhận <strong>{FREE_PRINT_QUOTA} strip in miễn phí</strong> khi trả máy tại shop.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <div className="flex gap-3 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
            <GiftIcon className="h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-bold text-slate-800">Quà tặng khi trả máy</p>
              <p className="mt-1 text-sm text-slate-600">
                {FREE_PRINT_QUOTA} ảnh strip 5×15 cm in đẹp, không phai màu — miễn phí mỗi đơn thuê.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
            <PhotoIcon className="h-6 w-6 shrink-0 text-pink-600" />
            <div>
              <p className="font-bold text-slate-800">Ghép online trên điện thoại</p>
              <p className="mt-1 text-sm text-slate-600">
                Chọn khung, thêm ảnh từ chuyến đi, đặt in trước khi đến shop trả máy.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to={albumHref}
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-pink-600 px-6 py-3 text-center text-sm font-bold text-white hover:bg-pink-700"
          >
            Mở album chuyến đi
          </Link>
          <Link
            to="/catalog"
            className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-pink-200 bg-white px-6 py-3 text-center text-sm font-bold text-pink-700 hover:bg-pink-50"
          >
            Thuê máy ảnh
          </Link>
        </div>
      </div>
    </div>
  );
}
