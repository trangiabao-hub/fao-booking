import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/vi";
import api from "../../config/axios";
import SlideNav from "../../components/SlideNav";
import {
  loadRecentOrder,
  loadCustomerSession,
  saveRecentOrder,
} from "../../utils/storage";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("vi");

const STATUS_LABEL = {
  PAYMENT: "Đã thanh toán",
  IN_RENT: "Đang thuê",
  DONE: "Hoàn tất",
  CREATED: "Chờ xử lý",
  CANCEL: "Đã hủy",
  REFUNDED: "Đã hoàn cọc",
  NOT_PAYMENT_YET: "Chưa thanh toán",
  TEST: "Đang kiểm tra",
};

const STATUS_STYLES = {
  PAYMENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
  IN_RENT: "border-sky-200 bg-sky-50 text-sky-700",
  DONE: "border-violet-200 bg-violet-50 text-violet-700",
  CREATED: "border-amber-200 bg-amber-50 text-amber-700",
  CANCEL: "border-rose-200 bg-rose-50 text-rose-700",
  REFUNDED: "border-cyan-200 bg-cyan-50 text-cyan-700",
  NOT_PAYMENT_YET: "border-orange-200 bg-orange-50 text-orange-700",
  TEST: "border-slate-200 bg-slate-50 text-slate-700",
};

const CANCELABLE_STATUSES = new Set(["PAYMENT", "CREATED"]);
const ACTIVE_SCHEDULE_STATUSES = new Set(["PAYMENT", "IN_RENT", "CREATED"]);

function formatDateTime(value) {
  if (!value) return "—";
  return dayjs(value).tz("Asia/Ho_Chi_Minh").format("HH:mm • DD/MM/YYYY");
}

function formatPrice(value = 0) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function getDurationText(from, to) {
  if (!from || !to) return "—";
  const start = dayjs(from);
  const end = dayjs(to);
  const hours = end.diff(start, "hour");
  const days = end.diff(start, "day");

  if (days >= 1) return `${days} ngày`;
  if (hours >= 1) return `${hours} giờ`;
  return "Trong ngày";
}

function getStatusClasses(status) {
  return (
    STATUS_STYLES[status] || "border-[#E7D8E4] bg-[#FAF6F8] text-[#8A5871]"
  );
}

export default function AccountBookingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [pendingOrder, setPendingOrder] = useState(() => loadRecentOrder());

  const hasSession = !!loadCustomerSession()?.token;

  const scheduleBookings = useMemo(() => {
    return [...bookings]
      .filter((b) => ACTIVE_SCHEDULE_STATUSES.has(b?.status))
      .sort(
        (a, b) =>
          new Date(a?.bookingFrom || 0).getTime() -
          new Date(b?.bookingFrom || 0).getTime(),
      );
  }, [bookings]);

  const bookingList = useMemo(() => {
    return [...bookings].sort(
      (a, b) =>
        new Date(b?.bookingFrom || 0).getTime() -
        new Date(a?.bookingFrom || 0).getTime(),
    );
  }, [bookings]);

  const fetchMyBookings = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
      setError("");
    }

    try {
      const bookingsRes = await api.get("/v1/bookings/me");
      const incomingBookings = Array.isArray(bookingsRes?.data)
        ? bookingsRes.data
        : [];
      setBookings(incomingBookings);

      const recentOrder = loadRecentOrder();
      if (recentOrder?.orderCode) {
        const pendingRes = await api.get(
          `/v1/bookings/booking/${recentOrder.orderCode}`,
        );
        const pending = pendingRes?.data;

        if (pending?.status === "DONE" && pending?.orderIdNew) {
          const nextRecent = {
            orderCode: pending.orderCode,
            orderIdNew: pending.orderIdNew,
          };
          saveRecentOrder(nextRecent);
          setPendingOrder(nextRecent);

          if (
            !incomingBookings.some((b) => b.orderIdNew === pending.orderIdNew)
          ) {
            const refreshedBookingsRes = await api.get("/v1/bookings/me");
            const refreshed = Array.isArray(refreshedBookingsRes?.data)
              ? refreshedBookingsRes.data
              : [];
            setBookings(refreshed);
          }
        } else {
          setPendingOrder(recentOrder);
        }
      } else {
        setPendingOrder(null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được danh sách đơn.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasSession) return;
    fetchMyBookings();
  }, [hasSession]);

  useEffect(() => {
    if (!hasSession) return undefined;
    const recentOrder = loadRecentOrder();
    if (!recentOrder?.orderCode || recentOrder?.orderIdNew) return undefined;

    const timer = setInterval(() => {
      fetchMyBookings({ silent: true });
    }, 5000);

    return () => clearInterval(timer);
  }, [hasSession, pendingOrder?.orderCode, pendingOrder?.orderIdNew]);

  const handleCancelBooking = async (bookingId) => {
    const shouldCancel = window.confirm("Bạn chắc chắn muốn hủy đơn này?");
    if (!shouldCancel) return;

    setCancellingId(bookingId);
    setError("");

    try {
      await api.put(`/v1/bookings/me/${bookingId}/cancel`);
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCEL" } : b)),
      );
    } catch (err) {
      setError(err?.response?.data?.message || "Không thể hủy đơn này.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8fb_0%,_#fdf2f7_35%,_#f8efe8_100%)] px-3 py-5 pb-32 md:px-4 md:py-6 md:pb-36">
      <SlideNav />

      <div className="mx-auto max-w-6xl">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {hasSession && pendingOrder?.orderCode && !pendingOrder?.orderIdNew && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-sm">
            Đơn mới của bạn đang được xác nhận thanh toán với mã{" "}
            <span className="font-bold">#{pendingOrder.orderCode}</span>. Danh
            sách sẽ tự cập nhật sau vài giây.
          </div>
        )}

        {!hasSession && (
          <div className="mt-5 rounded-[24px] border border-white/70 bg-white/90 p-6 text-center shadow-[0_10px_30px_rgba(20,20,20,0.05)] md:rounded-[28px] md:p-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF2F8] text-2xl">
              🔐
            </div>
            <h2 className="mt-4 text-lg font-black text-[#222]">
              Đăng nhập để xem đơn hàng
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777]">
              Bạn cần đăng nhập để xem lịch hẹn, trạng thái xử lý và chi tiết
              các đơn đã đặt.
            </p>
            <Link
              to="/account"
              className="mt-5 inline-flex rounded-2xl bg-[#1F1F1F] px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
            >
              Đăng nhập ngay
            </Link>
          </div>
        )}

        {hasSession && isLoading && (
          <div className="mt-5 rounded-[28px] border border-white/70 bg-white/85 p-5 text-sm text-[#666] shadow-[0_10px_30px_rgba(20,20,20,0.05)]">
            Đang tải đơn hàng...
          </div>
        )}

        {hasSession && !isLoading && bookings.length === 0 && (
          <div className="mt-5 rounded-[28px] border border-white/70 bg-white/90 p-8 text-center shadow-[0_10px_30px_rgba(20,20,20,0.05)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF2F8] text-2xl">
              📷
            </div>
            <h2 className="mt-4 text-lg font-black text-[#222]">
              Chưa có đơn thuê nào
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#777]">
              Khi bạn đặt thuê thiết bị, các đơn sẽ xuất hiện tại đây để tiện
              theo dõi lịch nhận, lịch trả và trạng thái xử lý.
            </p>
            <Link
              to="/catalog"
              className="mt-5 inline-flex rounded-2xl bg-[#1F1F1F] px-5 py-3 text-sm font-bold text-white transition hover:opacity-95"
            >
              Khám phá thiết bị
            </Link>
          </div>
        )}

        {hasSession && !isLoading && bookings.length > 0 && (
          <div className="mt-4 grid gap-3.5 xl:mt-5 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(20,20,20,0.05)] md:rounded-[28px] md:p-5">
              <div className="mb-3.5 flex items-start justify-between gap-2.5 md:mb-4 md:gap-3">
                <div>
                  <h2 className="text-[15px] font-black uppercase tracking-wide text-[#222] md:text-base">
                    Lịch hẹn sắp tới
                  </h2>
                  <p className="mt-1 text-[13px] leading-5 text-[#777] md:text-sm">
                    Các đơn đang hoạt động theo thời gian gần nhất.
                  </p>
                </div>
                <span className="rounded-full bg-[#F7F1F5] px-2.5 py-1 text-[11px] font-semibold text-[#8B6A7C] md:px-3 md:text-xs">
                  {scheduleBookings.length} lịch
                </span>
              </div>

              {scheduleBookings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#EADCE3] bg-[#FFFCFD] p-4 text-sm text-[#777]">
                  Hiện chưa có lịch hẹn đang hoạt động.
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduleBookings.map((booking, index) => (
                    <div
                      key={`schedule-${booking.id}`}
                      className="relative overflow-hidden rounded-2xl border border-[#F2E2EA] bg-[#FFFDFE] p-3"
                    >
                      <div className="absolute left-0 top-0 h-full w-1.5 bg-[#FF9FCA]" />

                      <div className="pl-2.5">
                        <div className="flex items-start justify-between gap-2.5">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C187A4] md:text-[11px] md:tracking-[0.16em]">
                              Lịch {index + 1}
                            </div>
                            <h3 className="mt-1 text-[15px] font-bold text-[#222] md:text-base">
                              {booking?.device?.name || "Thiết bị"}
                            </h3>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold md:px-2.5 md:text-[11px] ${getStatusClasses(
                              booking?.status,
                            )}`}
                          >
                            {STATUS_LABEL[booking?.status] ||
                              booking?.status ||
                              "Đang xử lý"}
                          </span>
                        </div>

                        <div className="mt-2 grid gap-2 text-[#5B5B61]">
                          <div className="rounded-xl bg-[#FFF7FB] px-3 py-2">
                            <span className="text-xs font-medium text-[#8A6A7A]">
                              Nhận máy
                            </span>
                            <span className="mt-0.5 block text-sm font-semibold text-[#242424]">
                              {formatDateTime(booking.bookingFrom)}
                            </span>
                          </div>
                          <div className="rounded-xl bg-[#FFF7FB] px-3 py-2">
                            <span className="text-xs font-medium text-[#8A6A7A]">
                              Trả máy
                            </span>
                            <span className="mt-0.5 block text-sm font-semibold text-[#242424]">
                              {formatDateTime(booking.bookingTo)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(20,20,20,0.05)] md:rounded-[28px] md:p-5">
              <div className="mb-3.5 md:mb-4">
                <h2 className="text-[15px] font-black uppercase tracking-wide text-[#222] md:text-base">
                  Danh sách đơn hàng
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-[#777] md:text-sm">
                  Toàn bộ đơn theo tài khoản của bạn, sắp xếp từ mới đến cũ.
                </p>
              </div>

              <div className="space-y-3 md:space-y-4">
                {bookingList.map((booking) => {
                  const deviceName = booking?.device?.name || "Thiết bị";
                  const status = booking?.status || "CREATED";
                  const canCancel = CANCELABLE_STATUSES.has(status);

                  return (
                    <div
                      key={booking.id}
                      className="overflow-hidden rounded-2xl border border-[#F1E3EA] bg-white shadow-[0_4px_14px_rgba(20,20,20,0.03)]"
                    >
                      <div className="border-b border-[#F5E9EF] px-3.5 py-3 md:px-5 md:py-3.5">
                        <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BD86A1] md:text-[11px] md:tracking-[0.16em]">
                              Đơn thuê thiết bị
                            </div>
                            <div className="mt-1 text-base font-black leading-tight text-[#222] md:text-lg">
                              {deviceName}
                            </div>
                            <div className="mt-1 break-all text-xs text-[#7D7D84]">
                              Mã nhóm đơn:{" "}
                              <span className="font-semibold text-[#4A4A4F]">
                                {booking.orderIdNew || "—"}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold md:px-3 md:py-1.5 md:text-xs ${getStatusClasses(
                              status,
                            )}`}
                          >
                            {STATUS_LABEL[status] || status}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-2 px-3.5 py-3 text-sm md:grid-cols-2 md:gap-2.5 md:px-5 md:py-3.5">
                        <div className="rounded-xl bg-[#FCF7FA] px-3 py-2.5">
                          <div className="text-xs text-[#8A6A7A]">
                            Nhận máy:{" "}
                            <span className="font-semibold text-[#232323]">
                              {formatDateTime(booking.bookingFrom)}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[#8A6A7A]">
                            Trả máy:{" "}
                            <span className="font-semibold text-[#232323]">
                              {formatDateTime(booking.bookingTo)}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl bg-[#FCF7FA] px-3 py-2.5">
                          <div className="text-xs text-[#8A6A7A]">
                            Thời lượng:{" "}
                            <span className="font-semibold text-[#232323]">
                              {getDurationText(
                                booking.bookingFrom,
                                booking.bookingTo,
                              )}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-[#8A6A7A]">
                            Tổng thanh toán:{" "}
                            <span className="font-semibold text-[#232323]">
                              {formatPrice(booking.total)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 border-t border-[#F5E9EF] px-3.5 py-3 sm:flex-row sm:flex-wrap md:px-5 md:py-3.5">
                        {booking.orderIdNew && (
                          <Link
                            to={`/order/${booking.orderIdNew}`}
                            className="inline-flex w-full items-center justify-center rounded-2xl bg-[#1F1F1F] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95 sm:w-auto sm:py-3"
                          >
                            Xem chi tiết
                          </Link>
                        )}

                        {canCancel && (
                          <button
                            type="button"
                            disabled={cancellingId === booking.id}
                            onClick={() => handleCancelBooking(booking.id)}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 sm:w-auto sm:py-3"
                          >
                            {cancellingId === booking.id
                              ? "Đang hủy..."
                              : "Hủy đơn"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
