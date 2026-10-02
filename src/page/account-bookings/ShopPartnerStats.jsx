import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import api from "../../config/axios";
import { getBranchLabelFromId } from "../../utils/orderSummary";

const PRESETS = [
  { id: "this_month", label: "Tháng này" },
  { id: "last_month", label: "Tháng trước" },
  { id: "30d", label: "30 ngày" },
  { id: "90d", label: "90 ngày" },
  { id: "year", label: "Năm nay" },
];

const COLORS = {
  paid: "#10b981",
  unpaid: "#f59e0b",
  line: "#E85C9C",
  grid: "#F0E8EC",
  axis: "#A39A9F",
};

const GRANULARITY_LABEL = { day: "theo ngày", week: "theo tuần", month: "theo tháng" };

function presetRange(id) {
  const today = dayjs().startOf("day");
  switch (id) {
    case "last_month": {
      const m = today.subtract(1, "month");
      return [m.startOf("month"), m.endOf("month").startOf("day")];
    }
    case "30d":
      return [today.subtract(29, "day"), today];
    case "90d":
      return [today.subtract(89, "day"), today];
    case "year":
      return [today.startOf("year"), today];
    case "this_month":
    default:
      return [today.startOf("month"), today.endOf("month").startOf("day")];
  }
}

function formatVnd(value = 0) {
  return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
}

function formatCompact(value = 0) {
  const n = Number(value) || 0;
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v.toLocaleString("vi-VN", { maximumFractionDigits: v >= 10 ? 0 : 1 })}tr`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
}

function formatDays(v) {
  return Number(v || 0).toLocaleString("vi-VN", { maximumFractionDigits: 1 });
}

function delta(curr, prev) {
  if (!prev) return curr ? null : 0;
  return ((curr - prev) / prev) * 100;
}

function niceMax(value) {
  if (value <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function useElementWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

export default function ShopPartnerStats() {
  const [preset, setPreset] = useState("this_month");
  const [range, setRange] = useState(() => presetRange("this_month"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metric, setMetric] = useState("revenue");

  const fromStr = range[0].format("YYYY-MM-DD");
  const toStr = range[1].format("YYYY-MM-DD");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    api
      .get("/v1/shop/stats", { params: { from: fromStr, to: toStr } })
      .then((res) => alive && setData(res?.data || null))
      .catch((err) => {
        if (!alive) return;
        const d = err?.response?.data;
        setError((typeof d === "string" && d) || d?.message || "Không tải được thống kê.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fromStr, toStr]);

  const pickPreset = (id) => {
    setPreset(id);
    setRange(presetRange(id));
  };

  const setCustom = (index, value) => {
    if (!value) return;
    const d = dayjs(value);
    if (!d.isValid()) return;
    setPreset("custom");
    setRange((prev) => {
      const next = [...prev];
      next[index] = d;
      if (next[0].isAfter(next[1])) {
        if (index === 0) next[1] = d;
        else next[0] = d;
      }
      return next;
    });
  };

  const s = data?.summary;
  const p = data?.previous;
  const series = useMemo(() => data?.series || [], [data]);
  const spanDays = range[1].diff(range[0], "day") + 1;
  const prevFrom = range[0].subtract(spanDays, "day");
  const prevTo = range[0].subtract(1, "day");
  const isEmpty = s && !s.bookingCount && !s.revenue;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-full overflow-x-auto rounded-xl border border-[#EFE4EA] bg-[#FBF8F9] p-1 lg:w-auto">
          {PRESETS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => pickPreset(o.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                preset === o.id
                  ? "bg-white text-[#1f1f1f] shadow-[0_1px_3px_rgba(20,20,20,0.1)]"
                  : "text-[#7a7075] hover:text-[#1f1f1f]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 lg:flex lg:w-auto">
          <DateInput value={fromStr} onChange={(v) => setCustom(0, v)} />
          <span className="text-[#bbb]">–</span>
          <DateInput value={toStr} onChange={(v) => setCustom(1, v)} />
        </div>
      </div>
      <p className="-mt-1 text-[12px] text-[#9a9095]">
        {range[0].format("DD/MM/YYYY")} – {range[1].format("DD/MM/YYYY")} · so sánh với{" "}
        {prevFrom.format("DD/MM")} – {prevTo.format("DD/MM/YYYY")}
      </p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">{error}</div>
      )}

      {loading && !data ? (
        <StatsSkeleton />
      ) : s ? (
        <div className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
            <Kpi label="Chi tiêu thuê máy" value={formatVnd(s.revenue)} change={delta(s.revenue, p?.revenue)} prev={formatVnd(p?.revenue)} />
            <Kpi label="Lượt máy thuê" value={s.bookingCount.toLocaleString("vi-VN")} change={delta(s.bookingCount, p?.bookingCount)} prev={p?.bookingCount ?? 0} sub={`${s.modelCount} dòng máy`} />
            <Kpi label="Ngày thuê" value={formatDays(s.rentalDays)} change={delta(s.rentalDays, p?.rentalDays)} prev={formatDays(p?.rentalDays)} />
            <Kpi label="Trung bình / đơn" value={formatVnd(s.avgOrderValue)} change={delta(s.avgOrderValue, p?.avgOrderValue)} prev={formatVnd(p?.avgOrderValue)} sub={`${s.orderCount} đơn`} />
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
            <Panel
              className="lg:col-span-2"
              title={`${metric === "revenue" ? "Chi tiêu" : "Lượt máy thuê"} ${GRANULARITY_LABEL[data.granularity] || ""}`}
              action={
                <div className="inline-flex rounded-lg border border-[#EFE4EA] bg-[#FBF8F9] p-0.5 text-[12px] font-semibold">
                  {[
                    { id: "revenue", label: "Chi tiêu" },
                    { id: "count", label: "Lượt máy" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetric(m.id)}
                      className={`rounded-md px-2.5 py-1 transition ${
                        metric === m.id ? "bg-white text-[#1f1f1f] shadow-sm" : "text-[#7a7075]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              }
            >
              {isEmpty ? (
                <EmptyState />
              ) : (
                <>
                  {metric === "revenue" && (
                    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#7a7075]">
                      <Legend color={COLORS.paid} label="Đã thanh toán" />
                      <Legend color={COLORS.unpaid} label="Chưa thanh toán" />
                    </div>
                  )}
                  <BarChart series={series} metric={metric} />
                </>
              )}
            </Panel>

            <Panel title="Tình trạng thanh toán">
              <PaymentDonut paid={s.paidAmount} unpaid={s.unpaidAmount} />
              <dl className="mt-4 space-y-2.5 text-[13px]">
                <Row dot={COLORS.paid} label="Đã thanh toán" value={formatVnd(s.paidAmount)} />
                <Row dot={COLORS.unpaid} label="Chưa thanh toán" value={formatVnd(s.unpaidAmount)} />
                <div className="border-t border-[#F3ECEF] pt-2.5">
                  <Row
                    label="Tổng công nợ hiện tại"
                    hint={`${s.outstandingCount} đơn, mọi thời điểm`}
                    value={formatVnd(s.outstandingDebt)}
                    strong
                  />
                </div>
              </dl>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
            <Panel className="lg:col-span-2" title="Dòng máy thuê nhiều">
              <ModelTable rows={data.byModel || []} total={s.revenue} />
            </Panel>
            <Panel title="Theo chi nhánh">
              <BranchList rows={data.byBranch || []} total={s.revenue} />
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full min-w-0 rounded-lg border border-[#EFE4EA] bg-white px-2.5 text-[13px] font-medium tabular-nums text-[#333] outline-none transition focus:border-[#E85C9C] focus:ring-2 focus:ring-[#E85C9C]/15"
    />
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-[#F0E6EB] bg-white p-3.5 md:p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[13.5px] font-bold text-[#1f1f1f]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ label, value, change, prev, sub }) {
  const up = change != null && change > 0.05;
  const down = change != null && change < -0.05;
  const badge =
    change == null
      ? { text: "Mới", cls: "bg-sky-50 text-sky-700" }
      : up
        ? { text: `▲ ${Math.abs(change).toFixed(0)}%`, cls: "bg-emerald-50 text-emerald-700" }
        : down
          ? { text: `▼ ${Math.abs(change).toFixed(0)}%`, cls: "bg-rose-50 text-rose-700" }
          : { text: "0%", cls: "bg-[#F5F1F3] text-[#7a7075]" };
  return (
    <div className="min-w-0 rounded-2xl border border-[#F0E6EB] bg-white px-3.5 py-3 md:px-4 md:py-3.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium text-[#7a7075]">{label}</span>
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${badge.cls}`}>
          {badge.text}
        </span>
      </div>
      <div className="mt-1.5 truncate text-[17px] font-bold tabular-nums tracking-tight text-[#1f1f1f] sm:text-[20px] md:text-[22px]">
        {value}
      </div>
      <div className="mt-0.5 truncate text-[11.5px] text-[#a39a9f]">
        Kỳ trước {prev}
        {sub ? ` · ${sub}` : ""}
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}

function Row({ dot, label, hint, value, strong }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex min-w-0 items-start gap-2 text-[#55504b]">
        {dot && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />}
        <span>
          {label}
          {hint && <span className="block text-[11.5px] text-[#a39a9f]">{hint}</span>}
        </span>
      </dt>
      <dd className={`shrink-0 tabular-nums ${strong ? "text-[15px] font-bold text-[#b45309]" : "font-semibold text-[#1f1f1f]"}`}>
        {value}
      </dd>
    </div>
  );
}

const CHART_H_DESKTOP = 240;
const CHART_H_MOBILE = 200;
const PAD = { top: 12, right: 6, bottom: 26, left: 40 };
const TOOLTIP_W = 184;

function BarChart({ series, metric }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);

  const CHART_H = width && width < 480 ? CHART_H_MOBILE : CHART_H_DESKTOP;
  const values = series.map((pt) => (metric === "revenue" ? pt.revenue || 0 : pt.bookingCount || 0));
  const max = niceMax(Math.max(0, ...values));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const slot = series.length ? innerW / series.length : 0;
  const barW = Math.max(2, Math.min(28, slot * 0.62));
  const labelEvery = Math.max(1, Math.ceil(series.length / Math.max(1, Math.floor(innerW / 44))));
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  const hovered = hover != null ? series[hover] : null;

  return (
    <div ref={ref} className="relative w-full min-w-0 overflow-hidden" onMouseLeave={() => setHover(null)}>
      {width > 0 && (
        <svg width={width} height={CHART_H} className="block select-none">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={COLORS.grid} strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize="10.5" fill={COLORS.axis}>
                {metric === "revenue" ? formatCompact(t) : Math.round(t)}
              </text>
            </g>
          ))}
          {series.map((pt, i) => {
            const cx = PAD.left + slot * i + slot / 2;
            const x = cx - barW / 2;
            const active = hover === i;
            const showLabel = i % labelEvery === 0;
            const radius = Math.min(4, barW / 2);
            let bars;
            if (metric === "revenue") {
              const paidTop = y(pt.paidAmount || 0);
              const totalTop = y((pt.paidAmount || 0) + (pt.unpaidAmount || 0));
              const base = y(0);
              bars = (
                <>
                  {pt.paidAmount > 0 && (
                    <rect x={x} y={paidTop} width={barW} height={base - paidTop} fill={COLORS.paid} rx={pt.unpaidAmount > 0 ? 0 : radius} />
                  )}
                  {pt.unpaidAmount > 0 && (
                    <rect x={x} y={totalTop} width={barW} height={paidTop - totalTop} fill={COLORS.unpaid} rx={radius} />
                  )}
                </>
              );
            } else {
              const top = y(pt.bookingCount || 0);
              bars = pt.bookingCount > 0 && (
                <rect x={x} y={top} width={barW} height={y(0) - top} fill={COLORS.line} rx={radius} />
              );
            }
            return (
              <g key={pt.key} opacity={hover == null || active ? 1 : 0.45}>
                {active && (
                  <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={innerH} fill="#F9F3F6" />
                )}
                {bars}
                {showLabel && (
                  <text x={cx} y={CHART_H - 8} textAnchor="middle" fontSize="10.5" fill={COLORS.axis}>
                    {pt.label}
                  </text>
                )}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onTouchStart={() => setHover(i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {hovered && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-xl border border-[#EFE4EA] bg-white/95 px-3 py-2.5 text-[12px] shadow-[0_8px_24px_rgba(20,20,20,0.12)] backdrop-blur"
          style={{
            width: TOOLTIP_W,
            left: Math.min(
              Math.max(0, PAD.left + slot * hover + slot / 2 - TOOLTIP_W / 2),
              Math.max(0, width - TOOLTIP_W),
            ),
          }}
        >
          <div className="mb-1.5 font-bold text-[#1f1f1f]">{hovered.label}</div>
          <TooltipRow color={COLORS.paid} label="Đã thanh toán" value={formatVnd(hovered.paidAmount)} />
          <TooltipRow color={COLORS.unpaid} label="Chưa thanh toán" value={formatVnd(hovered.unpaidAmount)} />
          <div className="mt-1.5 flex justify-between border-t border-[#F3ECEF] pt-1.5 text-[#55504b]">
            <span>Tổng · {hovered.bookingCount} lượt</span>
            <span className="font-bold tabular-nums text-[#1f1f1f]">{formatVnd(hovered.revenue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function TooltipRow({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5 text-[#55504b]">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="tabular-nums font-semibold text-[#1f1f1f]">{value}</span>
    </div>
  );
}

function PaymentDonut({ paid = 0, unpaid = 0 }) {
  const total = paid + unpaid;
  const r = 52;
  const c = 2 * Math.PI * r;
  const paidLen = total ? (paid / total) * c : 0;
  const pct = total ? Math.round((paid / total) * 100) : 0;
  return (
    <div className="flex justify-center">
      <div className="relative h-[140px] w-[140px]">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke={total ? COLORS.unpaid : "#F0E8EC"} strokeWidth="14" />
          {paidLen > 0 && (
            <circle
              cx="70"
              cy="70"
              r={r}
              fill="none"
              stroke={COLORS.paid}
              strokeWidth="14"
              strokeDasharray={`${paidLen} ${c}`}
              strokeLinecap={pct < 100 ? "butt" : "round"}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-bold tabular-nums text-[#1f1f1f]">{pct}%</span>
          <span className="text-[11px] text-[#a39a9f]">đã thanh toán</span>
        </div>
      </div>
    </div>
  );
}

function ModelTable({ rows, total }) {
  if (!rows.length) return <EmptyState compact />;
  const list = rows.slice(0, 8);
  return (
    <div className="-mx-1">
      <table className="w-full table-fixed text-[13px]">
        <thead>
          <tr className="text-left text-[11.5px] font-semibold text-[#a39a9f]">
            <th className="w-6 px-1 pb-2">#</th>
            <th className="px-1 pb-2">Dòng máy</th>
            <th className="w-12 px-1 pb-2 text-right">Lượt</th>
            <th className="hidden w-20 px-1 pb-2 text-right sm:table-cell">Ngày thuê</th>
            <th className="w-24 px-1 pb-2 text-right">Chi tiêu</th>
            <th className="hidden w-32 px-1 pb-2 pl-3 sm:table-cell">Tỷ trọng</th>
          </tr>
        </thead>
        <tbody>
          {list.map((m, i) => {
            const share = total ? (m.revenue / total) * 100 : 0;
            return (
              <tr key={m.modelKey || m.deviceName} className="border-t border-[#F5EFF2]">
                <td className="px-1 py-2.5 tabular-nums text-[#a39a9f]">{i + 1}</td>
                <td className="truncate px-1 py-2.5 font-semibold text-[#1f1f1f]">{m.deviceName}</td>
                <td className="px-1 py-2.5 text-right tabular-nums text-[#55504b]">{m.bookingCount}</td>
                <td className="hidden px-1 py-2.5 text-right tabular-nums text-[#55504b] sm:table-cell">{formatDays(m.rentalDays)}</td>
                <td className="px-1 py-2.5 text-right font-semibold tabular-nums text-[#1f1f1f]">{formatVnd(m.revenue)}</td>
                <td className="hidden px-1 py-2.5 pl-3 sm:table-cell">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F5EFF2]">
                      <div className="h-full rounded-full bg-[#E85C9C]" style={{ width: `${share}%` }} />
                    </div>
                    <span className="w-8 text-right text-[11px] tabular-nums text-[#a39a9f]">{share.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BranchList({ rows, total }) {
  if (!rows.length) return <EmptyState compact />;
  return (
    <ul className="space-y-3.5">
      {rows.map((b) => {
        const share = total ? (b.revenue / total) * 100 : 0;
        return (
          <li key={b.location || "—"}>
            <div className="flex items-baseline justify-between gap-2 text-[13px]">
              <span className="truncate font-semibold text-[#1f1f1f]">
                {getBranchLabelFromId(b.location) || b.location || "Khác"}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-[#1f1f1f]">{formatVnd(b.revenue)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F5EFF2]">
                <div className="h-full rounded-full bg-[#1f1f1f]" style={{ width: `${share}%` }} />
              </div>
              <span className="shrink-0 text-[11px] tabular-nums text-[#a39a9f]">
                {b.bookingCount} lượt · {share.toFixed(0)}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState({ compact }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-14"}`}>
      <div className="mb-2 h-9 w-9 rounded-full bg-[#F7F1F4]" />
      <p className="text-[13px] font-semibold text-[#55504b]">Chưa có dữ liệu trong khoảng này</p>
      {!compact && <p className="mt-1 text-[12px] text-[#a39a9f]">Thử chọn khoảng thời gian dài hơn.</p>}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-2.5 md:gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[98px] rounded-2xl bg-[#F7F1F4]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
        <div className="h-[300px] rounded-2xl bg-[#F7F1F4] lg:col-span-2" />
        <div className="h-[300px] rounded-2xl bg-[#F7F1F4]" />
      </div>
    </div>
  );
}
