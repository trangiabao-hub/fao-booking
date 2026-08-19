import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const HOLE_PAD = 8;
const TIP_W = 304;
const TIP_GAP = 12;
const EDGE = 12;
/** Lớp mờ trung tính — chỉ cần tách vùng đang nói tới, không nhuộm màu giao diện. */
const SCRIM = "rgba(15, 23, 42, 0.45)";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readRect(selector) {
  if (!selector || typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function sameRect(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

/**
 * Coach-mark tour: khoét sáng phần tử theo selector rồi chú thích bên cạnh.
 * Vùng sáng vẫn bấm được — khách thao tác thật ngay trong lúc xem hướng dẫn.
 * Bước nào không tìm thấy phần tử sẽ bị bỏ qua (mobile và desktop render khác nhau).
 */
export default function PtbTour({ open, steps, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [tipHeight, setTipHeight] = useState(190);
  const tipRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const resolveFrom = useCallback(
    (start, dir) => {
      let i = start;
      while (i >= 0 && i < steps.length && !readRect(steps[i].selector)) {
        i += dir;
      }
      return i >= 0 && i < steps.length ? i : -1;
    },
    [steps],
  );

  // Chỉ khởi tạo khi open bật lên — parent re-render không được kéo tour về bước 1.
  const startedRef = useRef(false);
  useLayoutEffect(() => {
    if (!open) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;

    const first = resolveFrom(0, 1);
    if (first < 0) {
      onClose?.();
      return;
    }
    setIndex(first);
    setRect(readRect(steps[first].selector));
  }, [open, resolveFrom, steps, onClose]);

  const step = open ? steps[index] : null;

  // Vị trí phần tử đổi theo resize / mở bảng tùy chỉnh / ảnh load xong → đo lại định kỳ.
  useEffect(() => {
    if (!open || !step) return undefined;

    const measure = () => {
      const next = readRect(step.selector);
      setRect((prev) => (sameRect(prev, next) ? prev : next));
    };

    measure();
    document
      .querySelector(step.selector)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  useEffect(() => {
    const el = tipRef.current;
    if (!open || !el) return undefined;
    const ro = new ResizeObserver(() => setTipHeight(el.offsetHeight));
    ro.observe(el);
    setTipHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [open, index]);

  const commit = useCallback(
    (next) => {
      if (next < 0) {
        onClose?.();
        return;
      }
      setIndex(next);
      setRect(readRect(steps[next].selector));
    },
    [steps, onClose],
  );

  const go = useCallback(
    (dir) => {
      const next = resolveFrom(index + dir, dir);
      const current = steps[index];
      const leavingGroup =
        current?.group && steps[next]?.group !== current.group;

      if (leavingGroup && current.dismissSelector) {
        document.querySelector(current.dismissSelector)?.click();
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => commit(next), 280);
        return;
      }
      commit(next);
    },
    [index, resolveFrom, steps, commit],
  );

  // Bước tương tác: khách chạm thẳng vào phần tử thì tour tự đi tiếp.
  useEffect(() => {
    if (!open || !step || step.advanceOn !== "click") return undefined;
    const el = document.querySelector(step.selector);
    if (!el) return undefined;

    const onClick = () => {
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => go(1), step.advanceDelay ?? 320);
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [open, step, go]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go, onClose]);

  if (!open || !step || typeof document === "undefined") return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tipW = Math.min(TIP_W, vw - EDGE * 2);

  const hole = rect
    ? {
        top: rect.top - HOLE_PAD,
        left: rect.left - HOLE_PAD,
        width: rect.width + HOLE_PAD * 2,
        height: rect.height + HOLE_PAD * 2,
      }
    : null;

  let tipTop;
  let tipLeft;
  if (hole) {
    const below = hole.top + hole.height + TIP_GAP;
    const above = hole.top - TIP_GAP - tipHeight;
    if (below + tipHeight <= vh - EDGE) tipTop = below;
    else if (above >= EDGE) tipTop = above;
    else tipTop = Math.max(EDGE, vh - tipHeight - EDGE);
    tipLeft = clamp(
      hole.left + hole.width / 2 - tipW / 2,
      EDGE,
      Math.max(EDGE, vw - tipW - EDGE),
    );
  } else {
    tipTop = Math.max(EDGE, vh / 2 - tipHeight / 2);
    tipLeft = clamp(vw / 2 - tipW / 2, EDGE, Math.max(EDGE, vw - tipW - EDGE));
  }

  const isLast = resolveFrom(index + 1, 1) < 0;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[200]"
      role="dialog"
      aria-modal="false"
      aria-label={`Hướng dẫn: ${step.title}`}
    >
      {/* Bốn mảng chắn quanh vùng sáng — chặn bấm nhầm ra ngoài nhưng chừa
          đúng phần tử đang giới thiệu để khách thao tác thật. */}
      {hole ? (
        <>
          <div
            className="pointer-events-auto absolute inset-x-0 top-0"
            style={{ height: Math.max(0, hole.top) }}
          />
          <div
            className="pointer-events-auto absolute inset-x-0 bottom-0"
            style={{ top: hole.top + hole.height }}
          />
          <div
            className="pointer-events-auto absolute left-0"
            style={{
              top: hole.top,
              height: hole.height,
              width: Math.max(0, hole.left),
            }}
          />
          <div
            className="pointer-events-auto absolute right-0"
            style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-md transition-all duration-200"
            style={{
              top: hole.top,
              left: hole.left,
              width: hole.width,
              height: hole.height,
              boxShadow: `0 0 0 9999px ${SCRIM}`,
              outline: "2px solid #E85C9C",
            }}
          />
        </>
      ) : (
        <div
          className="pointer-events-auto absolute inset-0"
          style={{ background: SCRIM }}
        />
      )}

      <div
        ref={tipRef}
        className="pointer-events-auto absolute rounded-2xl border border-[#F3D4E4] bg-white p-4 shadow-[0_18px_44px_rgba(61,36,48,0.24)] transition-all duration-200"
        style={{ top: tipTop, left: tipLeft, width: tipW }}
      >
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#D9488A]">
          Bước {index + 1}/{steps.length}
        </p>
        <h3 className="mt-1 text-[15px] font-bold leading-snug text-[#3D2430]">
          {step.title}
        </h3>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[#6E5360]">
          {step.body}
        </p>
        {step.hint ? (
          <p className="mt-2 rounded-lg bg-[#FDE8F0] px-2.5 py-1.5 text-[12px] font-semibold leading-relaxed text-[#C7367A]">
            {step.hint}
          </p>
        ) : null}

        <div className="mt-3.5 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="mr-auto text-[13px] font-semibold text-[#A98F9C] transition-colors hover:text-[#6E5360]"
          >
            Bỏ qua
          </button>
          {index > 0 ? (
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#F3D4E4] px-3.5 text-[13px] font-bold text-[#6E5360] transition-colors hover:bg-[#FFF6FA]"
            >
              Trước
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => go(1)}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#D9488A] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#C7367A]"
          >
            {isLast ? "Bắt đầu thôi" : "Tiếp"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
