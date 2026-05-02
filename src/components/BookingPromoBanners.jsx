import { useCallback, useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import api from "../config/axios";
import "swiper/css";
import "swiper/css/pagination";

const SESSION_DISMISS_KEY = "faoBookingPromoModalDismissed";

/**
 * Banner marketing — hiển thị dạng modal lần đầu vào trang trong phiên (đóng rồi không lặp lại cho đến session mới).
 */
export default function BookingPromoBanners() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/public/booking-banners/active")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        if (!cancelled) setItems(list.filter((b) => b?.imageUrl));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!items.length) return;
    try {
      if (sessionStorage.getItem(SESSION_DISMISS_KEY)) return;
    } catch {
      /* private mode */
    }
    setOpen(true);
  }, [items]);

  const dismiss = useCallback(() => {
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open || !items.length) return null;

  const inner =
    items.length > 1 ? (
      <Swiper
        modules={[Pagination, Autoplay]}
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        autoHeight
        loop
        className="booking-promo-swiper w-full"
      >
        {items.map((b) => (
          <SwiperSlide key={b.id}>
            <BannerSlide banner={b} onDismiss={dismiss} />
          </SwiperSlide>
        ))}
      </Swiper>
    ) : (
      <BannerSlide banner={items[0]} onDismiss={dismiss} />
    );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Thông báo"
      onClick={dismiss}
    >
      <style>{`
        .booking-promo-swiper .swiper-pagination-bullet { background: #f472b6; opacity: 0.45; }
        .booking-promo-swiper .swiper-pagination-bullet-active { opacity: 1; background: #db2777; }
      `}</style>
      <div
        className="relative flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-pink-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-end px-2 pt-2">
          <button
            type="button"
            onClick={dismiss}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-3 sm:px-2 sm:pb-4">
          {inner}
        </div>
      </div>
    </div>
  );
}

function BannerSlide({ banner, onDismiss }) {
  const img = (
    <img
      src={banner.imageUrl}
      alt=""
      className="block h-auto w-full max-w-full object-contain object-top align-top"
      loading="eager"
      decoding="async"
    />
  );

  if (banner.linkUrl) {
    return (
      <a
        href={banner.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
        onClick={() => onDismiss?.()}
      >
        {img}
      </a>
    );
  }

  return <div className="w-full">{img}</div>;
}
