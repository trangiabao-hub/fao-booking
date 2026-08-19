import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckIcon,
  PhotoIcon,
  PrinterIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import SlideNav from "../../components/SlideNav";
import PtbToast from "../../ptb/components/ui/PtbToast";
import PhotoLightbox from "../../ptb/components/ui/PhotoLightbox";
import {
  ensureSession,
  fetchMyAlbums,
  submitPrintRequest,
} from "../../ptb/api/ptbApi";
import { FREE_PRINT_QUOTA, PAID_PRINT_PRICE_VND } from "../../ptb/lib/constants";
import { resolveMediaUrl } from "../../ptb/lib/frameUtils";
import { buildPtbPrintNote } from "../../ptb/lib/printOptions";
import { PTB_EVENTS, trackPtbEvent } from "../../ptb/lib/ptbAnalytics";
import { savePhotosToDevice } from "../../ptb/lib/savePhotos";
import { cn } from "../../ptb/lib/theme";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import { loadCustomerSession } from "../../utils/storage";

dayjs.locale("vi");

const vnd = (n) => `${Number(n || 0).toLocaleString("vi-VN")}đ`;

/**
 * Strip 1×4 in trên giấy 2×6", các layout còn lại 4×6". Giữ đúng tỉ lệ này để
 * ô ảnh không bóp méo và không phải crop — chiều cao thả tự do theo tỉ lệ.
 */
const TILE_ASPECT = { "1x4": "2 / 6", "1x3": "2 / 6" };
const DEFAULT_TILE_ASPECT = "4 / 6";
const UNDATED = "undated";
const LONG_PRESS_MS = 420;

/** Bottom bar cao 68px + đệm đáy của nó; thanh thao tác phải nằm trên khoảng đó. */
const ABOVE_NAV = "calc(5rem + max(12px, env(safe-area-inset-bottom, 0px)))";

/**
 * Backend trừ cả phần đang chờ in khi tính quota, nhưng `freePrintRemaining` thì chưa —
 * tự trừ ở đây để con số hiện trên UI khớp với lúc bấm gửi.
 */
function freeRemainingOf(album) {
  const pendingFree = (album?.printRequests || [])
    .filter((req) => req?.status === "PENDING")
    .reduce((sum, req) => sum + (req.freeCount || 0), 0);
  return Math.max(0, (album?.freePrintRemaining ?? 0) - pendingFree);
}

function printedImageIdsOf(album) {
  const ids = new Set();
  for (const req of album?.printRequests || []) {
    if (!req || req.status === "CANCELLED") continue;
    for (const item of req.items || []) {
      const id = item?.ptbImageId ?? item?.imageId;
      if (id != null) ids.add(Number(id));
    }
  }
  return ids;
}

function flattenPhotos(albums) {
  const photos = [];
  for (const album of albums) {
    const printed = printedImageIdsOf(album);
    const freeRemaining = freeRemainingOf(album);
    for (const image of album.images || []) {
      photos.push({
        ...image,
        albumTitle: album.title,
        shareToken: album.shareToken,
        orderIdNew: album.orderIdNew,
        freeRemaining,
        canPrint: album.status === "ACTIVE",
        printed: printed.has(Number(image.id)),
      });
    }
  }
  return photos.sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );
}

function dayLabel(day) {
  const today = dayjs();
  if (day.isSame(today, "day")) return "Hôm nay";
  if (day.isSame(today.subtract(1, "day"), "day")) return "Hôm qua";
  if (day.isSame(today, "year")) return day.format("dddd, D [tháng] M");
  return day.format("D [tháng] M, YYYY");
}

/** Timeline: mỗi mốc là một ngày, ngày mới nhất lên đầu. */
function groupByDay(photos) {
  const buckets = new Map();

  for (const photo of photos) {
    const day = photo.createdAt ? dayjs(photo.createdAt) : null;
    const key = day?.isValid() ? day.format("YYYY-MM-DD") : UNDATED;
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label: day?.isValid() ? dayLabel(day) : "Không rõ thời gian",
        photos: [],
      });
    }
    buckets.get(key).photos.push(photo);
  }

  // photos đã sort giảm dần nên thứ tự bucket cũng giảm dần; chỉ cần đẩy
  // nhóm không có ngày xuống cuối.
  return [...buckets.values()].sort((a, b) => {
    if (a.key === UNDATED) return 1;
    if (b.key === UNDATED) return -1;
    return 0;
  });
}

/** Gom ảnh đã chọn theo album vì mỗi album có quota và phiên in riêng. */
function buildPrintPlan(photos) {
  const groups = new Map();
  const blocked = [];

  for (const photo of photos) {
    if (!photo.canPrint) {
      blocked.push(photo);
      continue;
    }
    if (!groups.has(photo.shareToken)) {
      groups.set(photo.shareToken, {
        shareToken: photo.shareToken,
        albumTitle: photo.albumTitle,
        freeRemaining: photo.freeRemaining,
        photos: [],
      });
    }
    groups.get(photo.shareToken).photos.push(photo);
  }

  let freeCount = 0;
  let paidCount = 0;
  for (const group of groups.values()) {
    group.freeUsed = Math.min(
      group.photos.length,
      Math.max(0, group.freeRemaining),
    );
    group.extraCount = group.photos.length - group.freeUsed;
    freeCount += group.freeUsed;
    paidCount += group.extraCount;
  }

  return {
    groups: [...groups.values()],
    blocked,
    freeCount,
    paidCount,
    subtotal: paidCount * PAID_PRINT_PRICE_VND,
  };
}

export default function AlbumPage() {
  const hasSession = !!loadCustomerSession()?.token;

  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printBw, setPrintBw] = useState(false);
  const [printNoCrop, setPrintNoCrop] = useState(false);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);

  /** Nhấn giữ để vào chế độ chọn — click sau đó phải bị bỏ qua. */
  const longPress = useRef({ timer: null, fired: false });

  useBodyScrollLock(printOpen);

  const photos = useMemo(() => flattenPhotos(albums), [albums]);
  const timeline = useMemo(() => groupByDay(photos), [photos]);
  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selected.has(photo.id)),
    [photos, selected],
  );
  const plan = useMemo(() => buildPrintPlan(selectedPhotos), [selectedPhotos]);
  const printableCount = plan.freeCount + plan.paidCount;
  const allSelected = photos.length > 0 && selected.size === photos.length;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await fetchMyAlbums();
      setAlbums(data);
      // Ảnh vừa bị xoá ở nơi khác thì không được kẹt lại trong vùng chọn.
      const alive = new Set(
        data.flatMap((album) => (album.images || []).map((img) => img.id)),
      );
      setSelected((prev) => new Set([...prev].filter((id) => alive.has(id))));
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được album của bạn");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasSession) {
      setLoading(false);
      return;
    }
    load();
  }, [hasSession, load]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const startLongPress = (event, photoId) => {
    // Chuột không dùng nhấn giữ — click chậm không được biến thành chọn ảnh.
    if (event.pointerType === "mouse") return;
    longPress.current.fired = false;
    longPress.current.timer = setTimeout(() => {
      longPress.current.fired = true;
      setSelectMode(true);
      toggle(photoId);
      navigator.vibrate?.(8);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPress.current.timer) clearTimeout(longPress.current.timer);
    longPress.current.timer = null;
  };

  const handleTileClick = (photo) => {
    if (longPress.current.fired) {
      longPress.current.fired = false;
      return;
    }
    if (selectMode) {
      toggle(photo.id);
      return;
    }
    setViewerIndex(photos.findIndex((p) => p.id === photo.id));
  };

  const handleSave = async (list = selectedPhotos) => {
    if (!list.length || busy) return;
    setBusy("save");
    try {
      const { method, count } = await savePhotosToDevice(list);
      if (method === "cancelled") return;
      setToast({
        message:
          method === "share"
            ? `Đã mở trình lưu cho ${count} ảnh`
            : `Đã tải ${count} ảnh về máy`,
        type: "success",
      });
      if (list === selectedPhotos) exitSelectMode();
    } catch (err) {
      setToast({
        message: err?.message || "Không lưu được ảnh",
        type: "error",
      });
    } finally {
      setBusy("");
    }
  };

  const handlePrint = async () => {
    if (!plan.groups.length || busy) return;
    setBusy("print");
    const note = buildPtbPrintNote({ printBw, printNoCrop });
    const failed = [];

    for (const group of plan.groups) {
      try {
        const { sessionToken } = await ensureSession(group.shareToken);
        const result = await submitPrintRequest(group.shareToken, sessionToken, {
          imageIds: group.photos.map((photo) => photo.id),
          paymentMethod: group.extraCount > 0 ? "PAY_AT_STORE" : "FREE_ONLY",
          note,
        });
        trackPtbEvent(PTB_EVENTS.PRINT_SUBMITTED, {
          shareToken: group.shareToken,
          freeCount: result?.freeCount,
          paidCount: result?.paidCount,
        });
        if ((result?.paidCount ?? 0) > 0) {
          trackPtbEvent(PTB_EVENTS.PAID_PRINTS, {
            shareToken: group.shareToken,
            subtotalVnd: result?.subtotalVnd,
          });
        }
      } catch (err) {
        failed.push(
          err?.response?.data?.message || `Album "${group.albumTitle}" gửi lỗi`,
        );
      }
    }

    setBusy("");
    setPrintOpen(false);
    exitSelectMode();
    await load({ silent: true });

    setToast(
      failed.length
        ? { message: failed[0], type: "error" }
        : {
            message: "Đã gửi yêu cầu in. Shop sẽ in và giao khi bạn trả máy.",
            type: "success",
          },
    );
  };

  /**
   * `overlays` nằm ngoài cột nội dung: cột đó có `z-10` nên tạo stacking context,
   * lightbox / sheet đặt bên trong sẽ bị thanh nav (z-70) đè lên.
   */
  const shell = (children, overlays = null) => (
    <div className="relative min-h-dvh bg-[#F7F4F6] px-3 pb-32 sm:px-5 md:pb-36">
      {/* Vệt sáng hồng rất mờ ở đầu trang để canvas có chiều sâu, ảnh nổi lên trên */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-80 bg-[radial-gradient(90%_100%_at_50%_0%,#FFE1EF_0%,rgba(255,225,239,0)_72%)]"
      />
      <SlideNav />
      <div className="relative z-10 mx-auto w-full max-w-5xl">{children}</div>
      {overlays}
      <PtbToast
        message={toast?.message}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />
    </div>
  );

  if (!hasSession) {
    return shell(
      <div className="mt-8 rounded-3xl border border-[#F1E4EC] bg-white p-8 text-center shadow-[0_12px_32px_rgba(16,24,40,0.06)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF2F8] text-2xl">
          🔐
        </div>
        <h1 className="mt-4 text-lg font-black text-[#172033]">
          Đăng nhập để xem album
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
          Ảnh photobooth được lưu theo tài khoản, nên bạn cần đăng nhập để xem
          lại toàn bộ ảnh đã ghép.
        </p>
        <Link
          to="/account"
          className="mt-5 inline-flex rounded-2xl bg-[#1F1F1F] px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
        >
          Đăng nhập ngay
        </Link>
      </div>,
    );
  }

  return shell(
    <>
      {/* Thanh trên đổi vai theo chế độ, giống các app ảnh: xem → chọn */}
      <header className="sticky top-0 z-30 -mx-3 bg-[#F7F4F6]/85 px-3 py-2.5 backdrop-blur-md sm:-mx-5 sm:px-5">
        {selectMode ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exitSelectMode}
              aria-label="Thoát chế độ chọn"
              className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-full text-[#344054] transition hover:bg-[#F7F3F5]"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <p className="flex-1 text-[15px] font-bold text-[#172033]">
              {selected.size ? `Đã chọn ${selected.size}` : "Chọn ảnh"}
            </p>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  allSelected
                    ? new Set()
                    : new Set(photos.map((photo) => photo.id)),
                )
              }
              className="rounded-full px-3 py-2 text-[13px] font-bold text-[#E6007E] transition hover:bg-[#FFF2F8]"
            >
              {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black tracking-tight text-[#172033]">
                Album của tôi
              </h1>
              <p className="mt-0.5 text-[13px] font-medium text-[#667085]">
                {loading
                  ? "Đang tải ảnh…"
                  : `${photos.length} ảnh đã ghép từ ${albums.length} chuyến thuê`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => load({ silent: true })}
              disabled={refreshing}
              aria-label="Làm mới"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#667085] transition hover:bg-[#F7F3F5] hover:text-[#E6007E] disabled:opacity-50"
            >
              <ArrowPathIcon
                className={cn("h-5 w-5", refreshing && "animate-spin")}
              />
            </button>
            {photos.length ? (
              <button
                type="button"
                onClick={() => setSelectMode(true)}
                className="h-10 rounded-full border border-[#F1E4EC] px-4 text-[13px] font-bold text-[#172033] transition hover:border-[#F3D4E4] hover:text-[#E6007E]"
              >
                Chọn
              </button>
            ) : null}
          </div>
        )}
      </header>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-3 columns-3 gap-0.75 sm:columns-4 sm:gap-1 lg:columns-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: i % 3 === 0 ? TILE_ASPECT["1x4"] : DEFAULT_TILE_ASPECT,
              }}
              className="mb-0.75 break-inside-avoid animate-pulse bg-[#F5EDF2] sm:mb-1"
            />
          ))}
        </div>
      ) : null}

      {!loading && !photos.length ? (
        <div className="mt-8 rounded-3xl border border-[#F1E4EC] bg-white p-8 text-center shadow-[0_12px_32px_rgba(16,24,40,0.06)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF2F8]">
            <PhotoIcon className="h-7 w-7 text-[#E6007E]" />
          </div>
          <h2 className="mt-4 text-lg font-black text-[#172033]">
            Chưa có ảnh nào
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
            Mỗi đơn thuê được tặng {FREE_PRINT_QUOTA} ảnh photobooth in miễn
            phí. Ghép ảnh trong album của đơn thuê, ảnh sẽ hiện ở đây.
          </p>
          <Link
            to="/my-bookings"
            className="mt-5 inline-flex rounded-2xl bg-[#1F1F1F] px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
          >
            Tới đơn của tôi
          </Link>
        </div>
      ) : null}

      {photos.length
        ? timeline.map((group) => (
            <section key={group.key} className="mt-1">
              <div className="sticky top-17 z-20 -mx-3 bg-[#F7F4F6]/85 px-3 py-2 backdrop-blur-md sm:-mx-5 sm:px-5">
                <h2 className="text-[13px] font-bold text-[#172033] first-letter:uppercase">
                  {group.label}
                  <span className="ml-2 text-[11px] font-semibold text-[#98A2B3]">
                    {group.photos.length} ảnh
                  </span>
                </h2>
              </div>

              {/* Masonry: cột đều nhau, chiều cao ô theo tỉ lệ thật của ảnh */}
              <div className="columns-3 gap-0.75 sm:columns-4 sm:gap-1 lg:columns-6">
                {group.photos.map((photo) => {
                  const active = selected.has(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className="group relative mb-0.75 break-inside-avoid sm:mb-1"
                    >
                      <button
                        type="button"
                        onClick={() => handleTileClick(photo)}
                        onPointerDown={(e) => startLongPress(e, photo.id)}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        onContextMenu={(e) => e.preventDefault()}
                        aria-pressed={selectMode ? active : undefined}
                        style={{
                          aspectRatio:
                            TILE_ASPECT[photo.layoutType] ?? DEFAULT_TILE_ASPECT,
                        }}
                        className={cn(
                          "relative block w-full select-none overflow-hidden bg-white transition",
                          active
                            ? "ring-2 ring-[#E6007E] ring-offset-1"
                            : "ring-1 ring-black/6",
                        )}
                      >
                        <img
                          src={resolveMediaUrl(photo.imageUrl || photo.thumbUrl)}
                          alt=""
                          loading="lazy"
                          draggable={false}
                          className={cn(
                            "h-full w-full object-cover transition-transform duration-200",
                            active ? "scale-[0.94]" : "group-hover:scale-[1.03]",
                          )}
                        />
                        {photo.printed ? (
                          <span className="absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
                            Đã gửi in
                          </span>
                        ) : null}
                      </button>

                      {/* Vòng chọn: luôn hiện khi đang chọn, còn lại chỉ hiện khi hover */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectMode(true);
                          toggle(photo.id);
                        }}
                        aria-label={active ? "Bỏ chọn ảnh" : "Chọn ảnh"}
                        className={cn(
                          "absolute left-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full transition",
                          active || selectMode
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                        )}
                      >
                        {active ? (
                          <CheckCircleIcon className="h-6 w-6 text-[#E6007E] drop-shadow" />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-black/20 text-white shadow">
                            <CheckIcon className="h-3 w-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        : null}
    </>,
    <>
      {selected.size ? (
        <div
          className="fixed inset-x-0 z-[75] px-3"
          style={{ bottom: ABOVE_NAV }}
        >
          <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded-2xl border border-[#F1E4EC] bg-white/97 p-2 shadow-[0_12px_32px_rgba(16,24,40,0.16)] backdrop-blur-md">
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={!!busy}
              aria-label="Lưu về máy"
              className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#F1E4EC] px-3 text-[13px] font-bold text-[#172033] transition hover:border-[#F3D4E4] disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              <span className="hidden sm:inline">
                {busy === "save" ? "Đang lưu…" : "Lưu về máy"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPrintOpen(true)}
              disabled={!!busy}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#E6007E] text-[13px] font-bold text-white transition hover:bg-[#cf0071] disabled:opacity-50"
            >
              <PrinterIcon className="h-4 w-4" />
              Gửi shop in {selected.size} ảnh
            </button>
          </div>
        </div>
      ) : null}

      {viewerIndex != null ? (
        <PhotoLightbox
          photos={photos}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onNavigate={setViewerIndex}
          selectedIds={selected}
          onToggleSelect={(id) => {
            setSelectMode(true);
            toggle(id);
          }}
          onSave={(photo) => handleSave([photo])}
          onPrint={(photo) => {
            // Gửi in đúng ảnh đang xem: chốt vùng chọn về ảnh này rồi mở sheet.
            setSelected(new Set([photo.id]));
            setSelectMode(true);
            setViewerIndex(null);
            setPrintOpen(true);
          }}
          saving={busy === "save"}
        />
      ) : null}

      {printOpen ? (
        <div className="fixed inset-0 z-[140] flex items-end justify-center bg-[rgba(15,23,42,0.5)] backdrop-blur-[2px] sm:items-center sm:p-4">
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setPrintOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Gửi shop in"
            className="relative w-full max-w-md rounded-t-3xl border border-[#F1E4EC] bg-white px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_40px_rgba(16,24,40,0.18)] sm:rounded-3xl sm:pb-5 sm:pt-5"
          >
            <span
              aria-hidden
              className="mx-auto mb-3 block h-1 w-10 rounded-full bg-[#E9DDE4] sm:hidden"
            />

            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[17px] font-bold text-[#172033]">
                {printableCount
                  ? `Gửi shop in ${printableCount} ảnh`
                  : "Không đặt in được"}
              </h2>
              <button
                type="button"
                onClick={() => setPrintOpen(false)}
                className="-mr-1 -mt-1 rounded-full p-1 text-[#98A2B3] transition hover:bg-[#F7F7F7]"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {printableCount ? (
              <dl className="mt-3 overflow-hidden rounded-2xl border border-[#F1E4EC]">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="text-[13px] text-[#667085]">Ảnh miễn phí</dt>
                  <dd className="text-[13px] font-bold text-[#172033]">
                    {plan.freeCount} ảnh
                  </dd>
                </div>
                {plan.paidCount > 0 ? (
                  <div className="flex items-center justify-between gap-3 border-t border-[#F6EFF3] px-4 py-2.5">
                    <dt className="text-[13px] text-[#667085]">In thêm</dt>
                    <dd className="text-[13px] font-bold text-[#172033]">
                      {plan.paidCount} ảnh
                    </dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-3 border-t border-[#F6EFF3] bg-[#FFF7FB] px-4 py-3">
                  <dt className="text-[13px] text-[#667085]">
                    {plan.paidCount > 0 ? "Trả tại shop" : "Chi phí"}
                  </dt>
                  <dd
                    className={cn(
                      "text-[15px] font-black",
                      plan.paidCount > 0 ? "text-[#172033]" : "text-emerald-700",
                    )}
                  >
                    {plan.paidCount > 0
                      ? vnd(plan.subtotal)
                      : "Trong quota miễn phí"}
                  </dd>
                </div>
              </dl>
            ) : null}

            {plan.blocked.length ? (
              <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12px] font-medium text-amber-800">
                {plan.blocked.length} ảnh thuộc đơn thuê đã kết thúc nên shop
                không nhận in nữa
                {printableCount ? ", sẽ được bỏ qua" : ""}. Bạn vẫn lưu về máy
                bình thường.
              </p>
            ) : null}

            {printableCount ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#F1E4EC]">
                <label className="flex cursor-pointer items-center gap-2.5 px-4 py-3 text-[13px] font-semibold text-[#344054]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#E6007E]"
                    checked={printBw}
                    onChange={(e) => setPrintBw(e.target.checked)}
                  />
                  In ảnh trắng đen
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 border-t border-[#F6EFF3] px-4 py-3 text-[13px] font-semibold text-[#344054]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#E6007E]"
                    checked={printNoCrop}
                    onChange={(e) => setPrintNoCrop(e.target.checked)}
                  />
                  In không cắt
                </label>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePrint}
              disabled={busy === "print" || !printableCount}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#E6007E] text-sm font-bold text-white transition hover:bg-[#cf0071] disabled:opacity-50"
            >
              <PrinterIcon className="h-5 w-5" />
              {busy === "print" ? "Đang gửi…" : "Xác nhận gửi in"}
            </button>
            {printableCount ? (
              <p className="mt-2 text-center text-[11px] font-medium text-[#98A2B3]">
                Shop in và giao khi bạn trả máy.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>,
  );
}
