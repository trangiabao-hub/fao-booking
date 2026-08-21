import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CircleHelp } from "lucide-react";
import {
  ensureSession,
  fetchAlbumByToken,
  submitGuestPrintNow,
} from "../api/ptbApi";
import StripEditor from "../components/StripEditor";
import AlbumPageLayout from "../components/ui/AlbumPageLayout";
import PtbOnboardingModal from "../components/ui/PtbOnboardingModal";
import PtbToast from "../components/ui/PtbToast";
import PtbTour from "../components/ui/PtbTour";
import { PTB_INSTANT_TOUR_STEPS } from "../lib/onboarding";
import { buildPtbPrintNote } from "../lib/printOptions";
import { cn, ptb } from "../lib/theme";

function formatRemain(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "đã hết hạn";
  const m = Math.max(1, Math.round(ms / 60000));
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `còn ${h}g ${rm}p` : `còn ${h} giờ`;
  }
  return `còn ${m} phút`;
}

/**
 * Link tạm từ staff — editor giống /photo-frame, bấm In → hàng in CONFIRMED.
 */
export default function GuestFramePage() {
  const { shareToken } = useParams();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printBw, setPrintBw] = useState(false);
  const [printNoCrop, setPrintNoCrop] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [toast, setToast] = useState(null);
  const [galleryTab, setGalleryTab] = useState("frames");
  const [frameDrawerOpen, setFrameDrawerOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const introShownRef = useRef(false);
  const tourTimerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(tourTimerRef.current), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shareToken) return;
      setLoading(true);
      setError("");
      try {
        const { album: data } = await ensureSession(shareToken, "Khách");
        if (cancelled) return;
        if (!data?.shareExpiresAt) {
          setError("Link này không phải link tạm — dùng album chuyến đi.");
          setAlbum(null);
          return;
        }
        if (new Date(data.shareExpiresAt).getTime() <= Date.now()) {
          setError("Link tạm đã hết hạn.");
          setAlbum(null);
          return;
        }
        setAlbum(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Không mở được link",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  // Chào mỗi lần mở link. Chốt bằng ref để lần refetch album sau khi in
  // không bật lại modal giữa lúc khách đang ghép tấm tiếp theo.
  useEffect(() => {
    if (loading || !album) return;
    if (introShownRef.current) return;
    introShownRef.current = true;
    setShowIntro(true);
  }, [loading, album]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const dismissIntro = () => setShowIntro(false);

  const startTour = () => {
    dismissIntro();
    // Chờ modal trượt xuống xong rồi mới khoét sáng, tránh hai lớp overlay chồng nhau.
    tourTimerRef.current = window.setTimeout(() => setTourOpen(true), 260);
  };

  const handleInstantPrint = async (blob, meta = {}) => {
    if (!shareToken || !blob) return;
    setPrinting(true);
    try {
      const form = new FormData();
      form.append("files", blob, `strip-${Date.now()}.jpg`);
      form.append("layoutTypes", meta.layoutType || "1x4");
      form.append("copies", "1");
      const note =
        buildPtbPrintNote({
          printBw: meta.printBw ?? printBw,
          printNoCrop: meta.printNoCrop ?? printNoCrop,
          bwBaked: Boolean(meta.bwBaked),
          extra: "In link tạm",
        }) || "In link tạm";
      form.append("note", note);
      const result = await submitGuestPrintNow(shareToken, form);
      showToast(
        result?.id
          ? `Đã gửi in #${result.id} — máy in sẽ nhận hàng.`
          : "Đã gửi in — máy in sẽ nhận hàng.",
      );
      try {
        const fresh = await fetchAlbumByToken(shareToken);
        setAlbum(fresh);
      } catch {
        /* ignore */
      }
    } catch (err) {
      showToast(
        err?.response?.data?.message || err?.message || "Không gửi được in",
        "error",
      );
      throw err;
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className={cn(ptb.pageBg, "flex min-h-dvh items-center justify-center")}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#F1E4EC] border-t-[#E6007E]" />
          <p className={ptb.textBody}>Đang mở link tạm…</p>
        </div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className={cn(ptb.pageBg, ptb.contentPb)}>
        <div className="px-4 pt-8">
          <div className={cn(ptb.card, "mx-auto max-w-md p-6 text-center")}>
            <p className="text-sm font-semibold text-red-600">
              {error || "Không mở được link"}
            </p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-bold text-[#E6007E] hover:underline"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const remain = formatRemain(album.shareExpiresAt);

  return (
    <AlbumPageLayout reserveNav={false}>
      <header
        className={cn(ptb.card, "flex shrink-0 items-center gap-2 px-3 py-1.5")}
      >
        <p className="m-0 min-w-0 flex-1 truncate text-[13px] font-semibold leading-snug text-[#172033]">
          Ghép frame · in ngay
          {remain ? (
            <span className="ml-1.5 font-medium text-[#E6007E]">({remain})</span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => setShowIntro(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#F3D4E4] px-2.5 py-1 text-[11px] font-bold text-[#D9488A] transition-colors hover:bg-[#FDE8F0]/70"
        >
          <CircleHelp size={14} aria-hidden />
          Hướng dẫn
        </button>
      </header>

      <StripEditor
        disabled={false}
        instantPrint
        printing={printing}
        onInstantPrint={handleInstantPrint}
        onError={(msg) => showToast(msg, "error")}
        albumImages={album?.images ?? []}
        printRequests={album?.printRequests ?? []}
        freeRemaining={album?.freePrintRemaining ?? 0}
        printBw={printBw}
        printNoCrop={printNoCrop}
        onPrintBwChange={setPrintBw}
        onPrintNoCropChange={setPrintNoCrop}
        galleryTab={galleryTab}
        onGalleryTabChange={setGalleryTab}
        openFrameDrawer={frameDrawerOpen}
        onFrameDrawerOpenChange={setFrameDrawerOpen}
      />

      <PtbOnboardingModal
        isOpen={showIntro}
        variant="instant"
        freeRemaining={album?.freePrintRemaining ?? 0}
        onStart={dismissIntro}
        onStartTour={startTour}
      />

      <PtbTour
        open={tourOpen}
        steps={PTB_INSTANT_TOUR_STEPS}
        onClose={() => setTourOpen(false)}
      />

      <PtbToast
        message={toast?.message}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </AlbumPageLayout>
  );
}
