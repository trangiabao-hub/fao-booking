import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowUturnLeftIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";
import { MESSENGER_LINK } from "../../data/contactConfig";
import { BRANCHES } from "../../data/bookingConstants";
import FloatingContactButton from "../../components/FloatingContactButton";
import SlideNav from "../../components/SlideNav";
import PhotoboothGiftBlock from "../../components/PhotoboothGiftBlock";
import { saveRecentOrder, loadCustomerInfo } from "../../utils/storage";
import { trackBookingOrderPaid } from "../../lib/bookingAnalytics";
import {
  inferOrderBookingBranchId,
  normalizeBookingBranchId,
} from "../../utils/deviceBranch";
import { fetchDeviceDisplayMap } from "../../utils/deviceDisplayInfo";
import {
  buildOrderSummaryText,
  formatOrderDateTime,
  getBranchLabelFromId,
  parseCustomerNameFromBookingNote,
} from "../../utils/orderSummary";

function branchMetaFromId(branchIdRaw) {
  const id = normalizeBookingBranchId(branchIdRaw);
  return BRANCHES.find((b) => b.id === id) || BRANCHES[0];
}

/** Nền trắng, viền mảnh, bo 16 — mọi khối dùng chung một khung để trang có nhịp. */
const CARD = "overflow-hidden rounded-2xl border border-[#efe7ea] bg-white";

/** Gom thiết bị trùng tên thành một dòng kèm số lượng. */
function groupDeviceLines(details) {
  const list = details?.devices?.length
    ? details.devices
    : details?.device
      ? [details.device]
      : [];

  const lines = new Map();
  for (const device of list) {
    const name = device?.name || "Thiết bị";
    const existing = lines.get(name);
    if (existing) existing.qty += 1;
    else lines.set(name, { name, img: device?.img || null, qty: 1 });
  }
  return [...lines.values()];
}

/** Ảnh máy 48px; thiếu ảnh hoặc lỗi tải thì đổi sang ô icon thay vì ảnh vỡ. */
function DeviceThumb({ src, alt }) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f8f3f5] text-[#d9c2cc]">
        <CameraIcon className="h-5 w-5" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="h-12 w-12 shrink-0 rounded-lg border border-[#f4eef1] object-cover"
    />
  );
}

/** Hàng hoá đơn: nhãn xám bên trái, giá trị đậm căn phải. */
function ReceiptRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2 sm:px-5">
      <dt className="shrink-0 text-[13px] leading-5 text-[#8a7f84]">{label}</dt>
      <dd className="text-right text-sm font-semibold leading-5 text-[#2b2226]">
        {value}
      </dd>
    </div>
  );
}

function SuccessCard({ details }) {
  const [showMessengerToast, setShowMessengerToast] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const handleAddToCalendar = () => {
    if (!details) return;

    const formatGCALDate = (dateStr) => {
      return new Date(dateStr).toISOString().replace(/-|:|\.\d+/g, "");
    };

    const branchMeta = branchMetaFromId(details.branchId);
    const contactPhone = branchMeta.phone || "0901355198";
    const calendarLocation =
      branchMeta.calendarLocation ||
      "Lầu 1, 475 Huỳnh Văn Bánh, Quận Phú Nhuận, Hồ Chí Minh, Việt Nam";

    const deviceLabel = details.devices?.length
      ? details.devices.map((d) => d.name).join(", ")
      : details.device?.name || "";
    const title = `Thuê máy ảnh: ${deviceLabel}`;
    const startTime = formatGCALDate(details.bookingFrom);
    const endTime = formatGCALDate(details.bookingTo);
    const refLines = [
      details.orderCode != null ? `Mã thanh toán (PayOS): ${details.orderCode}` : null,
      details.orderIdNew ? `Mã đơn hệ thống: ${details.orderIdNew}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const description = `Cảm ơn bạn đã đặt lịch thuê máy ảnh!\n\n${refLines}\nTổng tiền: ${details.total.toLocaleString("vi-VN")} đ\n\nVui lòng có mặt đúng giờ để nhận máy.\nLiên hệ: ${contactPhone}`;

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(calendarLocation)}`;

    window.open(url, "_blank");
  };

  const handleMessengerClick = async () => {
    if (!details) return;
    const message = buildOrderSummaryText(details);
    try {
      await navigator.clipboard.writeText(message);
      window.open(MESSENGER_LINK, "_blank");
      setShowMessengerToast(true);
      setTimeout(() => setShowMessengerToast(false), 3000);
    } catch (err) {
      console.warn("Clipboard failed, opening Messenger only:", err);
      window.open(MESSENGER_LINK, "_blank");
    }
  };

  const handleCopyRef = async () => {
    const ref = details?.orderIdNew || details?.orderCode;
    if (!ref) return;
    try {
      await navigator.clipboard.writeText(String(ref));
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch (err) {
      console.warn("Clipboard failed:", err);
    }
  };

  if (!details) {
    return <LoadingState message="Đang tải chi tiết đơn hàng..." />;
  }

  const branchMeta = branchMetaFromId(details.branchId);
  const mapUrl = branchMeta.mapUrl;
  const pickupSpotLabel =
    branchMeta.pickupSpotLabel || branchMeta.address || "";
  const branchLabel =
    details.branchLabel || getBranchLabelFromId(details.branchId);
  const deviceLines = groupDeviceLines(details);
  const orderRef = details.orderIdNew || (details.orderCode ?? null);
  const albumHref = details.orderIdNew
    ? `/album/order/${details.orderIdNew}`
    : details.orderCode
      ? `/order/code/${details.orderCode}`
      : null;

  return (
    <div className="space-y-3">
      {/* 1 — Trạng thái: gọn để CTA nằm trong màn hình đầu */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={`${CARD} px-5 py-6 text-center`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 220 }}
        >
          <CheckCircleIcon className="mx-auto h-12 w-12 text-emerald-500" />
        </motion.div>
        <h1 className="mt-3 text-[22px] font-black leading-tight tracking-tight text-[#2b2226]">
          Thanh toán thành công
        </h1>
        <p className="mx-auto mt-1.5 max-w-[38ch] text-sm leading-relaxed text-[#8a7f84]">
          Shop đã nhận tiền. Còn một bước cuối để shop xác nhận lịch cho bạn.
        </p>
      </motion.div>

      {/* 2 — Việc duy nhất cần làm ngay */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.35 }}
        className={`${CARD} px-4 py-4 sm:px-5`}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.09em] text-[#E85C9C]">
          Bước cuối
        </p>
        <p className="mt-1 text-[15px] font-bold leading-snug text-[#2b2226]">
          Gửi thông tin đơn cho shop để xác nhận lịch
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#8a7f84]">
          Nội dung đơn được copy sẵn — bạn chỉ cần dán vào chat và gửi.
        </p>
        <button
          type="button"
          onClick={handleMessengerClick}
          className="mt-3.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-4 text-[15px] font-bold text-white transition-colors hover:bg-[#006edc] active:scale-[0.99]"
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0" />
          Nhắn shop qua Messenger
        </button>
        {showMessengerToast ? (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2.5 rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700"
          >
            Đã copy nội dung — dán (Ctrl+V) vào Messenger và gửi shop.
          </motion.p>
        ) : null}
      </motion.div>

      {/* 3 — Quà photobooth (chỉ chi nhánh Phú Nhuận) */}
      <PhotoboothGiftBlock branchId={details.branchId} variant="banner" />

      {/* 4 — Hoá đơn: thiết bị, thời gian, tiền, mã đơn */}
      <section className={CARD}>
        <header className="flex items-center justify-between gap-3 border-b border-[#f4eef1] px-4 py-3 sm:px-5">
          <h2 className="text-sm font-bold text-[#2b2226]">Chi tiết đơn</h2>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
            Đã thanh toán
          </span>
        </header>

        <div className="divide-y divide-[#f7f2f4]">
          {deviceLines.map((line) => (
            <div
              key={line.name}
              className="flex items-center gap-3 px-4 py-3 sm:px-5"
            >
              <DeviceThumb src={line.img} alt={line.name} />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[#2b2226]">
                {line.name}
              </p>
              <span className="shrink-0 text-[13px] text-[#8a7f84]">
                x{line.qty}
              </span>
            </div>
          ))}
        </div>

        <dl className="border-t border-[#f4eef1] py-1">
          <ReceiptRow
            label="Nhận máy"
            value={formatOrderDateTime(details.bookingFrom)}
          />
          <ReceiptRow
            label="Trả máy"
            value={formatOrderDateTime(details.bookingTo)}
          />
          <ReceiptRow label="Chi nhánh" value={branchLabel} />
          <ReceiptRow label="Khách hàng" value={details.customerName} />
        </dl>

        <div className="flex items-baseline justify-between gap-4 border-t border-[#f4eef1] bg-[#fffafc] px-4 py-3 sm:px-5">
          <span className="text-[13px] text-[#8a7f84]">Tổng tiền</span>
          <span className="text-lg font-black tabular-nums text-[#d43487]">
            {Number(details.total || 0).toLocaleString("vi-VN")} đ
          </span>
        </div>

        {orderRef ? (
          <div className="flex items-center gap-3 border-t border-[#f4eef1] px-4 py-2.5 sm:px-5">
            <span className="shrink-0 text-[13px] text-[#8a7f84]">Mã đơn</span>
            <span
              title={String(orderRef)}
              className="min-w-0 flex-1 truncate text-right font-mono text-xs text-[#6d6167]"
            >
              {orderRef}
            </span>
            <button
              type="button"
              onClick={handleCopyRef}
              className="shrink-0 text-[13px] font-bold text-[#E85C9C] transition-opacity active:opacity-60"
            >
              {copiedRef ? "Đã copy" : "Copy"}
            </button>
          </div>
        ) : null}
      </section>

      {/* 5 — Nhận máy: địa chỉ + giấy tờ cần mang */}
      <section className={CARD}>
        <div className="px-4 py-3.5 sm:px-5">
          <h2 className="text-sm font-bold text-[#2b2226]">
            Nhận và hoàn máy tại
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#5f545a]">
            {pickupSpotLabel}
          </p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-[13px] font-bold text-[#E85C9C]"
          >
            Chỉ đường Google Maps
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="border-t border-[#f4eef1] bg-[#fbf8f9] px-4 py-3 text-[13px] leading-relaxed text-[#6d6167] sm:px-5">
          Khi đến nhận máy, mang giúp FAO <strong>CCCD bản gốc</strong> hoặc{" "}
          <strong>VNeID định danh mức 2</strong> nha.
        </p>
      </section>

      {/* 6 — Lối đi phụ: nhẹ hơn CTA chính, dạng danh sách */}
      <section className={CARD}>
        <div className="divide-y divide-[#f7f2f4]">
          {albumHref ? (
            <Link
              to={albumHref}
              className="flex min-h-13 items-center gap-3 px-4 transition-colors active:bg-[#fdf6f9] sm:px-5"
            >
              <CameraIcon className="h-4.5 w-4.5 shrink-0 text-[#E85C9C]" />
              <span className="min-w-0 flex-1 text-sm font-semibold text-[#2b2226]">
                Album & in ảnh miễn phí
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#c9bec3]" />
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="flex min-h-13 w-full items-center gap-3 px-4 text-left transition-colors active:bg-[#fdf6f9] sm:px-5"
          >
            <CalendarIcon className="h-4.5 w-4.5 shrink-0 text-[#E85C9C]" />
            <span className="min-w-0 flex-1 text-sm font-semibold text-[#2b2226]">
              Nhắc lịch bằng Google Calendar
            </span>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-[#c9bec3]" />
          </button>
        </div>
      </section>
    </div>
  );
}

function FailureCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl border border-pink-100 shadow-lg shadow-pink-500/10 p-6 text-center"
    >
      <XCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
      <h2 className="text-2xl font-bold text-pink-800 mt-4">
        Thanh toán thất bại
      </h2>
      <p className="text-slate-600 mt-2">
        Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
      </p>

      <div className="mt-6 space-y-3">
        <Link
          to="/my-bookings"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-semibold border border-[#222] hover:bg-[#333] transition-all"
        >
          Quản lý đơn của tôi
        </Link>
        <Link
          to="/catalog"
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-pink-600 text-white font-semibold shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-all active:scale-95"
        >
          <ArrowUturnLeftIcon className="w-5 h-5" />
          Thử lại
        </Link>

        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200 hover:bg-slate-200 transition-all"
        >
          Về trang chủ
        </Link>
      </div>
    </motion.div>
  );
}

/** Tiền đã về shop nhưng hệ thống không tạo được đơn (trùng slot / lỗi sau thanh toán). */
function OrderCreationFailCard({ details }) {
  const orderCode = details?.orderCode;
  const amount = details?.amount;

  const handleMessengerClick = async () => {
    const lines = [
      "Xin chào shop,",
      "",
      "Em thanh toán PayOS thành công nhưng hệ thống báo không tạo được đơn đặt máy.",
      orderCode != null ? `Mã thanh toán (PayOS): ${orderCode}` : null,
      amount != null ? `Số tiền: ${Number(amount).toLocaleString("vi-VN")} đ` : null,
      "",
      "Nhờ shop kiểm tra và hỗ trợ em sớm ạ.",
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(lines);
    } catch {
      /* ignore */
    }
    window.open(MESSENGER_LINK, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl border border-amber-200 shadow-lg shadow-amber-500/10 p-6 sm:p-8 text-center max-w-lg mx-auto"
    >
      <XCircleIcon className="w-16 h-16 text-amber-500 mx-auto" />
      <h2 className="text-xl sm:text-2xl font-bold text-pink-900 mt-4">
        Tạo đơn thất bại
      </h2>
      <p className="text-slate-700 mt-3 text-sm sm:text-base leading-relaxed">
        Shop đã nhận được thanh toán của bạn, nhưng hệ thống{" "}
        <strong>không tạo được đơn thuê</strong> (ví dụ khung giờ vừa có người đặt trước). Vui
        lòng <strong>nhắn Fanpage / Messenger</strong> ngay để shop đối soát và hỗ trợ bạn — đừng
        thanh toán lại thêm lần nữa.
      </p>
      {orderCode != null && (
        <p className="mt-4 text-sm text-slate-600">
          Mã thanh toán (PayOS):{" "}
          <span className="font-mono font-bold text-pink-900 tabular-nums">{orderCode}</span>
        </p>
      )}
      {amount != null && (
        <p className="mt-1 text-sm text-slate-600">
          Số tiền:{" "}
          <span className="font-semibold">{Number(amount).toLocaleString("vi-VN")} đ</span>
        </p>
      )}
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={handleMessengerClick}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#0084FF] text-white font-bold text-sm sm:text-base shadow-md shadow-blue-500/25 hover:bg-[#006edc] transition-all active:scale-[0.98]"
        >
          <ChatBubbleLeftRightIcon className="w-5 h-5 shrink-0" />
          Liên hệ Fanpage hỗ trợ ngay
        </button>
        <Link
          to="/my-bookings"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-semibold border border-[#222] hover:bg-[#333] transition-all"
        >
          Đơn của tôi
        </Link>
        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200 hover:bg-slate-200 transition-all"
        >
          Về trang chủ
        </Link>
      </div>
    </motion.div>
  );
}

function LoadingState({ message }) {
  return (
    <div className="text-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full mx-auto"
      />
      <p className="text-pink-700 font-medium mt-4">{message}</p>
    </div>
  );
}

const POLL_INTERVAL_MS = 2000;
const POLL_MAX = 25;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPendingByOrderCode(orderCode) {
  const pendingRes = await api.get(`/v1/bookings/booking/${orderCode}`);
  return pendingRes.data;
}

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking");
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      const code = searchParams.get("code");
      const orderCode = searchParams.get("orderCode");
      const paymentStatus = searchParams.get("status");

      if (code === "00" && orderCode && paymentStatus === "PAID") {
        try {
          let pending = await fetchPendingByOrderCode(orderCode);

          if (pending.status === "FAILED") {
            setBookingDetails({
              orderCode: pending.orderCode,
              amount: pending.amount,
            });
            setStatus("order_creation_failed");
            return;
          }

          let polls = 0;
          while (pending.status === "CREATED" && polls < POLL_MAX) {
            await sleep(POLL_INTERVAL_MS);
            pending = await fetchPendingByOrderCode(orderCode);
            polls += 1;
            if (pending.status === "FAILED") {
              setBookingDetails({
                orderCode: pending.orderCode,
                amount: pending.amount,
              });
              setStatus("order_creation_failed");
              return;
            }
          }

          if (pending.status === "FAILED") {
            setBookingDetails({
              orderCode: pending.orderCode,
              amount: pending.amount,
            });
            setStatus("order_creation_failed");
            return;
          }

          if (pending.status === "DONE" && pending.orderIdNew) {
            const bookingsRes = await api.get(`/v1/bookings/order/${pending.orderIdNew}`);
            const bookings = bookingsRes.data || [];
            if (bookings.length > 0) {
              const first = bookings[0];
              const totalSum = bookings.reduce((s, b) => s + (b.total || 0), 0);
              const deviceDisplayById = await fetchDeviceDisplayMap();
              const devices = bookings.map((b) => {
                const info = deviceDisplayById.get(String(b.device?.id));
                return {
                  name: info?.name || b.device?.name || "Thiết bị",
                  img: info?.img || null,
                };
              });
              const branchId = inferOrderBookingBranchId(bookings);
              const savedCustomer = loadCustomerInfo();
              setBookingDetails({
                orderCode: pending.orderCode,
                orderIdNew: pending.orderIdNew,
                branchId,
                branchLabel: getBranchLabelFromId(branchId),
                customerName:
                  parseCustomerNameFromBookingNote(first.note) ||
                  savedCustomer?.fullName ||
                  null,
                bookingFrom: first.bookingFrom,
                bookingTo: first.bookingTo,
                total: totalSum,
                device: devices[0],
                devices: devices.length > 1 ? devices : null,
              });
              saveRecentOrder({
                orderCode: pending.orderCode,
                orderIdNew: pending.orderIdNew,
              });
              trackBookingOrderPaid({
                orderCode: pending.orderCode,
                orderIdNew: pending.orderIdNew,
                total: totalSum,
                branchId: inferOrderBookingBranchId(bookings),
                deviceCount: devices.length,
              });
              setStatus("success");
              return;
            }
            setBookingDetails({
              orderCode: pending.orderCode,
              amount: pending.amount,
            });
            setStatus("order_creation_failed");
            return;
          }

          if (pending.status === "DONE" && !pending.orderIdNew) {
            setBookingDetails({
              orderCode: pending.orderCode,
              amount: pending.amount,
            });
            setStatus("order_creation_failed");
            return;
          }

          if (pending.status === "CREATED") {
            setBookingDetails({
              orderCode: Number(orderCode),
              amount: pending.amount,
            });
            setStatus("order_creation_failed");
            return;
          }

          /* Không còn nhánh “parse payload = thành công” khi PayOS báo PAID: tránh báo nhầm khi tiền đã về nhưng không có booking. */
          setBookingDetails({
            orderCode: pending.orderCode ?? Number(orderCode),
            amount: pending.amount,
          });
          setStatus("order_creation_failed");
        } catch (error) {
          console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
          setStatus("failed");
        }
      } else {
        setStatus("failed");
      }
    };

    fetchBookingDetails();
  }, [searchParams]);

  return (
    <div className="min-h-dvh bg-[#f4f1f2] pb-32 md:pb-36 lg:pb-24">
      <SlideNav />
      <div className="mx-auto w-full max-w-150 px-3 py-5 sm:px-4 sm:py-8">
        {status === "checking" && (
          <LoadingState message="Đang kiểm tra trạng thái thanh toán..." />
        )}
        {status === "success" && <SuccessCard details={bookingDetails} />}
        {status === "order_creation_failed" && (
          <OrderCreationFailCard details={bookingDetails} />
        )}
        {status === "failed" && <FailureCard />}
      </div>

      <FloatingContactButton />
    </div>
  );
}
