import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SlideNav from "../../components/SlideNav";
import AlbumGallery from "../components/AlbumGallery";
import AlbumHeaderCard from "../components/ui/AlbumHeaderCard";
import PrintCheckout from "../components/PrintCheckout";
import StripEditor from "../components/StripEditor";
import AlbumPageLayout from "../components/ui/AlbumPageLayout";
import StepSegmentedTabs from "../components/ui/StepSegmentedTabs";
import SaveSuccessCard from "../components/ui/SaveSuccessCard";
import PtbToast from "../components/ui/PtbToast";
import { usePtbAlbum } from "../hooks/usePtbAlbum";
import { cn, ptb } from "../lib/theme";

export default function TripAlbumPage() {
  const { shareToken } = useParams();
  const [tab, setTab] = useState("create");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

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

  const albumCount = album?.images?.length ?? 0;

  const tabs = useMemo(
    () => [
      { id: "create", label: "Ghép ảnh" },
      { id: "gallery", label: "Album", badge: albumCount > 0 ? albumCount : undefined },
      { id: "print", label: "Đặt in" },
    ],
    [albumCount],
  );

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleTabChange = (id) => {
    if (id !== "create") setJustSaved(false);
    setTab(id);
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
      return await submitPrint(body);
    } finally {
      setSubmitting(false);
    }
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
        <div className={cn(ptb.container, "pt-8")}>
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

      <div className="sticky top-0 z-10 -mx-1 bg-[linear-gradient(180deg,#FFF7FB_85%,transparent)] px-1 pb-2 pt-1 lg:static lg:bg-transparent lg:p-0">
        <StepSegmentedTabs tabs={tabs} activeId={tab} onChange={handleTabChange} />
      </div>

      <div className={cn(tab === "create" ? "" : cn(ptb.card, "p-4 sm:p-5 lg:p-6"))}>
        {tab === "create" ? (
          justSaved ? (
            <SaveSuccessCard
              freeRemaining={freeRemaining}
              onContinue={() => {
                setJustSaved(false);
                setEditorKey((k) => k + 1);
              }}
              onViewAlbum={() => {
                setJustSaved(false);
                setTab("gallery");
              }}
              onGoPrint={() => {
                setJustSaved(false);
                setTab("print");
              }}
            />
          ) : (
            <StripEditor
              key={editorKey}
              disabled={isReadonly}
              onSave={handleSaveStrip}
              saving={saving}
              onError={(msg) => showToast(msg, "error")}
            />
          )
        ) : null}
        {tab === "print" ? (
          <PrintCheckout
            images={album?.images ?? []}
            freeRemaining={freeRemaining}
            disabled={isReadonly}
            onSubmit={handleSubmitPrint}
            submitting={submitting}
            onToast={showToast}
          />
        ) : null}
        {tab === "gallery" ? (
          <AlbumGallery
            images={album?.images ?? []}
            printRequests={printRequests}
          />
        ) : null}
      </div>

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
