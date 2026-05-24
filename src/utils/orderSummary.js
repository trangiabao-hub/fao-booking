import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { BRANCHES } from "../data/bookingConstants";
import { normalizeBookingBranchId } from "./deviceBranch";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Định dạng chuẩn khi copy/gửi shop: 09:00, 25/05/2026 */
export function formatOrderDateTime(dateStr) {
  if (!dateStr) return "";
  return dayjs(dateStr).tz("Asia/Ho_Chi_Minh").format("HH:mm, DD/MM/YYYY");
}

export function getBranchLabelFromId(branchId) {
  const id = normalizeBookingBranchId(branchId);
  return BRANCHES.find((b) => b.id === id)?.label || null;
}

/** Gom thiết bị theo tên — "DJI Mic Mini (1), Canon G7X (2)" */
export function formatDevicesLine(details) {
  if (!details) return "";
  const names = details.devices?.length
    ? details.devices.map((d) => d.name).filter(Boolean)
    : details.device?.name
      ? [details.device.name]
      : Array.isArray(details.deviceNames)
        ? details.deviceNames.filter(Boolean)
        : [];

  if (names.length === 0) return "";

  const counts = {};
  for (const name of names) {
    counts[name] = (counts[name] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, qty]) => (qty > 1 ? `${name} (${qty})` : `${name} (${qty})`))
    .join(", ");
}

/**
 * Note booking thường: "Lan Phương 0901234567 FAO Phú Nhuận"
 * Sau thanh toán có thể kèm PayOS#… | MãĐơn:…
 */
export function parseCustomerNameFromBookingNote(note) {
  if (!note) return null;
  let s = String(note).trim();
  if (!s) return null;

  s = s.replace(/\s*\|\s*PayOS#\d+.*$/i, "");
  s = s.replace(/PayOS#\d+.*$/i, "");
  s = s.replace(/\s*\|\s*MãĐơn:[^\|]+/gi, "");

  for (const branch of BRANCHES) {
    const idx = s.lastIndexOf(branch.label);
    if (idx > 0) {
      s = s.slice(0, idx).trim();
      break;
    }
  }

  s = s.replace(/\s*0\d{8,10}\s*$/, "").trim();
  return s.length >= 2 ? s : null;
}

export function parsePayOsCodeFromNote(note) {
  const m = String(note || "").match(/PayOS#(\d+)/);
  return m ? m[1] : null;
}

const SHOP_CONFIRM_FOOTER =
  "Chào shop, mình vừa đặt đơn trên và đã thanh toán thành công. Mong shop xác nhận ạ!";

/** Nội dung copy/gửi Messenger — đủ trường theo mẫu shop. */
export function buildOrderSummaryText(details, { includeFooter = true } = {}) {
  if (!details) return "";

  const branchLabel =
    details.branchLabel || getBranchLabelFromId(details.branchId);
  const devices = formatDevicesLine(details);

  const lines = [
    "📋 TÓM TẮT ĐƠN HÀNG",
    "",
    details.orderCode != null && details.orderCode !== ""
      ? `Mã thanh toán (PayOS): ${details.orderCode}`
      : null,
    details.orderIdNew ? `Mã đơn hàng: ${details.orderIdNew}` : null,
    details.customerName ? `Khách hàng: ${details.customerName}` : null,
    branchLabel ? `Chi nhánh: ${branchLabel}` : null,
    devices ? `Thiết bị: ${devices}` : null,
    details.bookingFrom
      ? `Ngày nhận: ${formatOrderDateTime(details.bookingFrom)}`
      : null,
    details.bookingTo
      ? `Ngày trả: ${formatOrderDateTime(details.bookingTo)}`
      : null,
    details.total != null
      ? `Tổng tiền: ${Number(details.total).toLocaleString("vi-VN")} đ`
      : null,
  ].filter(Boolean);

  if (includeFooter) {
    lines.push("", SHOP_CONFIRM_FOOTER);
  }

  return lines.join("\n");
}

/** Danh sách hàng hiển thị UI — label / value / tuỳ chọn fullWidth, mono, highlight. */
export function buildOrderSummaryFields(details) {
  if (!details) return [];

  const branchLabel =
    details.branchLabel || getBranchLabelFromId(details.branchId);
  const devices = formatDevicesLine(details);

  const fields = [];

  if (details.orderCode != null && details.orderCode !== "") {
    fields.push({
      id: "payos",
      label: "Mã thanh toán (PayOS)",
      value: String(details.orderCode),
      mono: true,
      highlight: true,
    });
  }

  if (details.orderIdNew) {
    fields.push({
      id: "orderId",
      label: "Mã đơn hàng",
      value: details.orderIdNew,
      mono: true,
      fullWidth: true,
    });
  }

  if (details.refFallback && !details.orderCode && !details.orderIdNew) {
    fields.push({
      id: "ref",
      label: "Mã tham chiếu",
      value: details.refFallback,
      fullWidth: true,
    });
  }

  if (details.customerName) {
    fields.push({
      id: "customer",
      label: "Khách hàng",
      value: details.customerName,
    });
  }

  if (branchLabel) {
    fields.push({
      id: "branch",
      label: "Chi nhánh",
      value: branchLabel,
    });
  }

  if (devices) {
    fields.push({
      id: "devices",
      label: "Thiết bị",
      value: devices,
      fullWidth: true,
    });
  }

  if (details.bookingFrom) {
    fields.push({
      id: "from",
      label: "Ngày nhận",
      value: formatOrderDateTime(details.bookingFrom),
    });
  }

  if (details.bookingTo) {
    fields.push({
      id: "to",
      label: "Ngày trả",
      value: formatOrderDateTime(details.bookingTo),
    });
  }

  if (details.total != null) {
    fields.push({
      id: "total",
      label: "Tổng tiền",
      value: `${Number(details.total).toLocaleString("vi-VN")} đ`,
      highlight: true,
      fullWidth: !details.bookingFrom || !details.bookingTo,
    });
  }

  return fields;
}

export { SHOP_CONFIRM_FOOTER };
