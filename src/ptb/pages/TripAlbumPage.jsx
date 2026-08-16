import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import SlideNav from "../../components/SlideNav";
import AlbumHeaderCard from "../components/ui/AlbumHeaderCard";
import PrintCheckout from "../components/PrintCheckout";
import StripEditor from "../components/StripEditor";
import AlbumPageLayout from "../components/ui/AlbumPageLayout";
import SaveSuccessCard from "../components/ui/SaveSuccessCard";
import PtbToast from "../components/ui/PtbToast";
import { usePtbAlbum } from "../hooks/usePtbAlbum";
import { cn, ptb } from "../lib/theme";

export default function TripAlbumPage() {
  const { shareToken } = useParams();
  const [view, setView] = useState("create"); // create | print
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [galleryTab, setGalleryTab] = useState("frames");
  const [frameDrawerOpen, setFrameDrawerOpen] = useState(false);
  // Giữ option in ở page — không mất khi remount StripEditor sau khi lưu
  const [printBw, setPrintBw] = useState(false);
  const [printNoCrop, setPrintNoCrop] = useState(false);

  const {
    album,
    printRequests,
    loading,
    error,
    uploadStrip,
    submitPrint,
    isReadonly,
    freeRemaining,
  } = usePtbAlbum(shareToken);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleSaveStrip = async (blob, meta) => {
    setSaving(true);
    try {
      await uploadStrip(blob, meta);
      setJustSaved(true);
    } catch (err) {
      const timedOut =
        err?.code === "ECONNABORTED" ||
        /timeout/i.test(err?.message || "");
      const canceled = err?.code === "ERR_CANCELED";
      showToast(
        timedOut || canceled
          ? "Lưu ảnh bị gián đoạn — kiểm tra mạng và thử lại"
          : err?.response?.data?.message || err?.message || "Lưu thất bại",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPrint = async (body) => {
    setSubmitting(true);
    try {
      const result = await submitPrint(body);
      showToast("Đã gửi yêu cầu in. Shop sẽ in và giao khi bạn trả máy.");
      return result;
    } catch (err) {
      showToast(
        err?.response?.data?.message || err?.message || "Không gửi được yêu cầu in",
        "error",
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const openAlbumTab = () => {
    setJustSaved(false);
    setView("create");
    setGalleryTab("album");
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setFrameDrawerOpen(true);
    }
  };

  const openPrint = () => {
    setJustSaved(false);
    setFrameDrawerOpen(false);
    setView("print");
  };

  if (loading) {
    return (
      <div className={cn(ptb.pageBg, "flex min-h-dvh items-center justify-center")}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F1E4EC] border-t-[#E6007E]" />
          <p className={ptb.textBody}>Đang mở album…</p>
        </div>
      </div>
    );
  }

  if (error && !album) {
    return (
      <div className={cn(ptb.pageBg, ptb.contentPb)}>
        <SlideNav mobileOnly />
        <div className="px-4 pt-8">
          <div className={cn(ptb.card, "mx-auto max-w-md p-6 text-center")}>
            <p className="text-sm font-semibold text-red-600">{error}</p>
            <Link
              to="/my-bookings"
              className="mt-4 inline-block text-sm font-bold text-[#E6007E] hover:underline"
            >
              Về đơn của tôi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AlbumPageLayout>
      <SlideNav mobileOnly />

      <AlbumHeaderCard album={album} isReadonly={isReadonly} />

      {view === "print" ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className={cn(ptb.card, "p-4 sm:p-5 lg:p-6")}>
            <button
              type="button"
              onClick={() => setView("create")}
              className="mb-4 text-[13px] font-bold text-[#E6007E] hover:underline"
            >
              ← Về ghép ảnh
            </button>
            <PrintCheckout
              images={album?.images ?? []}
              freeRemaining={freeRemaining}
              disabled={isReadonly}
              onSubmit={handleSubmitPrint}
              submitting={submitting}
              onToast={showToast}
              printBw={printBw}
              printNoCrop={printNoCrop}
              onPrintBwChange={setPrintBw}
              onPrintNoCropChange={setPrintNoCrop}
            />
          </div>
        </div>
      ) : justSaved ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <SaveSuccessCard
            freeRemaining={freeRemaining}
            onContinue={() => {
              setJustSaved(false);
              setEditorKey((k) => k + 1);
              setGalleryTab("frames");
            }}
            onViewAlbum={openAlbumTab}
            onGoPrint={openPrint}
          />
        </div>
      ) : (
        <StripEditor
          key={editorKey}
          disabled={isReadonly}
          onSave={handleSaveStrip}
          saving={saving}
          onError={(msg) => showToast(msg, "error")}
          albumImages={album?.images ?? []}
          printRequests={printRequests}
          freeRemaining={freeRemaining}
          printSubmitting={submitting}
          onSubmitPrint={handleSubmitPrint}
          galleryTab={galleryTab}
          onGalleryTabChange={setGalleryTab}
          openFrameDrawer={frameDrawerOpen}
          onFrameDrawerOpenChange={setFrameDrawerOpen}
          printBw={printBw}
          printNoCrop={printNoCrop}
          onPrintBwChange={setPrintBw}
          onPrintNoCropChange={setPrintNoCrop}
        />
      )}

      {error ? (
        <p className="text-center text-[13px] font-medium text-red-600">{error}</p>
      ) : null}

      <PtbToast
        message={toast?.message}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </AlbumPageLayout>
  );
}
