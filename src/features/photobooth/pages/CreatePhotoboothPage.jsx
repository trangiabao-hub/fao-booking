import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CameraIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import PhotoboothEditorView from "../components/PhotoboothEditorView";
import ExportPhotoboothSheet from "../components/ExportPhotoboothSheet";
import PhotoboothAlbumView from "../components/PhotoboothAlbumView";
import PhotoboothShell from "../components/PhotoboothShell";
import { useStripEditor } from "../hooks/useStripEditor";
import api from "../../../config/axios";
import {
  fetchCollectionByOrder,
  fetchCollectionByBooking,
  fetchPhotoBoothFrames,
  ensurePtbSession,
  uploadPhotoboothImage,
} from "../api/ptbTrip";
import { savePtbSession, getPtbDisplayName } from "../ptbStorage";
import { mapApiFrames, parseFrameIdForUpload } from "../utils";
import { getFrameOverlayForExport, warmAllFramePreviews } from "../frameImageLoader";
import { SAMPLE_FRAMES, STRIP_WIDTH_MM } from "../constants";
import { ptbSpinner, ptbBtnPrimary } from "../theme";
import { renderStripCanvas, canvasToBlob } from "../renderStrip";
import { loadCustomerInfo } from "../../../utils/storage";

const STEPS = { album: "album", create: "create" };

export default function CreatePhotoboothPage({ orderIdNew: orderIdProp }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderCodeParam = searchParams.get("orderCode");
  const bookingIdParam = searchParams.get("bookingId");
  const skipToCreate = searchParams.get("new") === "1";

  const [resolvedOrderId, setResolvedOrderId] = useState(
    orderIdProp || searchParams.get("orderIdNew")
  );
  const orderIdNew = resolvedOrderId;

  const [step, setStep] = useState(skipToCreate ? STEPS.create : STEPS.album);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collection, setCollection] = useState(null);
  const [frames, setFrames] = useState(SAMPLE_FRAMES);
  const [selectedFrameId, setSelectedFrameId] = useState(null);
  const [preparingExport, setPreparingExport] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportBlob, setExportBlob] = useState(null);
  const [exportPreviewUrl, setExportPreviewUrl] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const editor = useStripEditor();

  useEffect(() => {
    warmAllFramePreviews(frames);
  }, [frames]);

  const backHref = orderIdNew
    ? `/order/${orderIdNew}`
    : bookingIdParam
      ? `/order/booking/${bookingIdParam}`
      : "/my-bookings";

  useEffect(() => {
    if (resolvedOrderId || !orderCodeParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/v1/bookings/order-by-code/${orderCodeParam}`);
        const bookings = res.data || [];
        const oid =
          bookings[0]?.orderIdNew != null ? String(bookings[0].orderIdNew).trim() : null;
        if (!cancelled && oid) setResolvedOrderId(oid);
        else if (!cancelled) {
          setError("Không tìm thấy mã đơn hệ thống");
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Không tra cứu được đơn hàng");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderCodeParam, resolvedOrderId]);

  const refreshCollection = useCallback(async () => {
    if (!orderIdNew && !bookingIdParam) return null;
    const refreshed = orderIdNew
      ? await fetchCollectionByOrder(orderIdNew)
      : await fetchCollectionByBooking(bookingIdParam);
    setCollection(refreshed);
    return refreshed;
  }, [orderIdNew, bookingIdParam]);

  useEffect(() => {
    const hasEntry = Boolean(orderIdNew || bookingIdParam || orderCodeParam);
    if (!hasEntry) {
      setError("Thiếu thông tin đơn hàng");
      setLoading(false);
      return;
    }
    if (!orderIdNew && !bookingIdParam) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [coll, frameList] = await Promise.all([
          orderIdNew
            ? fetchCollectionByOrder(orderIdNew)
            : fetchCollectionByBooking(bookingIdParam),
          fetchPhotoBoothFrames().catch(() => []),
        ]);
        if (cancelled) return;

        if (!orderIdNew && coll?.orderIdNew) {
          setResolvedOrderId(String(coll.orderIdNew).trim());
        }

        const mapped = mapApiFrames(frameList);
        const list = mapped.length ? mapped : SAMPLE_FRAMES;
        warmAllFramePreviews(list, 120);
        setFrames(list);
        setCollection(coll);

        const savedName = getPtbDisplayName(coll.shareToken) || loadCustomerInfo()?.fullName;
        const session = await ensurePtbSession(coll.shareToken, savedName || "Khách FAO");
        if (cancelled) return;
        if (session.sessionToken) {
          savePtbSession(coll.shareToken, session.sessionToken, savedName);
        }
        if (session.collection) setCollection(session.collection);

        if (skipToCreate && list[0]) {
          setSelectedFrameId(list[0].id);
          setStep(STEPS.create);
        } else if (!skipToCreate) {
          setStep(STEPS.album);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || "Không tải được album");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderIdNew, bookingIdParam, orderCodeParam, skipToCreate]);

  /** Áp khung khi vào create (kể cả ?new=1 đã set selectedFrameId sẵn) */
  useEffect(() => {
    if (step !== STEPS.create || !selectedFrameId) return;
    const frame = frames.find((f) => f.id === selectedFrameId);
    if (!frame) return;
    if (editor.strip.frameSource === frame.id && editor.strip.frameOverlaySrc) return;
    editor.applyFrameFresh(frame);
  }, [step, selectedFrameId, frames, editor.strip.frameSource, editor.strip.frameOverlaySrc]);

  useEffect(() => {
    if (step !== STEPS.create || selectedFrameId || !frames[0]) return;
    setSelectedFrameId(frames[0].id);
  }, [step, selectedFrameId, frames]);

  const startNewPhotobooth = useCallback(() => {
    editor.resetEditor();
    const first = frames[0];
    if (first) {
      editor.applyFrameFresh(first);
      setSelectedFrameId(first.id);
    } else {
      setSelectedFrameId(null);
    }
    setStep(STEPS.create);
  }, [editor, frames]);

  const handleSelectFrame = useCallback(
    (frame) => {
      setSelectedFrameId(frame.id);
      editor.selectFrame(frame);
    },
    [editor]
  );

  const handleBack = () => {
    if (exportOpen) {
      closeExport();
      return;
    }
    if (step === STEPS.create) setStep(STEPS.album);
    else navigate(backHref);
  };

  const renderExportBlob = useCallback(async () => {
    const layoutOpts = editor.strip.frameLayoutOptions ?? {};
    const { canvas } = await renderStripCanvas(
      editor.strip,
      STRIP_WIDTH_MM,
      editor.theme,
      getFrameOverlayForExport(editor.strip),
      layoutOpts
    );
    return canvasToBlob(canvas, "image/jpeg", 0.95);
  }, [editor]);

  const closeExport = useCallback(() => {
    setExportOpen(false);
    if (exportPreviewUrl) URL.revokeObjectURL(exportPreviewUrl);
    setExportPreviewUrl(null);
    setExportBlob(null);
  }, [exportPreviewUrl]);

  useEffect(() => {
    return () => {
      if (exportPreviewUrl) URL.revokeObjectURL(exportPreviewUrl);
    };
  }, [exportPreviewUrl]);

  const handleOpenExport = useCallback(async () => {
    if (!editor.isComplete) return;
    setPreparingExport(true);
    try {
      const blob = await renderExportBlob();
      setExportBlob(blob);
      setExportPreviewUrl(URL.createObjectURL(blob));
      setExportOpen(true);
    } catch (err) {
      alert(err.message || "Không tạo được ảnh xuất");
    } finally {
      setPreparingExport(false);
    }
  }, [editor.isComplete, renderExportBlob]);

  const handleDownload = useCallback(async () => {
    if (!exportBlob) return;
    setDownloading(true);
    try {
      const url = exportPreviewUrl || URL.createObjectURL(exportBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fao-photobooth-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setDownloading(false);
    }
  }, [exportBlob, exportPreviewUrl]);

  const handleSaveToAlbum = useCallback(async () => {
    if (!collection?.shareToken || !exportBlob) return;
    setUploading(true);
    try {
      const file = new File([exportBlob], `photobooth-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      await uploadPhotoboothImage(collection.shareToken, file, {
        frameId: parseFrameIdForUpload(editor.strip.frameSource),
        layoutType: editor.strip.layoutType,
      });
      await refreshCollection();
      closeExport();
      editor.resetEditor();
      setStep(STEPS.album);
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3500);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Lưu album thất bại");
    } finally {
      setUploading(false);
    }
  }, [collection, exportBlob, editor, refreshCollection, closeExport]);

  if (loading) {
    return (
      <PhotoboothShell>
        <div className="text-center py-24 md:py-32">
          <div className={`${ptbSpinner} mx-auto`} />
          <p className="text-sm text-pink-700 mt-5 font-medium">Đang mở album chuyến đi...</p>
        </div>
      </PhotoboothShell>
    );
  }

  if (error) {
    return (
      <PhotoboothShell>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center mb-5">
            <CameraIcon className="w-8 h-8 text-pink-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Chưa mở được album</h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{error}</p>
          <Link
            to={backHref}
            className={`mt-6 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 min-h-[48px] text-sm text-white ${ptbBtnPrimary}`}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Quay lại đơn hàng
          </Link>
        </div>
      </PhotoboothShell>
    );
  }

  if (step === STEPS.create) {
    return (
      <>
        <PhotoboothEditorView
          editor={editor}
          frames={frames}
          selectedFrameId={selectedFrameId}
          onSelectFrame={handleSelectFrame}
          onBack={handleBack}
          onOpenExport={handleOpenExport}
          preparingExport={preparingExport}
        />
        <AnimatePresence>
          {exportOpen && (
            <ExportPhotoboothSheet
              previewUrl={exportPreviewUrl}
              onClose={closeExport}
              onDownload={handleDownload}
              onSaveOnline={handleSaveToAlbum}
              downloading={downloading}
              uploading={uploading}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  const imageCount = collection?.images?.length ?? 0;

  return (
    <PhotoboothShell>
      <PhotoboothAlbumView
        title={collection?.title || "Album kỷ niệm"}
        subtitle={
          orderIdNew
            ? `Đơn thuê · ${orderIdNew.slice(0, 8)}…`
            : "Photobooth chuyến đi của bạn"
        }
        backHref={backHref}
        backLabel="Về đơn hàng"
        shareToken={collection?.shareToken}
        images={collection?.images}
        imageCount={imageCount}
        saveToast={saveToast}
        onCreateNew={startNewPhotobooth}
        galleryTitle={`Ảnh đã tạo${imageCount > 0 ? ` (${imageCount})` : ""}`}
        emptyLabel="Chưa có ảnh nào — bấm nút bên dưới để bắt đầu"
        emptyHint="Tạo strip photobooth đầu tiên cho chuyến đi"
      />
    </PhotoboothShell>
  );
}
