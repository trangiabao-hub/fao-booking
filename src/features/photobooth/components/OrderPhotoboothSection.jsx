import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CameraIcon, PlusIcon } from "@heroicons/react/24/solid";
import { fetchCollectionByOrder } from "../api/ptbTrip";
import AlbumGalleryGrid from "./AlbumGalleryGrid";
import AlbumSharePanel from "./AlbumSharePanel";

export default function OrderPhotoboothSection({ orderIdNew }) {
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderIdNew) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetchCollectionByOrder(orderIdNew)
      .then((data) => {
        if (!cancelled) setCollection(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderIdNew]);

  if (!orderIdNew) return null;

  const createHref = `/photobooth/create?orderIdNew=${encodeURIComponent(orderIdNew)}`;
  const createNewHref = `${createHref}&new=1`;

  return (
    <section className="rounded-2xl border border-[#EADCE3] bg-white overflow-hidden">
      <div className="px-4 py-3.5 sm:px-5 border-b border-[#F5E9EF] bg-[#FFFCFD] flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-[#222] tracking-tight flex items-center gap-2">
            <CameraIcon className="w-4 h-4 text-pink-600" />
            Kỷ niệm chuyến đi
          </h2>
          <p className="text-xs text-[#888] mt-0.5">
            {collection?.images?.length
              ? `${collection.images.length} ảnh · bấm Tạo mới để thêm`
              : "Photobooth gắn với đơn thuê máy"}
          </p>
        </div>
        <Link
          to={createNewHref}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-pink-600 text-white text-xs font-bold hover:bg-pink-700"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Tạo mới
        </Link>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {loading && (
          <p className="text-xs text-slate-400 text-center py-4">Đang tải album...</p>
        )}
        {error && !loading && (
          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{error}</p>
        )}
        {!loading && !error && (
          <>
            {collection?.shareToken && (
              <AlbumSharePanel
                shareToken={collection.shareToken}
                title={collection.title}
                variant="card"
              />
            )}
            <AlbumGalleryGrid
              images={collection?.images}
              emptyLabel="Chưa có ảnh — tạo strip photobooth đầu tiên!"
              emptyHint="Bấm Tạo mới để bắt đầu"
            />
            <Link
              to={createHref}
              className="block w-full text-center py-3 rounded-xl border border-pink-200 bg-white text-pink-800 font-bold text-sm hover:bg-pink-50 transition-colors"
            >
              Xem album photobooth
            </Link>
            <Link
              to={createNewHref}
              className="block w-full text-center py-3 rounded-xl bg-pink-600 text-white font-bold text-sm hover:bg-pink-700 transition-colors"
            >
              Tạo ảnh photobooth mới
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
