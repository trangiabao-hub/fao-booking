import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { clamp } from "../lib/utils";
import "./PhotoAdjustModal.css";

const MIN_CROP = 48;
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/**
 * Modal crop kiểu PhotoXinh:
 * - Ảnh contain trong stage
 * - Vùng active tỉ lệ cố định = lỗ cắt frame
 * - Kéo / resize (giữ tỉ lệ) vùng crop
 * - Confirm → trả dataURL đã cắt
 */
export default function PhotoAdjustModal({
  open,
  imageSrc,
  aspectRatio = 1,
  onCancel,
  onConfirm,
}) {
  const stageRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [layout, setLayout] = useState(null); // { left, top, width, height } of fitted image
  const [crop, setCrop] = useState(null); // { x, y, w, h } relative to fitted image

  const aspect = Number(aspectRatio) > 0 ? Number(aspectRatio) : 1;

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img?.naturalWidth) return;

    const stageRect = stage.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    const nextLayout = {
      left: imgRect.left - stageRect.left,
      top: imgRect.top - stageRect.top,
      width: imgRect.width,
      height: imgRect.height,
    };
    if (nextLayout.width < 2 || nextLayout.height < 2) return;

    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setLayout(nextLayout);

    setCrop((prev) => {
      if (prev && prev._forSrc === imageSrc) {
        return clampCrop(prev, nextLayout, aspect);
      }
      return initialCrop(nextLayout, aspect, imageSrc);
    });
  }, [aspect, imageSrc]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    measure();
    const stage = stageRef.current;
    if (!stage) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onMove = (event) => {
      const drag = dragRef.current;
      const box = layout;
      if (!drag || !box) return;
      if (event.cancelable) event.preventDefault();
      const point = event.touches?.[0] ?? event;
      const dx = point.clientX - drag.startX;
      const dy = point.clientY - drag.startY;

      if (drag.mode === "move") {
        setCrop(
          clampCrop(
            {
              ...drag.origin,
              x: drag.origin.x + dx,
              y: drag.origin.y + dy,
              _forSrc: imageSrc,
            },
            box,
            aspect,
          ),
        );
        return;
      }

      if (drag.mode === "resize") {
        setCrop(
          resizeCrop(drag.origin, drag.handle, dx, dy, box, aspect, imageSrc),
        );
      }
    };
    const onEnd = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [open, layout, aspect, imageSrc]);

  if (!open || !imageSrc) return null;

  const startMove = (event) => {
    if (!crop) return;
    if (event.target.closest?.("[data-crop-handle]")) return;
    event.preventDefault();
    const point = event.touches?.[0] ?? event;
    dragRef.current = {
      mode: "move",
      startX: point.clientX,
      startY: point.clientY,
      origin: { ...crop },
    };
  };

  const startResize = (handle, event) => {
    if (!crop) return;
    event.preventDefault();
    event.stopPropagation();
    const point = event.touches?.[0] ?? event;
    dragRef.current = {
      mode: "resize",
      handle,
      startX: point.clientX,
      startY: point.clientY,
      origin: { ...crop },
    };
  };

  const handleConfirm = async () => {
    if (!crop || !layout || !natural.w) return;
    const dataUrl = await cropToDataUrl(imageSrc, natural, layout, crop);
    onConfirm?.(dataUrl);
  };

  return (
    <div className="photo-adjust-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="photo-adjust-modal__backdrop"
        aria-label="Đóng"
        onClick={onCancel}
      />
      <div className="photo-adjust-modal__panel photo-adjust-modal__panel--crop">
        <header className="photo-adjust-modal__header">
          <h2>Chọn vùng ảnh</h2>
          <button
            type="button"
            className="photo-adjust-modal__icon-btn"
            onClick={onCancel}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>

        <div className="photo-adjust-modal__stage photo-adjust-modal__stage--crop" ref={stageRef}>
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop"
            draggable={false}
            className="photo-adjust-modal__crop-img"
            onLoad={measure}
          />

          {layout && crop ? (
            <>
              <div
                className="photo-adjust-modal__dim"
                style={{
                  left: layout.left,
                  top: layout.top,
                  width: layout.width,
                  height: layout.height,
                  clipPath: dimClipPath(crop, layout),
                }}
              />
              <div
                className="photo-adjust-modal__crop"
                style={{
                  left: layout.left + crop.x,
                  top: layout.top + crop.y,
                  width: crop.w,
                  height: crop.h,
                }}
                onMouseDown={startMove}
                onTouchStart={startMove}
              >
                {HANDLES.map((handle) => (
                  <span
                    key={handle}
                    data-crop-handle={handle}
                    className={`photo-adjust-modal__handle is-${handle}`}
                    onMouseDown={(e) => startResize(handle, e)}
                    onTouchStart={(e) => startResize(handle, e)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <p className="photo-adjust-modal__hint">
          Kéo vùng chọn để di chuyển · Kéo góc/cạnh để đổi kích thước (giữ tỉ lệ lỗ
          cắt)
        </p>

        <div className="photo-adjust-modal__actions">
          <button type="button" className="photo-adjust-modal__cancel" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="button"
            className="photo-adjust-modal__confirm"
            onClick={handleConfirm}
            disabled={!crop}
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

function initialCrop(layout, aspect, imageSrc) {
  const { width, height } = layout;
  let w;
  let h;
  if (width / height > aspect) {
    h = height;
    w = h * aspect;
  } else {
    w = width;
    h = w / aspect;
  }
  return {
    x: (width - w) / 2,
    y: (height - h) / 2,
    w,
    h,
    _forSrc: imageSrc,
  };
}

function clampCrop(crop, layout, aspect) {
  const maxW = layout.width;
  const maxH = layout.height;
  let { w, h } = crop;
  // giữ tỉ lệ
  if (w / h > aspect) h = w / aspect;
  else w = h * aspect;
  w = clamp(w, Math.min(MIN_CROP, maxW), maxW);
  h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  const x = clamp(crop.x, 0, Math.max(0, maxW - w));
  const y = clamp(crop.y, 0, Math.max(0, maxH - h));
  return { ...crop, x, y, w, h };
}

function resizeCrop(origin, handle, dx, dy, layout, aspect, imageSrc) {
  let { x, y, w, h } = origin;
  const fromCorner = handle.length === 2;

  if (fromCorner) {
    // Neo góc đối diện, scale theo trục chủ đạo
    const fixRight = handle.includes("w");
    const fixBottom = handle.includes("n");
    const right = x + w;
    const bottom = y + h;

    if (handle.includes("e")) w = origin.w + dx;
    if (handle.includes("w")) w = origin.w - dx;
    if (handle.includes("s")) h = origin.h + dy;
    if (handle.includes("n")) h = origin.h - dy;

    // Ưu tiên cạnh kéo mạnh hơn để suy ra kích thước theo aspect
    const byW = Math.abs(dx) >= Math.abs(dy);
    if (byW) h = w / aspect;
    else w = h * aspect;

    if (fixRight) x = right - w;
    if (fixBottom) y = bottom - h;
  } else {
    // Cạnh giữa: mở theo đúng trục, cạnh kia suy theo aspect, neo tâm cạnh đối
    if (handle === "e") {
      w = origin.w + dx;
      h = w / aspect;
      y = origin.y + (origin.h - h) / 2;
    } else if (handle === "w") {
      w = origin.w - dx;
      h = w / aspect;
      x = origin.x + origin.w - w;
      y = origin.y + (origin.h - h) / 2;
    } else if (handle === "s") {
      h = origin.h + dy;
      w = h * aspect;
      x = origin.x + (origin.w - w) / 2;
    } else if (handle === "n") {
      h = origin.h - dy;
      w = h * aspect;
      y = origin.y + origin.h - h;
      x = origin.x + (origin.w - w) / 2;
    }
  }

  return clampCrop({ x, y, w, h, _forSrc: imageSrc }, layout, aspect);
}

function dimClipPath(crop, layout) {
  // Lỗ trong vùng ảnh — dim phần ngoài crop
  const x = crop.x;
  const y = crop.y;
  const r = crop.x + crop.w;
  const b = crop.y + crop.h;
  const W = layout.width;
  const H = layout.height;
  return `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${x}px ${y}px, ${x}px ${b}px, ${r}px ${b}px, ${r}px ${y}px, ${x}px ${y}px)`;
}

async function cropToDataUrl(src, natural, layout, crop) {
  const img = await loadHtmlImage(src);
  const sx = (crop.x / layout.width) * natural.w;
  const sy = (crop.y / layout.height) * natural.h;
  const sw = (crop.w / layout.width) * natural.w;
  const sh = (crop.h / layout.height) * natural.h;

  const outW = Math.max(1, Math.round(sw));
  const outH = Math.max(1, Math.round(sh));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
