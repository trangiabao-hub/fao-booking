import { useCallback, useEffect, useRef, useState } from "react";
import { PHOTO_THEMES } from "../constants";
import { createEmptyStrip, filledSlotCount, getLayoutDef, getSlotCount, preloadFrameOverlaySrc, toSameOriginUploadsUrl } from "../utils";
import { warmFrameForEditor } from "../frameImageLoader";

export function useStripEditor(initialStrip) {
  const [strip, setStrip] = useState(initialStrip ?? createEmptyStrip());
  const [dragState, setDragState] = useState(null);
  const [hoverState, setHoverState] = useState(null);
  const fileInputRefs = useRef({});
  const pinchRef = useRef(null);
  const dragStateRef = useRef(null);

  const updateStrip = useCallback((patch) => {
    setStrip((prev) => ({ ...prev, ...patch }));
  }, []);

  const applyFrameToStrip = useCallback((frame, fresh) => {
    if (!frame) return;
    const imageCount = Math.max(1, frame.slots ?? 4);
    const frameLayoutOptions = {
      slotInsetRatio: frame.slotInsetRatio ?? 0,
      slotGapRatio: frame.slotGapRatio ?? 0,
      slotLayout: frame.slotLayout ?? null,
      frameAspectRatio: frame.frameAspectRatio ?? null,
    };
    const frameSrc = toSameOriginUploadsUrl(frame.src);
    const base = fresh
      ? {
          ...createEmptyStrip(),
          frameOverlaySrc: frameSrc,
          frameOverlayExportSrc: null,
          frameSource: frame.id,
          layoutType: frame.layoutType ?? "1x4",
          imageCount,
          frameLayoutOptions,
          images: Array.from({ length: imageCount }, () => null),
          imagePositions: Array.from({ length: imageCount }, () => ({ x: 50, y: 50, zoom: 1 })),
        }
      : (prev) => ({
          ...prev,
          frameOverlaySrc: frameSrc,
          frameOverlayExportSrc: null,
          frameSource: frame.id,
          layoutType: frame.layoutType ?? "1x4",
          imageCount,
          frameLayoutOptions,
          images: Array.from({ length: imageCount }, (_, i) => prev.images?.[i] ?? null),
          imagePositions: Array.from({ length: imageCount }, (_, i) =>
            prev.imagePositions?.[i] ?? { x: 50, y: 50, zoom: 1 }
          ),
        });

    if (fresh) {
      setStrip(base);
      setDragState(null);
      setHoverState(null);
    } else {
      setStrip((prev) => base(prev));
    }

    warmFrameForEditor(frameSrc);
    preloadFrameOverlaySrc(frameSrc)
      .then((dataUrl) => {
        if (!dataUrl?.startsWith("data:")) return;
        setStrip((prev) =>
          prev.frameSource === frame.id
            ? { ...prev, frameOverlayExportSrc: dataUrl }
            : prev
        );
      })
      .catch(() => {
        /* export sẽ thử lại lúc xuất */
      });
  }, []);

  const selectFrame = useCallback(
    (frame) => applyFrameToStrip(frame, false),
    [applyFrameToStrip]
  );

  /** Frame mới + slot trống — dùng khi tạo ảnh thứ 2, 3... trong cùng đơn */
  const applyFrameFresh = useCallback(
    (frame) => applyFrameToStrip(frame, true),
    [applyFrameToStrip]
  );

  const resetEditor = useCallback(() => {
    setStrip(createEmptyStrip());
    setDragState(null);
    setHoverState(null);
  }, []);

  const triggerUpload = (stripId, slotIndex) => {
    const idKey = `ptb-file-${String(stripId)}-${slotIndex}`;
    fileInputRefs.current[idKey]?.click()
      ?? fileInputRefs.current[`${stripId}-${slotIndex}`]?.click();
  };

  const readFileAsDataUrl = async (file) => {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file);
        const w = bitmap.width;
        const h = bitmap.height;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(bitmap, 0, 0, w, h);
          bitmap.close?.();
          const url = canvas.toDataURL("image/jpeg", 0.95);
          if (url?.startsWith("data:")) return url;
        }
        bitmap.close?.();
      } catch {
        /* FileReader fallback */
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result ?? null);
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
  };

  const handleSlotUpload = async (_stripId, slotIndex, event) => {
    const file = event?.target?.files?.[0];
    event.target.value = "";
    if (!file) return;

    let dataUrl = null;
    try {
      dataUrl = await readFileAsDataUrl(file);
    } catch {
      return;
    }
    if (!dataUrl || typeof dataUrl !== "string") return;

    setStrip((prev) => {
      const slotCount = getSlotCount(prev);
      const images = Array.from({ length: slotCount }, (_, i) => prev.images?.[i] ?? null);
      const imagePositions = Array.from({ length: slotCount }, (_, i) =>
        prev.imagePositions?.[i] ?? { x: 50, y: 50, zoom: 1 }
      );
      images[slotIndex] = dataUrl;
      return { ...prev, images, imagePositions };
    });
  };

  const removeSlotImage = (stripId, slotIndex) => {
    setStrip((prev) => {
      if (prev.id !== stripId) return prev;
      const slotCount = getSlotCount(prev);
      const images = Array.from({ length: slotCount }, (_, i) => prev.images?.[i] ?? null);
      images[slotIndex] = null;
      return { ...prev, images };
    });
  };

  const panImage = useCallback((stripId, slotIndex, deltaX, deltaY) => {
    setStrip((prev) => {
      if (prev.id !== stripId || !prev.imagePositions?.[slotIndex]) return prev;
      const current = prev.imagePositions[slotIndex];
      const nextPositions = [...prev.imagePositions];
      nextPositions[slotIndex] = {
        ...current,
        x: Math.max(0, Math.min(100, (current.x ?? 50) - deltaX)),
        y: Math.max(0, Math.min(100, (current.y ?? 50) - deltaY)),
      };
      return { ...prev, imagePositions: nextPositions };
    });
  }, []);

  const zoomImage = useCallback((stripId, slotIndex, delta) => {
    setStrip((prev) => {
      if (prev.id !== stripId || !prev.imagePositions?.[slotIndex]) return prev;
      const current = prev.imagePositions[slotIndex];
      const nextPositions = [...prev.imagePositions];
      nextPositions[slotIndex] = {
        ...current,
        zoom: Math.max(0.5, Math.min(2.5, (current.zoom ?? 1) + delta)),
      };
      return { ...prev, imagePositions: nextPositions };
    });
  }, []);

  const handleWheelZoom = useCallback(
    (stripId, slotIndex, event) => {
      event.preventDefault();
      zoomImage(stripId, slotIndex, Math.max(-0.12, Math.min(0.12, -event.deltaY * 0.002)));
    },
    [zoomImage]
  );

  const startDrag = (stripId, slotIndex, startX, startY) => {
    setDragState({ stripId, imgIdx: slotIndex, startX, startY });
  };

  useEffect(() => {
    if (!dragState) return;
    dragStateRef.current = dragState;

    const getPoint = (event) =>
      event.touches ? event.touches[0] : { clientX: event.clientX, clientY: event.clientY };

    const onMove = (event) => {
      const state = dragStateRef.current;
      if (!state) return;
      if (event.touches) event.preventDefault();
      const pt = getPoint(event);
      const deltaX = ((pt.clientX - state.startX) / 200) * 100;
      const deltaY = ((pt.clientY - state.startY) / 200) * 100;
      panImage(state.stripId, state.imgIdx, deltaX, deltaY);
      dragStateRef.current = { ...state, startX: pt.clientX, startY: pt.clientY };
    };

    const onUp = () => {
      setDragState(null);
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragState, panImage]);

  const filled = filledSlotCount(strip);
  const total = getSlotCount(strip);
  const isComplete = filled === total && total > 0;

  return {
    strip,
    theme: PHOTO_THEMES.none,
    dragState,
    hoverState,
    fileInputRefs,
    pinchRef,
    filled,
    total,
    isComplete,
    selectFrame,
    applyFrameFresh,
    resetEditor,
    updateStrip,
    triggerUpload,
    handleSlotUpload,
    removeSlotImage,
    handleWheelZoom,
    handlePinchZoom: zoomImage,
    startDrag,
    setHoverState,
    clearHover: () => setHoverState(null),
    cancelDrag: () => setDragState(null),
  };
}

export function frameFromStrip(strip) {
  if (!strip?.frameSource || strip.frameSource === "none") return null;
  return {
    id: strip.frameSource,
    layoutType: strip.layoutType,
    src: strip.frameOverlaySrc,
    ...strip.frameLayoutOptions,
  };
}
