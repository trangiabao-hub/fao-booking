import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  PlusIcon,
  SparklesIcon,
  SignalIcon,
  CameraIcon,
} from "@heroicons/react/24/solid";
import AlbumSharePanel from "./AlbumSharePanel";
import AlbumGalleryGrid from "./AlbumGalleryGrid";
import {
  MOBILE_ALBUM_SCROLL_PAD,
  MOBILE_CTA_DOCK_BOTTOM,
  mobileDockInner,
  mobileDockOuter,
  ptbBtnGradient,
  ptbCard,
  ptbHeroGradient,
} from "../theme";

function LiveBadge({ onDark = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ring-1 ${
        onDark
          ? "bg-white/20 text-white ring-white/30"
          : "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20"
      }`}
    >
      <SignalIcon className="w-3 h-3 animate-pulse" />
      Live
    </span>
  );
}

function BackControl({ backHref, onBack, className = "" }) {
  const base =
    "p-2.5 rounded-2xl bg-white border border-pink-100 text-pink-800 shadow-sm shrink-0 hover:shadow-md hover:border-pink-200 transition-shadow touch-manipulation";
  if (backHref) {
    return (
      <Link to={backHref} className={`${base} ${className}`}>
        <ArrowLeftIcon className="w-5 h-5" />
      </Link>
    );
  }
  return (
    <button type="button" onClick={onBack} className={`${base} ${className}`}>
      <ArrowLeftIcon className="w-5 h-5" />
    </button>
  );
}

function CreateButton({ onClick, className = "", label = "Tạo strip mới" }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      className={`group relative overflow-hidden flex items-center justify-center gap-2.5 ${ptbBtnGradient} ${className}`}
    >
      <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <SparklesIcon className="w-5 h-5 shrink-0" />
      <span>{label}</span>
      <PlusIcon className="w-5 h-5 opacity-80 shrink-0" />
    </motion.button>
  );
}

function SaveToast({ message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 md:mb-5 lg:mb-6 rounded-2xl bg-emerald-500 text-white px-4 md:px-5 py-3 md:py-3.5 text-sm font-semibold text-center flex items-center justify-center gap-2"
    >
      <SparklesIcon className="w-5 h-5 hidden lg:inline" />
      {message}
    </motion.div>
  );
}

/**
 * Album view thống nhất — chủ phòng (đơn thuê) & phòng nhóm dùng chung layout
 * responsive mobile / iPad / PC.
 */
export default function PhotoboothAlbumView({
  title,
  subtitle,
  backHref,
  onBack,
  backLabel = "Quay lại",
  shareToken,
  images,
  imageCount,
  saveToast,
  saveToastMessage = "✨ Đã lưu vào album!",
  onCreateNew,
  orderLink,
  galleryTitle = "Thư viện album",
  emptyLabel = "Chưa có ảnh nào",
  emptyHint = "Strip đầu tiên sẽ hiện ở đây",
  createLabel = "Tạo strip mới",
  live = false,
  eyebrow = "Photobooth Album",
}) {
  const count = imageCount ?? images?.length ?? 0;
  const contributors = new Set(
    (images ?? []).map((i) => i.createdByName).filter(Boolean)
  ).size;
  const statsLine =
    contributors > 0
      ? `${count} ảnh · ${contributors} thành viên`
      : `${count} ảnh`;

  return (
    <>
      {/* ─── MOBILE (< md) ─── */}
      <div className="md:hidden">
        <header className="flex items-start gap-3 mb-5">
          <BackControl backHref={backHref} onBack={onBack} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {live && <LiveBadge />}
              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">
                {eyebrow}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
            {(subtitle || count > 0) && (
              <p className="text-xs text-slate-500 mt-1">{subtitle || statsLine}</p>
            )}
          </div>
        </header>

        {saveToast && <SaveToast message={saveToastMessage} />}

        <div className="space-y-4" style={{ paddingBottom: MOBILE_ALBUM_SCROLL_PAD }}>
          {shareToken && (
            <AlbumSharePanel shareToken={shareToken} title={title} variant="card" />
          )}
          <section className={ptbCard + " p-4"}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800">{galleryTitle}</h2>
              <CameraIcon className="w-4 h-4 text-pink-400" />
            </div>
            <AlbumGalleryGrid
              images={images}
              emptyLabel={emptyLabel}
              emptyHint={emptyHint}
            />
          </section>
          {orderLink && (
            <Link
              to={orderLink}
              className="block text-center text-xs font-semibold text-pink-600"
            >
              Xem đơn thuê gốc →
            </Link>
          )}
        </div>

        {/* CTA dock — cùng px-3 / max-w-md với SlideNav, nằm ngay trên nav */}
        <div
          className={`fixed inset-x-0 z-[68] ${mobileDockOuter} pointer-events-none md:hidden`}
          style={{ bottom: MOBILE_CTA_DOCK_BOTTOM }}
        >
          <div className={`${mobileDockInner} pointer-events-auto pb-2`}>
            <CreateButton
              onClick={onCreateNew}
              label={createLabel}
              className="w-full py-3.5 min-h-[48px] rounded-2xl text-base shadow-lg shadow-pink-500/20"
            />
          </div>
        </div>
      </div>

      {/* ─── iPAD (md – lg) ─── */}
      <div className="hidden md:block lg:hidden">
        <div
          className={`rounded-[2rem] overflow-hidden ${ptbHeroGradient} text-white p-6 sm:p-8 mb-6 shadow-xl shadow-pink-500/25`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {live && <LiveBadge onDark />}
                <span className="text-xs font-medium text-white/80">{eyebrow}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{title}</h1>
              <p className="text-sm text-white/75 mt-2">
                {subtitle ||
                  `${count} strip${contributors ? ` · ${contributors} người đã tạo` : ""}${live ? " · cập nhật liên tục" : ""}`}
              </p>
            </div>
            <BackControl
              backHref={backHref}
              onBack={onBack}
              className="!bg-white/15 !border-white/20 !text-white hover:!bg-white/25"
            />
          </div>
          <CreateButton
            onClick={onCreateNew}
            label={createLabel}
            className="mt-6 w-full sm:w-auto px-8 py-3.5 min-h-[48px] rounded-2xl text-sm !shadow-white/20"
          />
        </div>

        {saveToast && <SaveToast message={saveToastMessage} />}

        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] gap-5 items-start">
          <section className={`${ptbCard} p-5 order-2 md:order-1`}>
            <h2 className="text-base font-bold text-slate-800 mb-4">{galleryTitle}</h2>
            <AlbumGalleryGrid
              images={images}
              emptyLabel={emptyLabel}
              emptyHint={emptyHint}
            />
          </section>
          <aside className="space-y-4 order-1 md:order-2 md:sticky md:top-24">
            {shareToken && (
              <AlbumSharePanel shareToken={shareToken} title={title} variant="banner" />
            )}
            {orderLink && (
              <Link
                to={orderLink}
                className="block text-center text-sm font-semibold text-pink-600 hover:underline py-2"
              >
                Xem đơn thuê máy gốc →
              </Link>
            )}
          </aside>
        </div>
      </div>

      {/* ─── PC (≥ lg) ─── */}
      <div className="hidden lg:block">
        <header className="flex items-end justify-between gap-6 mb-8 pb-6 border-b border-pink-100/80">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {live && <LiveBadge />}
              <span className="text-xs font-bold text-pink-500 uppercase tracking-[0.2em]">
                {eyebrow}
              </span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-sm text-slate-500 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>{count} ảnh trong album</span>
              {contributors > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{contributors} thành viên đã tạo</span>
                </>
              )}
              {subtitle && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>{subtitle}</span>
                </>
              )}
              {live && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span className="text-emerald-600 font-medium">Đồng bộ realtime</span>
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {backHref ? (
              <Link
                to={backHref}
                className="px-4 py-2.5 rounded-2xl border border-pink-100 bg-white text-sm font-semibold text-slate-600 hover:bg-pink-50 transition-colors"
              >
                {backLabel}
              </Link>
            ) : onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 rounded-2xl border border-pink-100 bg-white text-sm font-semibold text-slate-600 hover:bg-pink-50 transition-colors"
              >
                {backLabel}
              </button>
            ) : null}
            <CreateButton
              onClick={onCreateNew}
              label={createLabel}
              className="px-6 py-3.5 min-h-[48px] rounded-2xl text-sm"
            />
          </div>
        </header>

        {saveToast && (
          <SaveToast message={`${saveToastMessage.replace(/^✨\s*/, "")} — tuyệt vời!`} />
        )}

        <div className="grid lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(300px,340px)_1fr] gap-8 items-start">
          <aside className="space-y-5 lg:sticky lg:top-24">
            {shareToken && (
              <AlbumSharePanel shareToken={shareToken} title={title} variant="sidebar" />
            )}

            <div className={`${ptbCard} p-5`}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Thống kê album
              </p>
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-pink-50 px-4 py-3">
                  <dt className="text-[10px] font-semibold text-pink-400 uppercase">Ảnh</dt>
                  <dd className="text-2xl font-bold text-pink-900 tabular-nums">{count}</dd>
                </div>
                <div className="rounded-2xl bg-pink-50/60 px-4 py-3 ring-1 ring-pink-100">
                  <dt className="text-[10px] font-semibold text-pink-400 uppercase">
                    {contributors > 0 ? "Thành viên" : "Strip"}
                  </dt>
                  <dd className="text-2xl font-bold text-pink-900 tabular-nums">
                    {contributors || count || "—"}
                  </dd>
                </div>
              </dl>
            </div>

            {orderLink && (
              <Link
                to={orderLink}
                className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-pink-200 py-3 text-sm font-semibold text-pink-600 hover:bg-pink-50 transition-colors"
              >
                Xem đơn thuê máy gốc →
              </Link>
            )}
          </aside>

          <main className={`${ptbCard} min-h-[480px]`}>
            <div className="px-6 py-4 border-b border-pink-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{galleryTitle}</h2>
              <span className="text-xs text-slate-500">Bấm ảnh để xem full · hover để tải</span>
            </div>
            <div className="p-6 pb-8">
              <AlbumGalleryGrid
                images={images}
                emptyLabel={emptyLabel}
                emptyHint={emptyHint}
              />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
