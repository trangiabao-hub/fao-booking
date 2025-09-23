import React, { useMemo, useState, useEffect, useCallback } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import vi from "date-fns/locale/vi";
import { format, isWeekend, addDays, parseISO } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import api from "./config/axios"; // axios instance đã cấu hình

registerLocale("vi", vi);

/* ========= Dữ liệu và hằng số ===== */

const CATEGORIES = [
  { id: "fuji", label: "Fujifilm" },
  { id: "canon", label: "Canon" },
  { id: "sony", label: "Sony" },
  { id: "pocket", label: "Pocket" },
  { id: "phone", label: "Phone" },
];

const SLOTS = [
  { id: "MORNING", label: "09:00", h: 9, m: 0 },
  { id: "EVENING", label: "20:30", h: 20, m: 30 },
];

const VOUCHERS = [
  { id: "NONE", label: "Không áp dụng", rate: 0 },
  { id: "WEEKDAY20", label: "Weekday -20%", rate: 0.2 },
];

// NEW: Thêm bước "Thông tin"
const STEPS = ["Loại", "Máy", "Ngày & mã", "Thông tin", "Tổng kết"];

const FALLBACK_IMG = "https://placehold.co/640x360/png?text=No+Image";

/* ===== Helpers ===== */
function inferBrand(name = "") {
  const n = name.toUpperCase();
  if (n.includes("FUJIFILM")) return "fuji";
  if (n.includes("CANON")) return "canon";
  if (n.includes("SONY")) return "sony";
  if (n.includes("POCKET") || n.includes("GOPRO") || n.includes("DJI"))
    return "pocket";
  if (n.includes("IPHONE") || n.includes("SAMSUNG")) return "phone";
  return null;
}
function parseDeposit(desc) {
  if (!desc) return 2000000;
  const mTrieu = desc.match(/Cọc\s*([\d.,]+)\s*triệu/i);
  if (mTrieu) {
    const n = parseFloat(mTrieu[1].replace(",", "."));
    if (!isNaN(n)) return Math.round(n * 1_000_000);
  }
  const mVnd = desc.match(/Cọc\s*([\d.\s,]+)/i);
  if (mVnd) {
    const digits = mVnd[1].replace(/[^\d]/g, "");
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 2000000;
}
function combineDateWithSlot(dateOnly, slotId) {
  if (!dateOnly) return null;
  const slot = SLOTS.find((s) => s.id === slotId) || SLOTS[0];
  const d = new Date(dateOnly);
  d.setHours(slot.h, slot.m, 0, 0);
  return d;
}
const diffHours = (d1, d2) => (d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
function countWeekdaysBetweenAligned(t1, t2) {
  let days = 0;
  let weekdays = 0;
  let cur = new Date(t1.getTime());
  cur.setHours(0, 0, 0, 0);
  const end = new Date(t2.getTime());
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    days += 1;
    if (!isWeekend(cur)) weekdays += 1;
    cur = addDays(cur, 1);
  }
  return { days, weekdays };
}
// NEW: rút gọn mô tả cho PayOS (≤25 ký tự)
function safeDesc(s) {
  if (!s) return "Thanh toan don hang";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= 25 ? t : t.slice(0, 24) + "…";
}
// NEW: chuẩn hoá số điện thoại VN đơn giản
function normalizePhone(p) {
  if (!p) return "";
  let s = p.replace(/[^\d]/g, "");
  if (s.startsWith("84")) s = "0" + s.slice(2);
  return s;
}

/* ===== Hook tính giá ===== */
function useBookingPricing(device, startDate, slotId, endDate, voucherId) {
  return useMemo(() => {
    if (!device || !startDate || !endDate)
      return {
        days: 0,
        subTotal: 0,
        discount: 0,
        total: 0,
        t1: null,
        t2: null,
      };

    const t1 = combineDateWithSlot(startDate, slotId);
    const t2 = combineDateWithSlot(endDate, slotId);
    if (!t1 || !t2 || t2 <= t1)
      return { days: 0, subTotal: 0, discount: 0, total: 0, t1, t2 };

    const hours = diffHours(t1, t2);
    let days = Math.ceil(hours / 24);
    let subTotal = 0;

    if (hours <= 6) {
      subTotal = device.priceSixHours || 0;
      days = 0.5;
    } else if (days === 1) subTotal = device.priceOneDay || 0;
    else if (days === 2) subTotal = device.priceTwoDay || 0;
    else if (days === 3) subTotal = device.priceThreeDay || 0;
    else
      subTotal =
        (device.priceThreeDay || 0) + (days - 3) * (device.priceNextDay || 0);

    const voucher = VOUCHERS.find((v) => v.id === voucherId);
    let discount = 0;
    if (voucher?.id === "WEEKDAY20") {
      if (hours <= 6) {
        if (!isWeekend(t1)) discount = Math.round(subTotal * voucher.rate);
      } else {
        const { days: dCount, weekdays } = countWeekdaysBetweenAligned(t1, t2);
        const ratio = dCount > 0 ? weekdays / dCount : 0;
        discount = Math.round(subTotal * voucher.rate * ratio);
      }
    }

    const total = Math.max(0, subTotal - discount);
    return { days, subTotal, discount, total, t1, t2 };
  }, [device, startDate, endDate, slotId, voucherId]);
}

/* ===================== UI Components ===================== */
function Progress({ step }) {
  const pct = (step / STEPS.length) * 100;
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[11px] text-rose-700">
        <span>
          Bước {step}/{STEPS.length}
        </span>
        <span>{STEPS[step - 1]}</span>
      </div>
      <div className="mt-2 h-2 w-full bg-rose-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-rose-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CategoryChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar py-1">
      {CATEGORIES.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={
              "shrink-0 px-4 py-2 rounded-full text-sm border transition " +
              (active
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-white text-rose-700 border-rose-300")
            }
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function CameraList({ items, selectedId, onSelect }) {
  if (!items.length)
    return <p className="text-gray-500 text-sm">Không có máy phù hợp.</p>;
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const active = selectedId === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={
              "w-full flex items-center gap-3 p-3 rounded-xl border text-left active:scale-[0.99] transition " +
              (active
                ? "border-rose-500 bg-rose-50"
                : "border-rose-200 bg-white")
            }
          >
            <img
              src={it.img}
              alt={it.displayName}
              className="w-20 h-14 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-rose-900 truncate">
                {it.displayName}
              </div>
              <div className="text-[12px] text-gray-600">
                {Number(it.pricePerDay).toLocaleString("vi-VN")} đ/ngày • Cọc{" "}
                {Number(it.deposit).toLocaleString("vi-VN")} đ
              </div>
            </div>
            <div
              className={
                "h-5 w-5 rounded-full border flex items-center justify-center " +
                (active
                  ? "bg-rose-500 border-rose-500 text-white"
                  : "border-rose-300 text-transparent")
              }
            >
              •
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Card({ title, children, note }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-white">
      {title && (
        <div className="px-4 py-3 border-b border-rose-100 text-sm font-medium text-rose-900">
          {title}
        </div>
      )}
      <div className="p-4">{children}</div>
      {note && (
        <div className="px-4 pb-3 text-[11px] text-rose-600 -mt-2">{note}</div>
      )}
    </div>
  );
}

function DateOnly({ value, onChange, label, minDate }) {
  return (
    <div>
      <div className="text-[13px] font-medium text-rose-900 mb-2">{label}</div>
      <DatePicker
        selected={value}
        onChange={(d) => onChange(d)}
        locale="vi"
        dateFormat="dd/MM/yyyy"
        minDate={minDate}
        placeholderText="Chọn ngày"
        className="w-full rounded-xl border border-rose-300 focus:border-rose-500 focus:ring-rose-500 px-3 py-2"
        showPopperArrow={false}
        shouldCloseOnSelect
      />
    </div>
  );
}

function SlotPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SLOTS.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={
              "px-4 py-3 rounded-xl text-sm border active:scale-[0.98] transition " +
              (active
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-white text-rose-700 border-rose-300")
            }
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function VoucherPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {VOUCHERS.map((v) => {
        const active = value === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={
              "w-full px-4 py-3 rounded-xl text-sm border text-left transition " +
              (active
                ? "bg-rose-50 border-rose-500"
                : "bg-white border-rose-200")
            }
          >
            <div className="flex items-center justify-between">
              <span
                className={
                  active ? "text-rose-900 font-medium" : "text-gray-800"
                }
              >
                {v.label}
              </span>
              <span
                className={
                  "h-5 w-5 rounded-full border flex items-center justify-center " +
                  (active
                    ? "bg-rose-500 border-rose-500 text-white"
                    : "border-rose-300 text-transparent")
                }
              >
                •
              </span>
            </div>
            {v.id === "WEEKDAY20" && (
              <div className="text-[11px] text-rose-600 mt-1">
                Chỉ giảm các ngày trong tuần (Thứ 2 - Thứ 6)
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function Summary({ device, t1, t2, slotId, days, subTotal, discount, total }) {
  const slotLabel = SLOTS.find((s) => s.id === slotId)?.label || "";
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <img
          src={device?.img}
          alt={device?.displayName}
          className="w-24 h-20 rounded-xl object-cover"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-rose-900 truncate">
            {device?.displayName || "—"}
          </div>
          <div className="text-[12px] text-gray-600">
            {Number(device?.pricePerDay || 0).toLocaleString("vi-VN")} đ/ngày •
            Cọc {Number(device?.deposit || 0).toLocaleString("vi-VN")} đ
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-[13px]">
        <div>
          <div className="text-gray-500">Nhận</div>
          <div className="font-medium">
            {t1 ? `${format(t1, "dd/MM/yyyy")} • ${slotLabel}` : "—"}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Trả</div>
          <div className="font-medium">
            {t2 ? `${format(t2, "dd/MM/yyyy")} • ${slotLabel}` : "—"}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Ngày tính phí</div>
          <div className="font-medium">
            {days === 0.5 ? "0.5 (≤6h)" : days || 0}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Giảm</div>
          <div className="font-medium">
            - {Number(discount).toLocaleString("vi-VN")} đ
          </div>
        </div>
      </div>
      <div className="border-t border-rose-100 pt-2 grid grid-cols-2 gap-3 text-[13px]">
        <div>
          <div className="text-gray-500">Tạm tính</div>
          <div className="font-medium">
            {Number(subTotal).toLocaleString("vi-VN")} đ
          </div>
        </div>
        <div>
          <div className="text-gray-500">Thành tiền</div>
          <div className="text-[16px] font-semibold text-rose-900">
            {Number(total).toLocaleString("vi-VN")} đ
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== APP ===================== */
export default function App() {
  const [allDevices, setAllDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // NEW: state thông tin khách
  const [customer, setCustomer] = useState({
    fullName: "",
    phone: "",
    ig: "",
    fb: "",
  });

  // fetch devices
  const fetchAllDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/v1/devices");
      setAllDevices(response.data || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      alert("Không thể tải danh sách thiết bị. Vui lòng thử lại.");
      setAllDevices([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllDevices();
  }, [fetchAllDevices]);

  const DERIVED = useMemo(() => {
    if (!allDevices) return [];
    function normalizeName(name = "") {
      return name.replace(/\s*\(\d+\)\s*$/, "").trim();
    }
    const seen = new Set();
    const result = [];
    for (const it of allDevices) {
      const normalized = normalizeName(it.name);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push({
        ...it,
        brand: inferBrand(it.name),
        img: it.images?.[0] || FALLBACK_IMG,
        pricePerDay: it.priceOneDay || 0,
        deposit: parseDeposit(it.description),
        displayName: normalized,
      });
    }
    return result;
  }, [allDevices]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const getInitialStateFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const deviceIdParam = params.get("device");
    return {
      step: parseInt(params.get("step") || "1"),
      category: params.get("category"),
      deviceId: deviceIdParam ? parseInt(deviceIdParam, 10) : null,
      startDate: params.get("start") ? parseISO(params.get("start")) : null,
      endDate: params.get("end") ? parseISO(params.get("end")) : null,
      slotId: params.get("slot") || "MORNING",
      voucherId: params.get("voucher") || "NONE",
    };
  }, []);

  const [state, setState] = useState(getInitialStateFromUrl);
  const { step, category, deviceId, startDate, endDate, slotId, voucherId } =
    state;

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("step", step.toString());
    if (category) params.set("category", category);
    if (deviceId) params.set("device", deviceId.toString());
    if (startDate) params.set("start", format(startDate, "yyyy-MM-dd"));
    if (endDate) params.set("end", format(endDate, "yyyy-MM-dd"));
    if (slotId && slotId !== "MORNING") params.set("slot", slotId);
    if (voucherId && voucherId !== "NONE") params.set("voucher", voucherId);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(state, "", newUrl);
  }, [step, category, deviceId, startDate, endDate, slotId, voucherId, state]);

  const filtered = useMemo(() => {
    if (!category) return DERIVED;
    return DERIVED.filter((i) => i.brand === category);
  }, [category, DERIVED]);

  const selectedDevice = useMemo(
    () => DERIVED.find((i) => i.id === deviceId) || null,
    [deviceId, DERIVED]
  );

  const { days, subTotal, discount, total, t1, t2 } = useBookingPricing(
    selectedDevice,
    startDate,
    slotId,
    endDate,
    voucherId
  );

  // NEW: validate bước Thông tin
  const validInfo = useMemo(() => {
    const nameOk = customer.fullName?.trim().length >= 2;
    const phone = normalizePhone(customer.phone);
    const phoneOk = /^0\d{9,10}$/.test(phone); // 10-11 số, đầu 0
    return nameOk && phoneOk;
  }, [customer]);

  const canNext = useMemo(() => {
    if (step === 1) return !!category;
    if (step === 2) return !!deviceId;
    if (step === 3)
      return (
        !!startDate &&
        !!endDate &&
        combineDateWithSlot(endDate, slotId) >
          combineDateWithSlot(startDate, slotId)
      );
    if (step === 4) return validInfo; // NEW
    return true;
  }, [step, category, deviceId, startDate, endDate, slotId, validInfo]);

  const updateState = (key, value) =>
    setState((prev) => ({ ...prev, [key]: value }));
  const next = () => updateState("step", Math.min(5, step + 1)); // NEW: 5 steps
  const back = () => updateState("step", Math.max(1, step - 1));

  // ====== SUBMIT PAYMENT (update theo BE + tạo account) ======
  const submitPayment = async () => {
    if (!selectedDevice || !t1 || !t2 || total <= 0) {
      alert("Thông tin đặt lịch chưa hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    if (!validInfo) {
      alert("Vui lòng nhập họ tên và SĐT hợp lệ.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1) Đăng ký/ghi nhận tài khoản (idempotent phía BE)
      const phone = normalizePhone(customer.phone);
      const registerRes = await api.post("/accounts", {
        fullName: customer.fullName?.trim(),
        phone,
        ig: customer.ig?.trim() || null,
        fb: customer.fb?.trim() || null,
        // email/password có thể để null nếu BE cho phép
      });
      const account = registerRes.data;
      const customerId = account?.id;
      if (!customerId) throw new Error("Không lấy được customerId.");

      // 2) Build bookingRequest cho BE
      const bookingRequest = {
        customerId, // <-- dùng id vừa nhận
        deviceId: selectedDevice.id,
        bookingFrom: t1.toISOString(), // FE gửi UTC ISO, BE convertUtcToVn
        bookingTo: t2.toISOString(),
        total: total, // BE có thể không dùng, vẫn gửi để tham khảo
        note: `Khách: ${customer.fullName} - ${phone}${
          customer.ig ? " - IG:" + customer.ig : ""
        }${customer.fb ? " - FB:" + customer.fb : ""}`,
      };

      // 3) Gọi tạo link thanh toán
      const rawDesc = `Thue ${selectedDevice.displayName}`;
      const payload = {
        amount: total,
        description: safeDesc(rawDesc), // ≤25 ký tự tránh PayOSException
        bookingRequest,
      };

      const response = await api.post("/create-payment-link", payload);

      if (response.data && response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl; // Redirect PayOS
      } else {
        throw new Error("Không nhận được link thanh toán từ server.");
      }
    } catch (error) {
      console.error("Failed to create payment link:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo yêu cầu thanh toán.";
      alert(`Đã xảy ra lỗi: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-rose-50 text-rose-950">
      <div className="max-w-xl mx-auto px-4 pb-28 pt-6">
        <header className="mb-2">
          <h1 className="text-xl font-bold text-rose-900">Đặt lịch thuê máy</h1>
        </header>

        <Progress step={step} />

        <main className="mt-4 space-y-4">
          {step === 1 && (
            <>
              <Card title="Chọn loại">
                <CategoryChips
                  value={category}
                  onChange={(val) => {
                    updateState("category", val);
                    updateState("deviceId", null);
                  }}
                />
              </Card>
              <div className="text-[11px] text-rose-600 px-1">
                Gợi ý: Chọn hãng trước để danh sách máy gọn hơn.
              </div>
            </>
          )}

          {step === 2 && (
            <Card title="Chọn máy">
              {isLoading ? (
                <div className="w-full text-center py-8 text-sm text-gray-500">
                  Đang tải danh sách thiết bị...
                </div>
              ) : (
                <CameraList
                  items={filtered}
                  selectedId={deviceId}
                  onSelect={(val) => updateState("deviceId", val)}
                />
              )}
            </Card>
          )}

          {step === 3 && (
            <>
              <Card
                title="Ngày nhận & trả"
                note="Giờ nhận/trả cố định theo lựa chọn dưới."
              >
                <div className="grid grid-cols-1 gap-4">
                  <DateOnly
                    value={startDate}
                    onChange={(d) => {
                      updateState("startDate", d);
                      if (endDate && d && endDate < d)
                        updateState("endDate", d);
                    }}
                    label="Ngày nhận"
                    minDate={today}
                  />
                  <DateOnly
                    value={endDate}
                    onChange={(d) => updateState("endDate", d)}
                    label="Ngày trả"
                    minDate={startDate || today}
                  />
                  <div>
                    <div className="text-[13px] font-medium text-rose-900 mb-2">
                      Giờ nhận & trả
                    </div>
                    <SlotPicker
                      value={slotId}
                      onChange={(val) => updateState("slotId", val)}
                    />
                  </div>
                </div>
              </Card>

              <Card title="Mã giảm giá">
                <VoucherPicker
                  value={voucherId}
                  onChange={(val) => updateState("voucherId", val)}
                />
              </Card>
            </>
          )}

          {/* NEW: Bước 4 - Nhập thông tin cá nhân */}
          {step === 4 && (
            <Card
              title="Thông tin khách hàng"
              note="Nhập đúng SĐT để tiện liên hệ & xác minh."
            >
              <div className="space-y-3">
                <div>
                  <div className="text-[13px] mb-1">Họ và Tên *</div>
                  <input
                    value={customer.fullName}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, fullName: e.target.value }))
                    }
                    className="w-full rounded-xl border border-rose-300 focus:border-rose-500 focus:ring-rose-500 px-3 py-2"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <div className="text-[13px] mb-1">Số điện thoại *</div>
                  <input
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, phone: e.target.value }))
                    }
                    className="w-full rounded-xl border border-rose-300 focus:border-rose-500 focus:ring-rose-500 px-3 py-2"
                    inputMode="tel"
                    placeholder="0901234567"
                  />
                  {!validInfo && customer.phone && (
                    <div className="text-[11px] text-rose-600 mt-1">
                      SĐT cần 10-11 số, bắt đầu bằng 0.
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[13px] mb-1">Instagram (tuỳ chọn)</div>
                  <input
                    value={customer.ig}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, ig: e.target.value }))
                    }
                    className="w-full rounded-xl border border-rose-200 focus:border-rose-400 px-3 py-2"
                    placeholder="username_ig"
                  />
                </div>
                <div>
                  <div className="text-[13px] mb-1">Facebook (tuỳ chọn)</div>
                  <input
                    value={customer.fb}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, fb: e.target.value }))
                    }
                    className="w-full rounded-xl border border-rose-200 focus:border-rose-400 px-3 py-2"
                    placeholder="facebook.com/tenban"
                  />
                </div>
              </div>
            </Card>
          )}

          {step === 5 && (
            <Card title="Tổng kết">
              <Summary
                device={selectedDevice}
                t1={t1}
                t2={t2}
                slotId={slotId}
                days={days}
                subTotal={subTotal}
                discount={discount}
                total={total}
              />
              <div className="mt-3 text-[12px] text-gray-600">
                Khách: <b>{customer.fullName || "—"}</b> •{" "}
                {normalizePhone(customer.phone) || "—"}
                {customer.ig ? ` • IG: ${customer.ig}` : ""}
                {customer.fb ? ` • FB: ${customer.fb}` : ""}
              </div>
            </Card>
          )}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div className="mx-auto max-w-xl px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="bg-white/95 backdrop-blur border-t border-rose-200 rounded-t-2xl p-3 shadow-lg">
            <div className="flex items-center gap-3">
              <button
                onClick={back}
                disabled={step === 1}
                className="px-4 py-3 rounded-xl border flex-1 border-rose-300 text-rose-700 disabled:opacity-50"
              >
                Quay lại
              </button>
              {step < 5 ? (
                <button
                  onClick={next}
                  disabled={!canNext}
                  className="px-4 py-3 rounded-xl bg-rose-600 text-white flex-1 disabled:opacity-50"
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  onClick={submitPayment}
                  disabled={
                    !selectedDevice ||
                    !t1 ||
                    !t2 ||
                    total <= 0 ||
                    isSubmitting ||
                    !validInfo
                  }
                  className="px-4 py-3 rounded-xl bg-rose-600 text-white flex-1 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Đang xử lý..."
                    : `Thanh toán (${total.toLocaleString("vi-VN")} đ)`}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
