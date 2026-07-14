import React, { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import SlideNav from "../../components/SlideNav";
import AlbumGallery from "../components/AlbumGallery";
import AlbumHeaderCard from "../components/ui/AlbumHeaderCard";
import PrintCheckout from "../components/PrintCheckout";
import StripEditor from "../components/StripEditor";
import AlbumPageLayout from "../components/ui/AlbumPageLayout";
import StepSegmentedTabs from "../components/ui/StepSegmentedTabs";
import PtbToast from "../components/ui/PtbToast";
import { usePtbAlbum } from "../hooks/usePtbAlbum";
import { cn, ptb } from "../lib/theme";

const TABS = [
  { id: "create", label: "Ghép ảnh" },
  { id: "print", label: "Đặt in" },
  { id: "gallery", label: "Album" },
];

export default function TripAlbumPage() {
  const { shareToken } = useParams();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState("create");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

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

  const payStatus = searchParams.get("pay");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleSaveStrip = async (blob, meta) => {
    setSaving(true);
    try {
      await uploadStrip(blob, meta);
      showToast("Đã lưu vào album");
      setTab("print");
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

      {payStatus === "success" ? (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-[13px] font-semibold text-emerald-800">
          Thanh toán thành công! Shop sẽ in và giao khi bạn trả máy.
        </div>
      ) : null}
      {payStatus === "fail" ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-[13px] font-semibold text-amber-800">
          Thanh toán chưa hoàn tất. Bạn có thể thanh toán tại shop khi nhận ảnh.
        </div>
      ) : null}

      <AlbumHeaderCard album={album} isReadonly={isReadonly} />

      <div className="sticky top-0 z-10 -mx-1 bg-[linear-gradient(180deg,#FFF7FB_85%,transparent)] px-1 pb-2 pt-1 lg:static lg:bg-transparent lg:p-0">
        <StepSegmentedTabs tabs={TABS} activeId={tab} onChange={setTab} />
      </div>

      <div className={cn(tab === "create" ? "" : cn(ptb.card, "p-4 sm:p-5 lg:p-6"))}>
        {tab === "create" ? (
          <StripEditor
            disabled={isReadonly}
            onSave={handleSaveStrip}
            saving={saving}
            onError={(msg) => showToast(msg, "error")}
          />
        ) : null}
        {tab === "print" ? (
          <PrintCheckout
            images={album?.images ?? []}
            freeRemaining={freeRemaining}
            disabled={isReadonly}
            shareToken={shareToken}
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

      <p className={cn(ptb.textBody, "pb-2 text-center text-[12px]")}>
        Nhận <strong className="text-[#172033]">2 ảnh in miễn phí</strong> khi trả
        máy tại shop FAO.
      </p>

      <PtbToast
        message={toast?.message}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </AlbumPageLayout>
  );
}
