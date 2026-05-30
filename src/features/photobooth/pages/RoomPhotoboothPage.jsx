import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PhotoboothShell from "../components/PhotoboothShell";
import PhotoboothAlbumView from "../components/PhotoboothAlbumView";
import PhotoboothJoinView from "../components/PhotoboothJoinView";
import PhotoboothEditorView from "../components/PhotoboothEditorView";
import ExportPhotoboothSheet from "../components/ExportPhotoboothSheet";
import { useStripEditor } from "../hooks/useStripEditor";
import {
  fetchCollectionByToken,
  fetchPhotoBoothFrames,
  joinRoom,
  uploadPhotoboothImage,
} from "../api/ptbTrip";
import { getPtbSession, savePtbSession, getPtbDisplayName } from "../ptbStorage";
import { mapApiFrames, parseFrameIdForUpload } from "../utils";
import { getFrameOverlayForExport, warmAllFramePreviews } from "../frameImageLoader";
import { SAMPLE_FRAMES, STRIP_WIDTH_MM } from "../constants";
import { ptbSpinner } from "../theme";
import { renderStripCanvas, canvasToBlob } from "../renderStrip";

const POLL_MS = 4000;
const VIEWS = { join: "join", main: "main" };
const STEPS = { album: "album", create: "create" };

export default function RoomPhotoboothPage() {
  const { shareToken } = useParams();
  const [view, setView] = useState(VIEWS.join);
  const [step, setStep] = useState(STEPS.album);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collection, setCollection] = useState(null);
  const [joining, setJoining] = useState(false);
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
  const hasSession = Boolean(getPtbSession(shareToken));

  useEffect(() => {
    warmAllFramePreviews(frames);
  }, [frames]);

  const refreshCollection = useCallback(async () => {
    const data = await fetchCollectionByToken(shareToken);
    setCollection(data);
    return data;
  }, [shareToken]);

  useEffect(() => {
    if (!shareToken) {
      setError("Link không hợp lệ");
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [coll, frameList] = await Promise.all([
          fetchCollectionByToken(shareToken),
          fetchPhotoBoothFrames().catch(() => []),
        ]);
        if (cancelled) return;
        const mapped = mapApiFrames(frameList);
        const list = mapped.length ? mapped : SAMPLE_FRAMES;
        warmAllFramePreviews(list, 120);
        setFrames(list);
        setCollection(coll);
        if (getPtbSession(shareToken)) {
          setView(VIEWS.main);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || "Album không tồn tại hoặc đã đóng");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [shareToken]);

  useEffect(() => {
    if (!hasSession || view !== VIEWS.main) return;
    const id = setInterval(() => {
      refreshCollection().catch(() => {});
    }, POLL_MS);
    return () => clearInterval(id);
  }, [hasSession, view, refreshCollection]);

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

  useEffect(() => {
    return () => {
      if (exportPreviewUrl) URL.revokeObjectURL(exportPreviewUrl);
    };
  }, [exportPreviewUrl]);

  const handleJoin = async (displayName) => {
    setJoining(true);
    try {
      const res = await joinRoom(shareToken, displayName);
      savePtbSession(shareToken, res.participant?.sessionToken, displayName);
      setCollection(res.collection ?? collection);
      setView(VIEWS.main);
      setStep(STEPS.album);
    } catch (err) {
      alert(err.response?.data?.message || "Không vào được phòng");
    } finally {
      setJoining(false);
    }
  };

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

  const closeExport = useCallback(() => {
    setExportOpen(false);
    if (exportPreviewUrl) URL.revokeObjectURL(exportPreviewUrl);
    setExportPreviewUrl(null);
    setExportBlob(null);
  }, [exportPreviewUrl]);

  const handleBack = () => {
    if (exportOpen) {
      closeExport();
      return;
    }
    if (step === STEPS.create) setStep(STEPS.album);
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
    if (!shareToken || !exportBlob) return;
    setUploading(true);
    try {
      const file = new File([exportBlob], `photobooth-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      await uploadPhotoboothImage(shareToken, file, {
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
  }, [shareToken, exportBlob, editor, refreshCollection, closeExport]);

  if (loading) {
    return (
      <PhotoboothShell>
        <div className="text-center py-24 md:py-32">
          <div className={`${ptbSpinner} mx-auto`} />
          <p className="text-sm text-pink-700 mt-5 font-medium">Đang mở phòng nhóm...</p>
        </div>
      </PhotoboothShell>
    );
  }

  if (error) {
    return (
      <PhotoboothShell>
        <div className="text-center py-20 max-w-md mx-auto">
          <p className="text-slate-600">{error}</p>
          <Link to="/" className="mt-5 inline-block text-pink-600 font-semibold text-sm">
            Về trang chủ
          </Link>
        </div>
      </PhotoboothShell>
    );
  }

  if (view === VIEWS.join) {
    return (
      <PhotoboothJoinView
        onJoin={handleJoin}
        loading={joining}
        defaultName={getPtbDisplayName(shareToken)}
        shareToken={shareToken}
      />
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
        title={collection?.title || "Album chuyến đi"}
        backHref="/"
        backLabel="Về trang chủ"
        shareToken={shareToken}
        images={collection?.images}
        imageCount={imageCount}
        saveToast={saveToast}
        saveToastMessage="✨ Đã thêm vào album nhóm!"
        onCreateNew={startNewPhotobooth}
        galleryTitle="Ảnh mọi người"
        emptyLabel="Chưa có ảnh — hãy là người đầu tiên tạo strip!"
        emptyHint="Mời bạn bè qua link chia sẻ để cùng tạo"
        live
        eyebrow="Album nhóm"
        orderLink={collection?.orderIdNew ? `/order/${collection.orderIdNew}` : null}
      />
    </PhotoboothShell>
  );
}
