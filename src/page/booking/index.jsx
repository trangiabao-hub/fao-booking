import React, { useMemo, useState, useEffect, useCallback } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import vi from "date-fns/locale/vi";
import { format, isWeekend, addDays, parseISO } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  TagIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";

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
  let days = 0, weekdays = 0;
  let cur = new Date(t1.getTime()); cur.setHours(0,0,0,0);
  const end = new Date(t2.getTime()); end.setHours(0,0,0,0);
  while(cur < end) { days+=1; if(!isWeekend(cur)) weekdays+=1; cur = addDays(cur, 1) }
  return {days, weekdays};
}
function safeDesc(s) {
  if (!s) return "Thanh toan don hang";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= 25 ? t : t.slice(0, 24) + "…";
}
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
      return { days: 0, subTotal: 0, discount: 0, total: 0, t1: null, t2: null };

    const t1 = combineDateWithSlot(startDate, slotId);
    const t2 = combineDateWithSlot(endDate, slotId);
    if (!t1 || !t2 || t2 <= t1)
      return { days: 0, subTotal: 0, discount: 0, total: 0, t1, t2 };

    const hours = diffHours(t1, t2);
    let days = Math.ceil(hours / 24);
    let subTotal = 0;

    if (hours <= 6) { subTotal = device.priceSixHours || 0; days = 0.5; }
    else if (days === 1) subTotal = device.priceOneDay || 0;
    else if (days === 2) subTotal = device.priceTwoDay || 0;
    else if (days === 3) subTotal = device.priceThreeDay || 0;
    else subTotal = (device.priceThreeDay || 0) + (days - 3) * (device.priceNextDay || 0);

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
    <div className="my-6">
      <div className="flex items-center justify-between text-xs text-pink-700 font-medium mb-2">
        <span>
          Bước {step} / {STEPS.length}
        </span>
        <span>{STEPS[step - 1]}</span>
      </div>
      <div className="h-2 w-full bg-pink-100 rounded-full">
        <div
          className="h-full bg-gradient-to-r from-pink-400 to-pink-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Card({ title, children, note }) {
  return (
    <div className="rounded-2xl border border-pink-100 bg-white shadow-md shadow-pink-500/5">
      {title && (
        <div className="px-5 py-4 border-b border-pink-100 text-base font-semibold text-pink-800 flex items-center">
          {title}
        </div>
      )}
      <div className="p-5">{children}</div>
      {note && (
        <div className="px-5 pb-4 text-xs text-pink-600 -mt-2">{note}</div>
      )}
    </div>
  );
}

function CategoryChips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {CATEGORIES.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border-2 transition-transform active:scale-95 ${
              active
                ? "bg-pink-600 text-white border-pink-600 shadow-lg shadow-pink-500/30"
                : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50 hover:border-pink-300"
            }`}
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
    return <p className="text-slate-500 text-sm py-4 text-center">Không có máy nào trong danh mục này.</p>;
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const active = selectedId === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
              active
                ? "border-pink-500 bg-pink-50 ring-2 ring-pink-200"
                : "border-pink-200 bg-white hover:border-pink-300 hover:bg-pink-50/50"
            }`}
          >
            <img
              src={it.img}
              alt={it.displayName}
              className="w-24 h-16 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-pink-900 truncate">
                {it.displayName}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {Number(it.pricePerDay).toLocaleString("vi-VN")} đ/ngày
              </div>
               <div className="text-xs text-slate-500">
                Cọc {Number(it.deposit).toLocaleString("vi-VN")} đ
              </div>
            </div>
            <div className={`transition-all duration-300 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
              <CheckCircleIcon className="h-6 w-6 text-pink-500"/>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DateOnly({ value, onChange, label, minDate }) {
  return (
    <div>
      <div className="text-sm font-medium text-pink-900 mb-2">{label}</div>
      <div className="relative">
         <CalendarDaysIcon className="h-5 w-5 text-pink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"/>
        <DatePicker
          selected={value}
          onChange={(d) => onChange(d)}
          locale="vi"
          dateFormat="dd/MM/yyyy"
          minDate={minDate}
          placeholderText="Chọn ngày"
          className="w-full rounded-xl border-2 border-pink-200 focus:border-pink-500 focus:ring-pink-500 pl-10 pr-3 py-2.5 text-pink-900"
          showPopperArrow={false}
        />
      </div>
    </div>
  );
}

function SlotPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {SLOTS.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 active:scale-95 transition ${
              active
                ? "bg-pink-600 text-white border-pink-600"
                : "bg-white text-pink-800 border-pink-200 hover:bg-pink-50"
            }`}
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
    <div className="space-y-3">
      {VOUCHERS.map((v) => {
        const active = value === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={`w-full p-4 rounded-xl border-2 text-left transition ${
              active
                ? "bg-pink-50 border-pink-500"
                : "bg-white border-pink-200 hover:bg-pink-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${active ? "text-pink-900" : "text-slate-800"}`}>
                {v.label}
              </span>
              <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  active ? "border-pink-500 bg-pink-500" : "border-pink-300"
              }`}>
                {active && <div className="h-2 w-2 bg-white rounded-full"></div>}
              </div>
            </div>
            {v.id === "WEEKDAY20" && (
              <div className="text-xs text-pink-600 mt-1.5">
                Chỉ áp dụng giảm giá cho các ngày trong tuần (T2 - T6).
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

const InputField = ({ icon, value, onChange, placeholder, inputMode, error, helpText }) => {
    return (
        <div>
            <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400">
                    {icon}
                </div>
                <input
                    value={value}
                    onChange={onChange}
                    className={`w-full rounded-xl border-2 ${error ? 'border-red-400' : 'border-pink-200'} focus:border-pink-500 focus:ring-pink-500 pl-11 pr-4 py-3 text-pink-900 placeholder:text-slate-400`}
                    placeholder={placeholder}
                    inputMode={inputMode}
                />
            </div>
            {error && helpText && (
                <div className="text-xs text-red-500 mt-1.5 ml-1">{helpText}</div>
            )}
        </div>
    );
}

function Summary({ device, t1, t2, slotId, days, subTotal, discount, total, customer }) {
  const slotLabel = SLOTS.find((s) => s.id === slotId)?.label || "";

  const renderInfoRow = (label, value) => (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  )
  
  return (
    <div className="space-y-4">
       <div className="flex gap-4 items-center">
          <img src={device?.img} alt={device?.displayName} className="w-20 h-20 rounded-xl object-cover shadow-md shadow-pink-200/50"/>
          <div className="flex-1 min-w-0">
             <div className="font-semibold text-pink-900 truncate">{device?.displayName || "—"}</div>
             <div className="text-xs text-slate-500 mt-1">Cọc {Number(device?.deposit || 0).toLocaleString("vi-VN")} đ</div>
          </div>
       </div>

        <div className="p-4 bg-pink-50/70 rounded-xl space-y-2">
            {renderInfoRow("Ngày nhận", t1 ? `${format(t1, "dd/MM, EEEE", { locale: vi })}` : "—")}
            {renderInfoRow("Ngày trả", t2 ? `${format(t2, "dd/MM, EEEE", { locale: vi })}` : "—")}
            {renderInfoRow("Giờ", `${slotLabel}`)}
        </div>
       
       <div className="border-t border-dashed border-pink-200 my-4"></div>

        <div className="space-y-2">
           {renderInfoRow("Thời gian thuê", `${days === 0.5 ? "Dưới 6 tiếng" : `${days} ngày`}`)}
           {renderInfoRow("Tạm tính", `${Number(subTotal).toLocaleString("vi-VN")} đ`)}
           {renderInfoRow("Giảm giá", `- ${Number(discount).toLocaleString("vi-VN")} đ`)}
        </div>

        <div className="!mt-4 p-4 bg-pink-100 rounded-xl flex justify-between items-center">
          <span className="text-base font-semibold text-pink-800">Thành tiền</span>
          <span className="text-xl font-bold text-pink-700">
            {Number(total).toLocaleString("vi-VN")} đ
          </span>
        </div>
        
         <div className="!mt-4 pt-4 border-t border-pink-200 text-sm text-slate-600 space-y-1">
              <p><b>Khách hàng:</b> {customer.fullName || "—"}</p>
              <p><b>Số điện thoại:</b> {normalizePhone(customer.phone) || "—"}</p>
              {customer.ig && <p><b>Instagram:</b> {customer.ig}</p>}
        </div>

    </div>
  );
}

/* ===================== APP ===================== */
export default function BookingPage() {
  const [allDevices, setAllDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customer, setCustomer] = useState({ fullName: "", phone: "", ig: "", fb: "" });

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

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const getInitialStateFromUrl = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      step: parseInt(params.get("step") || "1", 10),
      category: params.get("category"),
      deviceId: params.get("device") ? parseInt(params.get("device"), 10) : null,
      startDate: params.get("start") ? parseISO(params.get("start")) : null,
      endDate: params.get("end") ? parseISO(params.get("end")) : null,
      slotId: params.get("slot") || "MORNING",
      voucherId: params.get("voucher") || "NONE",
    };
  }, []);

  const [state, setState] = useState(getInitialStateFromUrl);
  const { step, category, deviceId, startDate, endDate, slotId, voucherId } = state;

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
  }, [state, category, deviceId, startDate, endDate, slotId, voucherId]);

  const filtered = useMemo(() => {
    if (!category) return DERIVED;
    return DERIVED.filter((i) => i.brand === category);
  }, [category, DERIVED]);

  const selectedDevice = useMemo(() => DERIVED.find((i) => i.id === deviceId) || null, [deviceId, DERIVED]);
  const { days, subTotal, discount, total, t1, t2 } = useBookingPricing(selectedDevice, startDate, slotId, endDate, voucherId);

  const { validInfo, errors } = useMemo(() => {
    const err = {};
    const nameOk = customer.fullName?.trim().length >= 2;
    if (!nameOk && customer.fullName) err.fullName = true;

    const phone = normalizePhone(customer.phone);
    const phoneOk = /^0\d{9}$/.test(phone);
    if (!phoneOk && customer.phone) err.phone = true;
    
    return { validInfo: customer.fullName?.trim().length >= 2 && /^0\d{9}$/.test(normalizePhone(customer.phone)), errors: err };
  }, [customer]);

  const canNext = useMemo(() => {
    if (step === 1) return !!category;
    if (step === 2) return !!deviceId;
    if (step === 3) return !!startDate && !!endDate && combineDateWithSlot(endDate, slotId) > combineDateWithSlot(startDate, slotId);
    if (step === 4) return validInfo;
    return true;
  }, [step, category, deviceId, startDate, endDate, slotId, validInfo]);

  const updateState = (key, value) => setState((prev) => ({ ...prev, [key]: value }));
  const next = () => updateState("step", Math.min(STEPS.length, step + 1));
  const back = () => {
  if (step === 1) {
    // về trang chủ
    window.location.href = "/";
    return;
  }
  updateState("step", Math.max(1, step - 1));
};


  const submitPayment = async () => {
    if (!selectedDevice || !t1 || !t2 || total <= 0 || !validInfo) {
      alert("Thông tin đặt lịch hoặc thông tin khách hàng chưa hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }
    setIsSubmitting(true);
    try {
      const phone = normalizePhone(customer.phone);
      const registerRes = await api.post("/accounts", {
        fullName: customer.fullName?.trim(),
        phone,
        ig: customer.ig?.trim() || null,
        fb: customer.fb?.trim() || null,
      });
      const account = registerRes.data;
      const customerId = account?.id;
      if (!customerId) throw new Error("Không lấy được customerId.");

      const bookingRequest = {
        customerId,
        deviceId: selectedDevice.id,
        bookingFrom: t1.toISOString(),
        bookingTo: t2.toISOString(),
        total: total,
        note: `Khách: ${customer.fullName} - ${phone}${customer.ig ? " - IG:" + customer.ig : ""}${customer.fb ? " - FB:" + customer.fb : ""}`,
      };

      const rawDesc = `Thue ${selectedDevice.displayName}`;
      const payload = {
        amount: total,
        description: safeDesc(rawDesc),
        bookingRequest,
      };

      const response = await api.post("/create-payment-link", payload);
      if (response.data && response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        throw new Error("Không nhận được link thanh toán từ server.");
      }
    } catch (error) {
      console.error("Failed to create payment link:", error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || "Không thể tạo yêu cầu thanh toán.";
      alert(`Đã xảy ra lỗi: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white to-pink-100 text-slate-800">
      <div className="max-w-md mx-auto px-4 pb-32 pt-8">
        <header className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-pink-800 tracking-tight">
            Đặt Lịch Thuê Máy Ảnh
          </h1>
          <p className="text-pink-600 mt-1">Nhanh chóng, tiện lợi, xinh xẻo</p>
        </header>

        <Progress step={step} />

        <main className="mt-6 space-y-5">
          {step === 1 && (
            <Card title="1. Chọn loại máy ảnh bạn thích">
              <CategoryChips
                value={category}
                onChange={(val) => {
                  updateState("category", val);
                  updateState("deviceId", null);
                }}
              />
            </Card>
          )}

          {step === 2 && (
            <Card title="2. Lựa chọn một 'em' máy xinh">
              {isLoading ? (
                <div className="w-full text-center py-10 text-sm text-slate-500">Đang tải danh sách...</div>
              ) : (
                <CameraList items={filtered} selectedId={deviceId} onSelect={(val) => updateState("deviceId", val)} />
              )}
            </Card>
          )}

          {step === 3 && (
            <>
              <Card title="3. Chọn ngày thuê & mã giảm" note="Giờ nhận/trả được cố định theo ca bạn chọn.">
                <div className="grid grid-cols-1 gap-5">
                  <DateOnly value={startDate} onChange={(d) => { updateState("startDate", d); if (endDate && d && endDate < d) updateState("endDate", d); }} label="Ngày nhận" minDate={today}/>
                  <DateOnly value={endDate} onChange={(d) => updateState("endDate", d)} label="Ngày trả" minDate={startDate || today}/>
                  <div>
                    <div className="text-sm font-medium text-pink-900 mb-2">Ca nhận & trả</div>
                    <SlotPicker value={slotId} onChange={(val) => updateState("slotId", val)}/>
                  </div>
                </div>
              </Card>

              <Card title={<><TagIcon className="h-5 w-5 inline mr-2" /> Mã giảm giá</>}>
                <VoucherPicker value={voucherId} onChange={(val) => updateState("voucherId", val)}/>
              </Card>
            </>
          )}

          {step === 4 && (
            <Card title="4. Thông tin liên lạc" note="Vui lòng nhập chính xác để tụi mình liên hệ nhé.">
              <div className="space-y-4">
                 <InputField
                    icon={<UserIcon className="h-5 w-5"/>}
                    value={customer.fullName}
                    onChange={(e) => setCustomer((c) => ({ ...c, fullName: e.target.value }))}
                    placeholder="Nguyễn Thị Bông"
                    error={errors.fullName}
                    helpText="Họ tên cần có ít nhất 2 ký tự."
                />
                 <InputField
                    icon={<DevicePhoneMobileIcon className="h-5 w-5"/>}
                    value={customer.phone}
                    onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="0901234567"
                    inputMode="tel"
                    error={errors.phone}
                    helpText="SĐT hợp lệ của Việt Nam có 10 số, bắt đầu bằng 0."
                />
                <InputField
                    icon={<span className="font-bold text-sm">IG</span>}
                    value={customer.ig}
                    onChange={(e) => setCustomer((c) => ({ ...c, ig: e.target.value }))}
                    placeholder="username_ig (không bắt buộc)"
                />
              </div>
            </Card>
          )}

          {step === 5 && (
            <Card title="5. Xác nhận và thanh toán">
              <Summary
                device={selectedDevice} t1={t1} t2={t2} slotId={slotId} days={days}
                subTotal={subTotal} discount={discount} total={total} customer={customer}
              />
            </Card>
          )}
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10">
        <div className="mx-auto max-w-md">
          <div className="bg-white/80 backdrop-blur-lg border-t border-pink-200 rounded-t-3xl p-4 shadow-2xl shadow-pink-300/20">
            <div className="flex items-center gap-3">
              <button
                onClick={back} 
                className="px-4 py-3.5 rounded-xl border-2 flex-1 border-pink-300 text-pink-800 font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-transform active:scale-95"
              > <ArrowLeftIcon className="h-5 w-5" /> Quay lại </button>

              {step < 5 ? (
                <button
                  onClick={next} disabled={!canNext}
                  className="px-4 py-3.5 rounded-xl bg-pink-600 text-white flex-1 font-semibold disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-all active:scale-95"
                > Tiếp tục <ArrowRightIcon className="h-5 w-5" /> </button>
              ) : (
                <button
                  onClick={submitPayment} disabled={!selectedDevice || !t1 || !t2 || total <= 0 || isSubmitting || !validInfo }
                  className="px-4 py-3.5 rounded-xl bg-pink-600 text-white flex-1 font-semibold disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-all active:scale-95"
                >
                   {isSubmitting ? "Đang xử lý..." : (<> <CreditCardIcon className="h-5 w-5"/> Thanh toán ({total.toLocaleString("vi-VN")} đ) </>)}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}