import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PHOTO_THEMES, STRIP_WIDTH_MM } from "../lib/constants";
import { applyFrameToStrip } from "../lib/frameUtils";
import { canvasToBlob, renderStripCanvas } from "../lib/renderStrip";
import { createEmptyStrip } from "../lib/utils";
import { usePtbFrames } from "../hooks/usePtbFrames";
import { FrameEditorWorkspace } from "./ui/AlbumPageLayout";
import FrameGalleryPanel from "./ui/FrameGalleryPanel";
import StripPreviewPanel from "./ui/StripPreviewPanel";

export default function StripEditor({ disabled, onSave, saving, onError }) {
  const { frames, loading: framesLoading } = usePtbFrames();
  const [strip, setStrip] = useState(() => createEmptyStrip());
  const [selectedFrameId, setSelectedFrameId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const dragOrigin = useRef(null);

  const displayFrames = frames;

  const selectedFrame = useMemo(
    () => displayFrames.find((f) => f.id === selectedFrameId) ?? null,
    [displayFrames, selectedFrameId],
  );

  const filledCount = useMemo(
    () => strip.images.filter(Boolean).length,
    [strip.images],
  );
  const slotCount = strip.imageCount ?? 4;
  const hasFrame = Boolean(strip.frameOverlaySrc);
  const canSave =
    hasFrame && filledCount >= Math.min(2, slotCount) && !disabled;

  useEffect(() => {
    if (!displayFrames.length || selectedFrameId) return;
    const first =
      displayFrames.find((f) => f.sizeType === "1x4" || f.layoutType === "1x4") ??
      displayFrames[0];
    setSelectedFrameId(first.id);
    setStrip((prev) => applyFrameToStrip(prev, first));
  }, [displayFrames, selectedFrameId]);

  const handleSelectFrame = (frame) => {
    setSelectedFrameId(frame.id);
    setStrip((prev) => applyFrameToStrip(prev, frame));
  };

  const handleSlotUpload = (slotIndex, file) => {
    const url = URL.createObjectURL(file);
    setStrip((prev) => {
      const images = [...prev.images];
      const positions = [...(prev.imagePositions ?? [])];
      images[slotIndex] = url;
      positions[slotIndex] = positions[slotIndex] ?? { x: 50, y: 50, zoom: 1 };
      return { ...prev, images, imagePositions: positions };
    });
  };

  const handleSlotRemove = (slotIndex) => {
    if (dragOrigin.current?.slotIndex === slotIndex) {
      dragOrigin.current = null;
      setDragState(null);
    }
    setStrip((prev) => {
      const images = [...prev.images];
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
    if (!strip.frameOverlaySrc) {
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
  }, [strip, onSave]);

  const handleSaveClick = () => {
    handleSave().catch((err) => {
      console.error(err);
      onError?.(err?.message || "Không lưu được strip — thử chọn lại khung");
    });
  };

  return (
    <FrameEditorWorkspace>
      <StripPreviewPanel
        strip={strip}
        selectedFrame={selectedFrame}
        filledCount={filledCount}
        slotCount={slotCount}
        canSave={canSave}
        saving={saving}
        hasFrame={hasFrame}
        onSave={handleSaveClick}
        onSlotUpload={handleSlotUpload}
        onSlotRemove={handleSlotRemove}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onPinchZoom={handlePinchZoom}
        dragState={dragState}
      />

      <div className="min-h-0 min-w-0 flex-1">
        <FrameGalleryPanel
          frames={displayFrames}
          selectedFrameId={selectedFrameId}
          onSelect={handleSelectFrame}
          loading={framesLoading}
        />
      </div>
    </FrameEditorWorkspace>
  );
}
