import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/vi";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
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

const COMPLETED_STATUSES = new Set(["DONE"]);
const CANCELLED_STATUSES = new Set(["CANCEL", "REFUNDED"]);
/** Không còn ở tab Sắp nhận / Sắp trả */
const CLOSED_FOR_PICKUP_RETURN = new Set([
  "DONE",
  "CANCEL",
  "REFUNDED",
  "IN_RENT",
]);

const MAIN_TABS = [
  {
    id: "pickup",
    label: "Sắp nhận",
    hint: "Chưa nhận máy — chờ xử lý, thanh toán hoặc đến ngày nhận.",
  },
  {
    id: "return",
    label: "Sắp trả",
    hint: "Đang thuê — cần trả máy đúng hạn.",
  },
  {
    id: "completed",
    label: "Đã hoàn thành",
    hint: "Đã trả máy xong (hoàn tất thuê).",
  },
  {
    id: "cancelled",
    label: "Đã hủy",
    hint: "Đơn đã hủy hoặc đã hoàn cọc.",
  },
];

const TAB_SORT_OPTIONS = {
  pickup: [
    { id: "from_asc", label: "Gần ngày nhận máy" },
    { id: "from_desc", label: "Ngày nhận sau hơn" },
  ],
  return: [
    { id: "to_asc", label: "Gần ngày trả máy" },
    { id: "to_desc", label: "Ngày trả sau hơn" },
  ],
  completed: [
    { id: "ended_desc", label: "Kết thúc gần đây" },
    { id: "ended_asc", label: "Kết thúc lâu hơn" },
  ],
  cancelled: [
    { id: "ended_desc", label: "Mới cập nhật" },
    { id: "ended_asc", label: "Cũ hơn" },
  ],
};

function bookingMatchesMainTab(booking, tabId) {
  const s = booking?.status;
  if (tabId === "completed") return COMPLETED_STATUSES.has(s);
  if (tabId === "cancelled") return CANCELLED_STATUSES.has(s);
  if (tabId === "return") return s === "IN_RENT";
  if (tabId === "pickup") return !CLOSED_FOR_PICKUP_RETURN.has(s);
  return false;
}

function sortBookingsForTab(list, sortId) {
  const arr = [...list];
  const from = (b) => new Date(b?.bookingFrom || 0).getTime();
  const to = (b) => new Date(b?.bookingTo || 0).getTime();
  switch (sortId) {
    case "from_asc":
      return arr.sort((a, b) => from(a) - from(b));
    case "from_desc":
      return arr.sort((a, b) => from(b) - from(a));
    case "to_asc":
      return arr.sort((a, b) => to(a) - to(b));
    case "to_desc":
      return arr.sort((a, b) => to(b) - to(a));
    case "ended_desc":
      return arr.sort((a, b) => to(b) - to(a));
    case "ended_asc":
      return arr.sort((a, b) => to(a) - to(b));
    default:
      return arr;
  }
}

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [pendingOrder, setPendingOrder] = useState(() => loadRecentOrder());
  const [mainTab, setMainTab] = useState("pickup");
  const [sortBy, setSortBy] = useState("from_asc");
  const [searchQuery, setSearchQuery] = useState("");

  const hasSession = !!loadCustomerSession()?.token;

  const tabCounts = useMemo(() => {
    return {
      pickup: bookings.filter((b) => bookingMatchesMainTab(b, "pickup")).length,
      return: bookings.filter((b) => bookingMatchesMainTab(b, "return")).length,
      completed: bookings.filter((b) =>
        bookingMatchesMainTab(b, "completed"),
      ).length,
      cancelled: bookings.filter((b) =>
        bookingMatchesMainTab(b, "cancelled"),
      ).length,
    };
  }, [bookings]);

  const sortOptionsForTab = TAB_SORT_OPTIONS[mainTab] || TAB_SORT_OPTIONS.pickup;

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      if (!bookingMatchesMainTab(b, mainTab)) return false;
      if (!q) return true;
      const name = (b?.device?.name || "").toLowerCase();
      return name.includes(q);
    });
  }, [bookings, mainTab, searchQuery]);

  const bookingList = useMemo(() => {
    return sortBookingsForTab(filteredBookings, sortBy);
  }, [filteredBookings, sortBy]);

  const fetchMyBookings = async ({
    silent = false,
    fullPage = true,
  } = {}) => {
    if (!silent) {
      setError("");
      if (fullPage) setIsLoading(true);
      else setIsRefreshing(true);
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
      if (!silent) {
        if (fullPage) setIsLoading(false);
        else setIsRefreshing(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchMyBookings({ silent: false, fullPage: false });
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8fb_0%,_#fdf2f7_35%,_#f8efe8_100%)] px-3 py-5 pb-32 md:px-4 md:py-6 md:pb-36 lg:pb-28">
      <SlideNav />

      <div className="mx-auto max-w-6xl lg:max-w-7xl">
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
          <div className="mt-4 space-y-4 xl:mt-5">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight text-[#222] md:text-2xl">
                  Đơn của tôi
                </h1>
                <p className="mt-0.5 text-sm text-[#777]">
                  {bookings.length} đơn · Sắp nhận, đang thuê, hoàn tất hoặc đã hủy
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-2xl border border-[#EADCE3] bg-white px-4 py-2.5 text-sm font-bold text-[#444] shadow-sm transition hover:bg-[#FFFCFD] disabled:opacity-50 sm:self-center"
              >
                <ArrowPathIcon
                  className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Làm mới
              </button>
            </header>

            <section className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(20,20,20,0.05)] md:rounded-[28px] md:p-5 lg:p-6">
              <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-2xl border border-[#EADCE3] bg-[#FFFCFD] p-1 sm:grid-cols-4 md:gap-2 md:p-1.5">
                {MAIN_TABS.map((tab) => {
                  const active = mainTab === tab.id;
                  const count = tabCounts[tab.id] ?? 0;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setMainTab(tab.id);
                        const first =
                          TAB_SORT_OPTIONS[tab.id]?.[0]?.id ?? "from_asc";
                        setSortBy(first);
                      }}
                      title={tab.hint}
                      className={`rounded-xl px-2 py-2.5 text-center text-[11px] font-black leading-tight transition md:px-3 md:py-3 md:text-sm ${
                        active
                          ? "bg-[#222] text-white shadow-md"
                          : "text-[#444] hover:bg-white/80"
                      }`}
                    >
                      <span className="block">{tab.label}</span>
                      <span
                        className={`mt-0.5 block text-[10px] font-semibold tabular-nums md:text-xs ${
                          active ? "text-white/85" : "text-[#999]"
                        }`}
                      >
                        {count} đơn
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="mb-4 text-[13px] leading-relaxed text-[#777] md:text-sm">
                {
                  MAIN_TABS.find((t) => t.id === mainTab)?.hint
                }
              </p>

              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
                <label className="relative block min-w-0 flex-1">
                  <span className="sr-only">Tìm theo tên máy</span>
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#BD86A1]" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tên máy…"
                    className="w-full rounded-2xl border border-[#EADCE3] bg-[#FFFCFD] py-3 pl-10 pr-3 text-sm text-[#222] outline-none ring-pink-300/40 placeholder:text-[#AAA] focus:border-pink-300 focus:ring-2"
                    autoComplete="off"
                  />
                </label>
                <div className="shrink-0 lg:min-w-56">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-[#8B6A7C]">
                    Sắp xếp
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="mt-1 w-full cursor-pointer rounded-2xl border border-[#EADCE3] bg-white px-3 py-2.5 text-sm font-semibold text-[#222] outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-300/30"
                  >
                    {sortOptionsForTab.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4 text-[13px] text-[#777] md:text-sm">
                Hiển thị{" "}
                <span className="font-semibold text-[#444]">
                  {bookingList.length}
                </span>
                {searchQuery.trim()
                  ? ` / ${bookings.filter((b) => bookingMatchesMainTab(b, mainTab)).length}`
                  : ""}{" "}
                đơn trong tab này
                {searchQuery.trim() ? " (sau khi tìm)" : ""}
              </div>

              {bookingList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#EADCE3] bg-[#FFFCFD] px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-[#444]">
                    {searchQuery.trim()
                      ? "Không có đơn phù hợp"
                      : mainTab === "pickup"
                        ? "Chưa có đơn sắp nhận máy"
                        : mainTab === "return"
                          ? "Chưa có đơn cần trả máy"
                          : mainTab === "completed"
                            ? "Chưa có đơn đã hoàn thành"
                            : "Chưa có đơn đã hủy / hoàn cọc"}
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[#777]">
                    {searchQuery.trim()
                      ? "Thử đổi từ khóa hoặc chọn tab khác."
                      : mainTab === "cancelled"
                        ? "Đơn bị hủy hoặc đã hoàn cọc sẽ nằm ở tab này."
                        : "Đơn mới ở tab Sắp nhận; đang giữ máy xem Sắp trả; trả xong xem Đã hoàn thành."}
                  </p>
                  {searchQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="mt-4 inline-flex rounded-2xl bg-[#1F1F1F] px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95"
                    >
                      Xóa từ khóa
                    </button>
                  ) : null}
                </div>
              ) : (
                <ul className="space-y-3 md:space-y-4">
                  {bookingList.map((booking) => {
                  const deviceName = booking?.device?.name || "Thiết bị";
                  const status = booking?.status || "CREATED";

                  return (
                    <li
                      key={booking.id}
                      className="overflow-hidden rounded-2xl border border-[#F1E3EA] bg-white shadow-[0_4px_14px_rgba(20,20,20,0.03)]"
                    >
                      <div className="flex flex-col gap-3 px-3.5 py-3.5 md:flex-row md:items-center md:justify-between md:px-5 md:py-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-black leading-snug text-[#222] md:text-lg">
                            {deviceName}
                          </h3>
                          <p className="mt-1 text-xs text-[#8A6A7A] md:text-sm">
                            Nhận{" "}
                            <span className="font-semibold text-[#333]">
                              {formatDateTime(booking.bookingFrom)}
                            </span>
                            {" · "}
                            Trả{" "}
                            <span className="font-semibold text-[#333]">
                              {formatDateTime(booking.bookingTo)}
                            </span>
                          </p>
                        </div>
                        <span
                          className={`inline-flex w-fit shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold md:px-3 md:py-1.5 md:text-xs ${getStatusClasses(
                            status,
                          )}`}
                        >
                          {STATUS_LABEL[status] || status}
                        </span>
                      </div>

                      <div className="grid gap-2 border-t border-[#F5E9EF] px-3.5 py-3 text-sm sm:grid-cols-2 md:gap-3 md:px-5 md:py-3.5">
                        <div className="rounded-xl bg-[#FCF7FA] px-3 py-2.5 text-xs text-[#8A6A7A] md:text-sm">
                          <span className="font-medium">Thời lượng:</span>{" "}
                          <span className="font-semibold text-[#232323]">
                            {getDurationText(
                              booking.bookingFrom,
                              booking.bookingTo,
                            )}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#FCF7FA] px-3 py-2.5 text-xs text-[#8A6A7A] md:text-sm">
                          <span className="font-medium">Tổng thanh toán:</span>{" "}
                          <span className="font-semibold text-[#232323]">
                            {formatPrice(booking.total)}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-[#F5E9EF] px-3.5 py-3 md:px-5 md:py-3.5">
                        <Link
                          to={
                            booking.orderIdNew
                              ? `/order/${booking.orderIdNew}`
                              : `/order/booking/${booking.id}`
                          }
                          className="inline-flex w-full min-h-[44px] items-center justify-center rounded-2xl bg-[#1F1F1F] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-95 sm:w-auto sm:px-6 sm:py-3"
                        >
                          Xem chi tiết đơn
                        </Link>
                      </div>
                    </li>
                  );
                })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
