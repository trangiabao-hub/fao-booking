import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/vi";
import { ArrowPathIcon, CheckIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import api from "../../config/axios";
import { getBranchLabelFromId } from "../../utils/orderSummary";
import { inferBookingBranchId } from "../../utils/deviceBranch";
import ShopPartnerStats from "./ShopPartnerStats";

dayjs.extend(utc);
dayjs.extend(timezone);

const TABS = [
  { id: "stats", label: "Tổng quan" },
  { id: "unpaid", label: "Chưa thanh toán" },
  { id: "paid", label: "Đã thanh toán" },
  { id: "cancelled", label: "Đã hủy" },
];

const PAY_ORDER_KEY = "fao_shop_pay_order";

function formatVnd(value = 0) {
  return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
}

function apiErrorMessage(err, fallback) {
  const data = err?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  return data?.message || data?.reason || err?.message || fallback;
}

function isCancelled(b) {
  return b.status === "CANCEL" || b.status === "TEST";
}

export default function ShopPartnerOrders({ shop }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState(() => (searchParams.get("shopBooked") ? "unpaid" : "stats"));
  const [selected, setSelected] = useState(() => new Set());
  const [isPaying, setIsPaying] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await api.get("/v1/shop/bookings");
      setBookings(Array.isArray(res?.data) ? res.data : []);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Không tải được đơn của shop."));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load({ silent: true });
  }, [load]);

  useEffect(() => {
    if (searchParams.get("shopBooked")) {
      setNotice({
        tone: "success",
        text: "Đã giữ lịch thành công. Đơn nằm ở mục “Chưa thanh toán” — thanh toán gộp khi tiện.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("shopBooked");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Quay lại từ PayOS: PayOS gắn orderCode/status/cancel vào returnUrl.
  useEffect(() => {
    if (!searchParams.get("shopPay")) return undefined;
    const orderCode =
      searchParams.get("orderCode") || sessionStorage.getItem(PAY_ORDER_KEY);
    const cancelled =
      searchParams.get("cancel") === "true" ||
      searchParams.get("status") === "CANCELLED";
    const next = new URLSearchParams();
    setSearchParams(next, { replace: true });
    if (!orderCode) return undefined;
    if (cancelled) {
      sessionStorage.removeItem(PAY_ORDER_KEY);
      setNotice({ tone: "warn", text: "Bạn đã hủy thanh toán. Các đơn vẫn được giữ ở mục chưa thanh toán." });
      return undefined;
    }

    let alive = true;
    let attempt = 0;
    setNotice({ tone: "info", text: `Đang xác nhận thanh toán #${orderCode}…` });
    const tick = async () => {
      attempt += 1;
      try {
        const res = await api.post(`/v1/shop/payments/${orderCode}/sync`);
        const status = res?.data?.status;
        if (!alive) return;
        if (status === "PAID") {
          sessionStorage.removeItem(PAY_ORDER_KEY);
          setNotice({ tone: "success", text: `Đã thanh toán thành công (PayOS #${orderCode}).` });
          setTab("paid");
          load({ silent: true });
          return;
        }
        if (status === "FAILED") {
          setNotice({ tone: "error", text: `Giao dịch #${orderCode} lỗi khi ghi nhận. Vui lòng liên hệ FAO để đối soát.` });
          return;
        }
      } catch {
        // thử lại ở vòng sau
      }
      if (alive && attempt < 6) {
        setTimeout(tick, 3000);
      } else if (alive) {
        setNotice({ tone: "warn", text: `Chưa nhận được xác nhận cho giao dịch #${orderCode}. Bấm “Làm mới” sau ít phút.` });
      }
    };
    tick();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    const unpaid = [];
    const paid = [];
    const cancelled = [];
    for (const b of bookings) {
      if (isCancelled(b)) cancelled.push(b);
      else if (b.paid) paid.push(b);
      else unpaid.push(b);
    }
    unpaid.sort((a, b) => new Date(a.bookingFrom) - new Date(b.bookingFrom));
    paid.sort((a, b) => new Date(b.paidAt || b.bookingFrom) - new Date(a.paidAt || a.bookingFrom));
    return { unpaid, paid, cancelled };
  }, [bookings]);

  const unpaidTotal = useMemo(
    () => groups.unpaid.reduce((s, b) => s + (b.total || 0), 0),
    [groups.unpaid],
  );
  const payableIds = useMemo(
    () => groups.unpaid.filter((b) => b.payable).map((b) => b.bookingId),
    [groups.unpaid],
  );

  useEffect(() => {
    setSelected((prev) => {
      const allowed = new Set(payableIds);
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [payableIds]);

  const selectedTotal = useMemo(
    () =>
      groups.unpaid
        .filter((b) => selected.has(b.bookingId))
        .reduce((s, b) => s + (b.total || 0), 0),
    [groups.unpaid, selected],
  );

  const allSelected = payableIds.length > 0 && selected.size === payableIds.length;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(payableIds));
  };

  const handlePay = async () => {
    if (selected.size === 0 || isPaying) return;
    setIsPaying(true);
    setError("");
    try {
      const returnUrl = `${window.location.origin}/my-bookings?shopPay=1`;
      const res = await api.post("/v1/shop/payments", {
        bookingIds: [...selected],
        returnUrl,
        cancelUrl: returnUrl,
      });
      const { checkoutUrl, orderCode } = res?.data || {};
      if (!checkoutUrl) throw new Error("Không nhận được link thanh toán");
      if (orderCode) sessionStorage.setItem(PAY_ORDER_KEY, String(orderCode));
      window.location.href = checkoutUrl;
    } catch (err) {
      setError(apiErrorMessage(err, "Không tạo được link thanh toán."));
      setIsPaying(false);
    }
  };

  const handleCancel = async (booking) => {
    if (!window.confirm(`Hủy giữ lịch ${booking.deviceName}?`)) return;
    setCancellingId(booking.bookingId);
    setError("");
    try {
      await api.put(`/v1/shop/bookings/${booking.bookingId}/cancel`);
      await load({ silent: true });
      setNotice({ tone: "success", text: `Đã hủy lịch ${booking.deviceName}.` });
    } catch (err) {
      setError(apiErrorMessage(err, "Không hủy được đơn."));
    } finally {
      setCancellingId(null);
    }
  };

  const counts = {
    unpaid: groups.unpaid.length,
    paid: groups.paid.length,
    cancelled: groups.cancelled.length,
  };
  const list = tab === "stats" ? [] : groups[tab] || [];
  const orderGroups = groupByOrder(list);

  const toggleGroup = (group) => {
    const ids = group.items.filter((b) => b.payable).map((b) => b.bookingId);
    setSelected((prev) => {
      const next = new Set(prev);
      const all = ids.every((id) => next.has(id));
      ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  return (
    <div className="mt-4 space-y-4 xl:mt-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1f1f1f] text-lg font-black text-white">
            {(shop.shopName || "S").trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-black tracking-tight text-[#1f1f1f] md:text-2xl">
                {shop.shopName}
              </h1>
              <span className="rounded-md bg-[#FCE7F3] px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[#B0286A]">
                Đối tác
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-[#7a7075]">
              {shop.email} · T2–T6 −25%, T7/CN −5% · Đặt trước, trả sau
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => load()}
            disabled={isRefreshing}
            title="Làm mới"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#EFE4EA] bg-white text-[#55504b] transition hover:bg-[#FBF8F9] disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-[18px] w-[18px] ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
          <Link
            to="/catalog"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#1F1F1F] px-4 text-[13.5px] font-bold text-white transition hover:opacity-90"
          >
            Đặt thêm máy
          </Link>
        </div>
      </header>

      {groups.unpaid.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-500/15" />
            <div>
              <div className="text-[12px] font-medium text-amber-800/80">Công nợ hiện tại</div>
              <div className="text-[17px] font-bold tabular-nums text-[#1f1f1f]">
                {formatVnd(unpaidTotal)}
                <span className="ml-2 text-[12.5px] font-medium text-[#7a7075]">
                  {groupByOrder(groups.unpaid).length} đơn · {groups.unpaid.length} máy chưa thanh toán
                </span>
              </div>
            </div>
          </div>
          {payableIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setTab("unpaid");
                setSelected(new Set(payableIds));
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[#E85C9C] px-4 text-[13.5px] font-bold text-white shadow-[0_6px_16px_rgba(232,92,156,0.25)] transition hover:bg-[#d94d8a]"
            >
              Xem & thanh toán
            </button>
          )}
        </div>
      )}

      {notice && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
            {
              success: "border-emerald-200 bg-emerald-50 text-emerald-900",
              info: "border-sky-200 bg-sky-50 text-sky-900",
              warn: "border-amber-200 bg-amber-50 text-amber-900",
              error: "border-rose-200 bg-rose-50 text-rose-900",
            }[notice.tone]
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="shrink-0 text-xs font-bold opacity-60 hover:opacity-100">
            Đóng
          </button>
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
          {error}
        </div>
      )}

      <section className="rounded-[24px] border border-white/70 bg-white/90 p-4 shadow-[0_10px_30px_rgba(20,20,20,0.05)] md:rounded-[28px] md:p-5 lg:p-6">
        <nav className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-[#F0E6EB] px-1">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`relative -mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-[13.5px] font-semibold transition ${
                  active
                    ? "border-[#1f1f1f] text-[#1f1f1f]"
                    : "border-transparent text-[#8a8085] hover:text-[#1f1f1f]"
                }`}
              >
                {t.label}
                {t.id !== "stats" && (
                  <span
                    className={`rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums ${
                      active
                        ? t.id === "unpaid" && counts.unpaid
                          ? "bg-amber-500 text-white"
                          : "bg-[#1f1f1f] text-white"
                        : "bg-[#F5EFF2] text-[#8a8085]"
                    }`}
                  >
                    {counts[t.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {tab === "stats" ? (
          <ShopPartnerStats />
        ) : isLoading ? (
          <p className="py-8 text-center text-sm text-[#777]">Đang tải đơn…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#EADCE3] bg-[#FFFCFD] px-4 py-10 text-center">
            <p className="text-sm font-semibold text-[#444]">
              {tab === "unpaid"
                ? "Không còn đơn nào chưa thanh toán"
                : tab === "paid"
                  ? "Chưa có đơn đã thanh toán"
                  : "Chưa có đơn bị hủy"}
            </p>
          </div>
        ) : (
          <>
            {tab === "unpaid" && payableIds.length > 1 && (
              <div className="mb-2.5 flex items-center justify-between px-1">
                <label className="flex cursor-pointer select-none items-center gap-2.5 text-[13px] font-medium text-[#55504b]">
                  <Checkbox
                    checked={allSelected}
                    indeterminate={!allSelected && selected.size > 0}
                    onChange={toggleAll}
                  />
                  Chọn tất cả
                </label>
                {selected.size > 0 && (
                  <span className="text-[12.5px] tabular-nums text-[#8a8085]">
                    Đã chọn {formatVnd(selectedTotal)}
                  </span>
                )}
              </div>
            )}
            <ul className="space-y-2.5">
              {orderGroups.map((g) => (
                <OrderGroup
                  key={g.key}
                  group={g}
                  mode={tab}
                  selected={selected}
                  onToggleGroup={toggleGroup}
                  onCancel={handleCancel}
                  cancellingId={cancellingId}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      {tab === "unpaid" && selected.size > 0 && (
        <>
          <div aria-hidden className="h-20" />
          <div className="fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-[65] px-3">
            <div className="mx-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-[#F5D0E2] bg-white/95 py-2.5 pl-4 pr-2.5 shadow-[0_10px_30px_rgba(232,92,156,0.18)] backdrop-blur-md">
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-medium text-[#8a8580]">
                  Đã chọn{" "}
                  {groupByOrder(groups.unpaid).filter((g) => g.items.some((b) => selected.has(b.bookingId))).length}{" "}
                  đơn · {selected.size} máy
                </div>
                <div className="text-[18px] font-black tabular-nums leading-tight text-[#1f1f1f]">
                  {formatVnd(selectedTotal)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="shrink-0 rounded-xl px-2.5 py-2 text-[12.5px] font-semibold text-[#8a8580] transition hover:bg-[#FFF5FA] hover:text-[#444]"
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying}
                className="flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-[#E85C9C] px-4 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(232,92,156,0.28)] transition-all hover:bg-[#d94d8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#e2dfdc] disabled:text-[#a3a09d] disabled:shadow-none"
              >
                {isPaying ? "Đang tạo link…" : "Thanh toán"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function groupByOrder(list) {
  const map = new Map();
  for (const b of list) {
    const key = b.orderIdNew || `b-${b.bookingId}`;
    if (!map.has(key)) map.set(key, { key, orderIdNew: b.orderIdNew, items: [] });
    map.get(key).items.push(b);
  }
  return [...map.values()].map((g) => {
    const first = g.items[0];
    const sameWindow = g.items.every(
      (b) => b.bookingFrom === first.bookingFrom && b.bookingTo === first.bookingTo,
    );
    return {
      ...g,
      first,
      sameWindow,
      total: g.items.reduce((s, b) => s + (b.total || 0), 0),
    };
  });
}

function toVn(value) {
  return dayjs(value).tz("Asia/Ho_Chi_Minh");
}

function formatSlot(value) {
  if (!value) return { day: "—", time: "" };
  const d = toVn(value);
  return { day: `${d.locale("vi").format("dd")}, ${d.format("DD/MM")}`, time: d.format("HH:mm") };
}

function pickupHint(b) {
  if (b.status === "IN_RENT") return { text: "Đang thuê", tone: "text-sky-700" };
  if (b.status === "DONE") return { text: "Đã trả máy", tone: "text-[#8a8085]" };
  if (b.status === "CANCEL" || b.status === "TEST") return { text: "Đã hủy", tone: "text-[#8a8085]" };
  const today = dayjs().tz("Asia/Ho_Chi_Minh").startOf("day");
  const diff = toVn(b.bookingFrom).startOf("day").diff(today, "day");
  if (diff < 0) return { text: "Quá giờ nhận", tone: "font-semibold text-rose-600" };
  if (diff === 0) return { text: "Nhận hôm nay", tone: "font-semibold text-[#D6337F]" };
  if (diff === 1) return { text: "Nhận ngày mai", tone: "font-semibold text-[#D6337F]" };
  return { text: `Còn ${diff} ngày`, tone: "text-[#8a8085]" };
}

function Checkbox({ checked, indeterminate = false, onChange, label }) {
  const on = checked || indeterminate;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85C9C]/40 ${
        on ? "border-[#E85C9C] bg-[#E85C9C] text-white" : "border-[#D4C4CC] bg-white hover:border-[#B9A6AF]"
      }`}
    >
      {checked ? (
        <CheckIcon className="h-3 w-3" strokeWidth={3.5} />
      ) : indeterminate ? (
        <span className="h-[2px] w-2 rounded bg-white" />
      ) : null}
    </button>
  );
}

function summarizeDevices(items) {
  const counts = new Map();
  for (const b of items) {
    const name = String(b.deviceName || "Thiết bị").replace(/\s*\(\d+\)\s*$/, "").trim();
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].map(([name, n]) => (n > 1 ? `${name} × ${n}` : name)).join(", ");
}

function formatWindow(from, to) {
  const a = formatSlot(from);
  const b = formatSlot(to);
  return `${a.day}, ${a.time} → ${b.day}, ${b.time}`;
}

function OrderGroup({ group, mode, selected, onToggleGroup, onCancel, cancellingId }) {
  const [open, setOpen] = useState(false);
  const { first, items, sameWindow } = group;
  const payable = items.filter((b) => b.payable);
  const selectable = mode === "unpaid" && payable.length > 0;
  const selCount = payable.filter((b) => selected.has(b.bookingId)).length;
  const allSel = selectable && selCount === payable.length;
  const hint = pickupHint(first);
  const branchLabel = getBranchLabelFromId(inferBookingBranchId(first));

  return (
    <li
      className={`rounded-2xl border bg-white transition ${
        selCount > 0 ? "border-[#E85C9C]/50 bg-[#FFFAFC]" : "border-[#EFE6EA]"
      } ${mode === "cancelled" ? "opacity-70" : ""}`}
    >
      <div
        className={`flex items-center gap-3.5 px-4 py-3.5 md:px-5 ${selectable ? "cursor-pointer" : ""}`}
        onClick={selectable ? () => onToggleGroup(group) : undefined}
      >
        {selectable && (
          <Checkbox
            checked={allSel}
            indeterminate={selCount > 0 && !allSel}
            onChange={() => onToggleGroup(group)}
            label="Chọn đơn"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold tabular-nums text-[#1f1f1f]">
            {sameWindow ? formatWindow(first.bookingFrom, first.bookingTo) : "Nhiều khung giờ"}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-[#8a8085]">
            <span className="truncate">{summarizeDevices(items)}</span>
            <span className="shrink-0 text-[#d6cbd0]">·</span>
            <span className={`shrink-0 ${hint.tone}`}>{hint.text}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15.5px] font-bold tabular-nums text-[#1f1f1f]">{formatVnd(group.total)}</div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="mt-0.5 inline-flex items-center gap-0.5 text-[12px] font-medium text-[#8a8085] transition hover:text-[#1f1f1f]"
          >
            Chi tiết
            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#F3ECEF] px-4 pb-3 pt-2 md:px-5">
          <ul>
            {items.map((b) => (
              <li key={b.bookingId} className="flex items-center gap-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-[#3a3438]">
                  {b.deviceName}
                  {!sameWindow && (
                    <span className="ml-2 text-[12px] text-[#a39a9f]">{formatWindow(b.bookingFrom, b.bookingTo)}</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-[#55504b]">{formatVnd(b.total)}</span>
                {b.cancellable && (
                  <button
                    type="button"
                    disabled={cancellingId === b.bookingId}
                    onClick={() => onCancel(b)}
                    className="shrink-0 text-[12px] font-semibold text-rose-600 transition hover:text-rose-700 disabled:opacity-40"
                  >
                    {cancellingId === b.bookingId ? "Đang hủy…" : "Hủy"}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[#EFE6EA] pt-2.5 text-[12px] text-[#a39a9f]">
            <span>
              {branchLabel ? `${branchLabel} · ` : ""}Đặt bởi {first.bookedByEmail || "—"}
              {mode === "paid" && first.paidAt ? ` · Thanh toán ${toVn(first.paidAt).format("HH:mm DD/MM")}` : ""}
            </span>
            {group.orderIdNew && (
              <Link to={`/order/${group.orderIdNew}`} className="font-semibold text-[#1f1f1f] hover:underline">
                Xem đơn #{group.orderIdNew.slice(0, 8).toUpperCase()}
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
