import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { PHOTO_THEMES, STRIP_WIDTH_MM } from "../lib/constants";
import {
  applyFrameToStrip,
  applyPlainToStrip,
  groupFramesBySize,
} from "../lib/frameUtils";
import { canvasToBlob, renderStripCanvas } from "../lib/renderStrip";
import { createEmptyStrip, getLayoutDef, getSlotCount, getSlotCssAspect, isPlainFrame } from "../lib/utils";
import { usePtbFrames } from "../hooks/usePtbFrames";
import { FrameEditorRow, FrameEditorWorkspace } from "./ui/AlbumPageLayout";
import FrameGalleryPanel from "./ui/FrameGalleryPanel";
import PhotoAdjustModal from "./PhotoAdjustModal";
import StripPreviewPanel from "./ui/StripPreviewPanel";

export default function StripEditor({
  disabled,
  onSave,
  saving,
  onError,
  albumImages = [],
  printRequests = [],
  freeRemaining = 0,
  printSubmitting = false,
  onSubmitPrint,
  instantPrint = false,
  printing = false,
  onInstantPrint,
  galleryTab,
  onGalleryTabChange,
  openFrameDrawer: openFrameDrawerProp,
  onFrameDrawerOpenChange,
  printBw = false,
  printNoCrop = false,
  onPrintBwChange,
  onPrintNoCropChange,
}) {
  const { frames, loading: framesLoading } = usePtbFrames();
  const [strip, setStrip] = useState(() => createEmptyStrip());
  const [selectedFrameId, setSelectedFrameId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [frameDrawerOpenInternal, setFrameDrawerOpenInternal] = useState(false);
  const frameDrawerOpen = openFrameDrawerProp ?? frameDrawerOpenInternal;
  const setFrameDrawerOpen = (open) => {
    if (openFrameDrawerProp === undefined) setFrameDrawerOpenInternal(open);
    onFrameDrawerOpenChange?.(open);
  };
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : false,
  );
  const [cropQueue, setCropQueue] = useState([]);
  const dragOrigin = useRef(null);
  const stripRef = useRef(strip);
  stripRef.current = strip;

  const displayFrames = frames;
  const groups = useMemo(() => groupFramesBySize(displayFrames), [displayFrames]);

  const filledCount = useMemo(
    () => (strip.images ?? []).filter(Boolean).length,
    [strip.images],
  );
  const slotCount = strip.imageCount ?? getLayoutDef(strip.layoutType).slots;
  const hasOverlay = Boolean(strip.frameOverlaySrc);
  const plainMode = isPlainFrame(strip) && !hasOverlay;
  const minRequired = Math.min(2, slotCount);
  const missingCount = Math.max(0, minRequired - filledCount);
  const canSave = (plainMode || hasOverlay) && missingCount === 0 && !disabled;
  const dualPreview = (strip.layoutType || "1x4") === "1x4";

  const selectedFrame = useMemo(
    () => displayFrames.find((f) => f.id === selectedFrameId) ?? null,
    [displayFrames, selectedFrameId],
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const onChange = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (!mobile) setFrameDrawerOpen(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!frameDrawerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setFrameDrawerOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [frameDrawerOpen]);

  const handleSelectFrame = (frame) => {
    setSelectedFrameId(frame.id);
    setStrip((prev) => applyFrameToStrip(prev, frame));
    setFrameDrawerOpen(false);
  };

  const handleClearFrame = () => {
    setSelectedFrameId(null);
    setStrip((prev) => applyPlainToStrip(prev, prev.layoutType || "1x4"));
  };

  const handleLayoutChange = (layoutId) => {
    if (hasOverlay) {
      const group = groups.find((g) => g.size === layoutId);
      const next = group?.frames?.[0];
      if (next) handleSelectFrame(next);
      return;
    }
    setStrip((prev) => applyPlainToStrip(prev, layoutId));
    if (layoutId === "3x3") onPrintBwChange?.(true);
  };

  const handleUpdateStrip = (patch) => {
    setStrip((prev) => ({ ...prev, ...patch }));
  };

  const handleSlotUpload = (slotIndex, fileList) => {
    if (disabled) return;
    const files = Array.from(fileList ?? []);
    if (!files.length) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result ?? null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          }),
      ),
    ).then((dataUrls) => {
      const current = stripRef.current;
      const total = current.imageCount ?? getSlotCount(current);
      const images = current.images ?? [];
      const jobs = [];
      let cursor = 0;
      for (let i = slotIndex; i < total && cursor < dataUrls.length; i += 1) {
        if (i !== slotIndex && images[i]) continue;
        if (!dataUrls[cursor]) {
          cursor += 1;
          continue;
        }
        jobs.push({
          slotIndex: i,
          sourceSrc: dataUrls[cursor],
          fileName: files[cursor]?.name,
        });
        cursor += 1;
      }
      if (jobs.length) setCropQueue(jobs);
    });
  };

  const applyCroppedImage = useCallback((slotIndex, dataUrl) => {
    setStrip((prev) => {
      const total = prev.imageCount ?? getSlotCount(prev);
      const images = Array.from(
        { length: total },
        (_, i) => prev.images?.[i] ?? null,
      );
      const positions = Array.from(
        { length: total },
        (_, i) => prev.imagePositions?.[i] ?? { x: 50, y: 50, zoom: 1 },
      );
      if (images[slotIndex]?.startsWith?.("blob:")) {
        URL.revokeObjectURL(images[slotIndex]);
      }
      images[slotIndex] = dataUrl;
      positions[slotIndex] = { x: 50, y: 50, zoom: 1 };
      return { ...prev, images, imagePositions: positions };
    });
  }, []);

  const openAdjust = (slotIndex) => {
    if (disabled) return;
    const src = stripRef.current.images?.[slotIndex];
    if (!src) return;
    setCropQueue([{ slotIndex, sourceSrc: src }]);
  };

  const cropJob = cropQueue[0] ?? null;
  const cropAspect = cropJob
    ? getSlotCssAspect(strip, cropJob.slotIndex, 220)
    : 1;

  const handleSlotRemove = (slotIndex) => {
    if (dragOrigin.current?.slotIndex === slotIndex) {
      dragOrigin.current = null;
      setDragState(null);
    }
    setStrip((prev) => {
      const images = [...(prev.images ?? [])];
      const positions = [...(prev.imagePositions ?? [])];
      if (images[slotIndex]?.startsWith?.("blob:")) {
        URL.revokeObjectURL(images[slotIndex]);
      }
      images[slotIndex] = null;
      positions[slotIndex] = { x: 50, y: 50, zoom: 1 };
      return { ...prev, images, imagePositions: positions };
    });
  };

  const handleDragStart = (slotIndex, clientX, clientY) => {
    const pos = strip.imagePositions?.[slotIndex] ?? { x: 50, y: 50, zoom: 1 };
    dragOrigin.current = {
      slotIndex,
      clientX,
      clientY,
      x: Number.isFinite(pos.x) ? pos.x : 50,
      y: Number.isFinite(pos.y) ? pos.y : 50,
      zoom: pos.zoom ?? 1,
    };
    setDragState({ slotIndex, active: true });
  };

  const handleDragMove = (slotIndex, clientX, clientY) => {
    const origin = dragOrigin.current;
    if (!origin || origin.slotIndex !== slotIndex) return;
    const originX = Number.isFinite(origin.x) ? origin.x : 50;
    const originY = Number.isFinite(origin.y) ? origin.y : 50;
    const dx = clientX - origin.clientX;
    const dy = clientY - origin.clientY;
    setStrip((prev) => {
      if (!dragOrigin.current || dragOrigin.current.slotIndex !== slotIndex) {
        return prev;
      }
      const positions = [...(prev.imagePositions ?? [])];
      const prevPos = positions[slotIndex] ?? { x: 50, y: 50, zoom: 1 };
      positions[slotIndex] = {
        ...prevPos,
        x: Math.max(0, Math.min(100, originX - dx * 0.15)),
        y: Math.max(0, Math.min(100, originY - dy * 0.15)),
        zoom: prevPos.zoom ?? 1,
      };
      return { ...prev, imagePositions: positions };
    });
  };

  const handleDragEnd = () => {
    dragOrigin.current = null;
    setDragState(null);
  };

  const handlePinchZoom = (slotIndex, zoom) => {
    setStrip((prev) => {
      const positions = [...(prev.imagePositions ?? [])];
      positions[slotIndex] = {
        ...(positions[slotIndex] ?? { x: 50, y: 50 }),
        zoom: Math.max(1, Math.min(3, zoom)),
      };
      return { ...prev, imagePositions: positions };
    });
  };

  const handleSave = useCallback(async () => {
    if (!plainMode && !strip.frameOverlaySrc) {
      throw new Error("Vui lòng chọn khung ảnh trước khi lưu");
    }
    const layoutOptions = strip.frameLayoutOptions ?? {};
    const exportTheme = {
      ...PHOTO_THEMES.none,
      headerMm: 0,
      footerMm: 0,
      footerPatternText: "",
      footerSubText: "",
    };
    const { canvas } = await renderStripCanvas(
      strip,
      STRIP_WIDTH_MM,
      exportTheme,
      strip.frameOverlaySrc,
      layoutOptions,
    );
    const blob = await canvasToBlob(canvas);
    await onSave?.(blob, {
      frameId: strip.frameId,
      layoutType: strip.layoutType,
    });
  }, [strip, onSave, plainMode]);

  const handleSaveClick = () => {
    handleSave().catch((err) => {
      console.error(err);
      onError?.(err?.message || "Không lưu được strip — thử chọn lại khung");
    });
  };

  const handleInstantPrintClick = () => {
    if (!onInstantPrint || printing || disabled) return;
    (async () => {
      if (!plainMode && !strip.frameOverlaySrc) {
        throw new Error("Vui lòng chọn khung ảnh trước khi in");
      }
      if (missingCount > 0) {
        throw new Error(`Cần thêm ${missingCount} ảnh trước khi in`);
      }
      const layoutOptions = strip.frameLayoutOptions ?? {};
      const exportTheme = {
        ...PHOTO_THEMES.none,
        headerMm: 0,
        footerMm: 0,
        footerPatternText: "",
        footerSubText: "",
      };
      const { canvas } = await renderStripCanvas(
        strip,
        STRIP_WIDTH_MM,
        exportTheme,
        strip.frameOverlaySrc,
        layoutOptions,
      );
      let out = canvas;
      if (printBw) {
        const g = document.createElement("canvas");
        g.width = canvas.width;
        g.height = canvas.height;
        const ctx = g.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, 0);
          const imageData = ctx.getImageData(0, 0, g.width, g.height);
          const { data } = imageData;
          for (let i = 0; i < data.length; i += 4) {
            const y =
              (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
            data[i] = y;
            data[i + 1] = y;
            data[i + 2] = y;
          }
          ctx.putImageData(imageData, 0, 0);
          out = g;
        }
      }
      const blob = await canvasToBlob(out, { type: "image/jpeg", quality: 0.92 });
      await onInstantPrint(blob, {
        layoutType: strip.layoutType || "1x4",
        printBw,
        printNoCrop,
      });
    })().catch((err) => {
      console.error(err);
      onError?.(err?.message || "Không in được — thử lại");
    });
  };

  const gallery = (embedded = false) => (
    <FrameGalleryPanel
      frames={displayFrames}
      selectedFrameId={selectedFrameId}
      onSelect={handleSelectFrame}
      loading={framesLoading}
      embedded={embedded}
      albumImages={albumImages}
      printRequests={printRequests}
      freeRemaining={freeRemaining}
      printDisabled={disabled}
      printSubmitting={printSubmitting}
      printBw={printBw}
      printNoCrop={printNoCrop}
      onPrintBwChange={onPrintBwChange}
      onPrintNoCropChange={onPrintNoCropChange}
      onSubmitPrint={
        onSubmitPrint
          ? async (body) => {
              await onSubmitPrint(body);
              if (embedded) setFrameDrawerOpen(false);
            }
          : undefined
      }
      galleryTab={galleryTab}
      onGalleryTabChange={onGalleryTabChange}
    />
  );

  return (
    <FrameEditorWorkspace
      className={
        isMobile
          ? "min-h-0 flex-1 overflow-hidden"
          : "min-h-0 flex-1 overflow-hidden"
      }
    >
      <FrameEditorRow
        className={
          isMobile
            ? "min-h-0 flex-1 flex-col overflow-hidden"
            : "min-h-0 flex-1"
        }
      >
        <StripPreviewPanel
          strip={strip}
          onSlotUpload={handleSlotUpload}
          onSlotRemove={handleSlotRemove}
          onAdjustSlot={openAdjust}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onPinchZoom={handlePinchZoom}
          dragState={dragState}
          isMobile={isMobile}
          selectedFrame={selectedFrame}
          onOpenFrames={() => setFrameDrawerOpen(true)}
          onLayoutChange={handleLayoutChange}
          onUpdateStrip={handleUpdateStrip}
          onClearFrame={handleClearFrame}
          dualPreview={dualPreview}
          canSave={canSave}
          saving={saving}
          onSave={instantPrint ? undefined : handleSaveClick}
          instantPrint={instantPrint}
          printing={printing}
          onInstantPrint={instantPrint ? handleInstantPrintClick : undefined}
          printBw={printBw}
          printNoCrop={printNoCrop}
          onPrintBwChange={onPrintBwChange}
          onPrintNoCropChange={onPrintNoCropChange}
        />

        {!isMobile ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {gallery(false)}
          </div>
        ) : null}
      </FrameEditorRow>

      {isMobile && frameDrawerOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Chọn frame"
        >
          <button
            type="button"
            className="absolute inset-0 border-0 bg-[rgba(15,23,42,0.45)]"
            aria-label="Đóng"
            onClick={() => setFrameDrawerOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(78dvh,640px)] w-full flex-col bg-white shadow-[0_-16px_40px_rgba(16,24,40,0.16)] animate-[ptb-drawer-up_0.22s_ease-out]">
            <div
              className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[#E4E7EC]"
              aria-hidden="true"
            />
            <div className="flex shrink-0 items-center justify-between px-3.5 pb-2 pt-2.5">
              <h2 className="m-0 text-[15px] font-bold text-[#172033]">
                {galleryTab === "album" ? "Ảnh của bạn" : "Chọn frame"}
              </h2>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center border border-[#F1E4EC] bg-white text-[#667085]"
                aria-label="Đóng"
                onClick={() => setFrameDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
              {gallery(true)}
            </div>
          </div>
        </div>
      ) : null}

      <PhotoAdjustModal
        open={Boolean(cropJob?.sourceSrc)}
        imageSrc={cropJob?.sourceSrc}
        aspectRatio={cropAspect}
        onCancel={() => setCropQueue((prev) => prev.slice(1))}
        onConfirm={(croppedDataUrl) => {
          if (!cropJob) return;
          applyCroppedImage(cropJob.slotIndex, croppedDataUrl);
          setCropQueue((prev) => prev.slice(1));
        }}
      />
    </FrameEditorWorkspace>
  );
}
