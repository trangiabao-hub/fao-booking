import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { BRANCHES } from "../data/bookingConstants";
import { normalizeBookingBranchId } from "./deviceBranch";
import { formatDevicesLine } from "./orderSummary";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Ho_Chi_Minh";

function branchMetaFromId(branchId) {
  const id = normalizeBookingBranchId(branchId);
  return BRANCHES.find((b) => b.id === id) || BRANCHES[0];
}

function escapeIcsText(text) {
  return String(text || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsLocal(dateStr) {
  return dayjs(dateStr).tz(TZ).format("YYYYMMDD[T]HHmmss");
}

function toIcsUtcStamp() {
  return dayjs().utc().format("YYYYMMDD[T]HHmmss[Z]");
}

function formatGCalDate(dateStr) {
  return new Date(dateStr).toISOString().replace(/-|:|\.\d{3}/g, "");
}

function eventEndIso(startStr, minutes = 30) {
  return dayjs(startStr).tz(TZ).add(minutes, "minute").toISOString();
}

function buildEventDescription(details) {
  return [
    details.orderIdNew ? `Mã đơn: ${details.orderIdNew}` : null,
    details.orderCode ? `PayOS: ${details.orderCode}` : null,
    formatDevicesLine(details) ? `Thiết bị: ${formatDevicesLine(details)}` : null,
    details.customerName ? `Khách: ${details.customerName}` : null,
    `Liên hệ shop: ${branchMetaFromId(details.branchId).phone || "0901355198"}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCalendarEvents(details) {
  const deviceLabel = formatDevicesLine(details) || "Thiết bị";
  const uidBase = details.orderIdNew || details.orderCode || "fao-order";

  return [
    {
      uid: `fao-pickup-${uidBase}@faocamera.vn`,
      summary: `Nhận máy FAO — ${deviceLabel}`,
      start: details.bookingFrom,
      end: eventEndIso(details.bookingFrom),
      alarmDesc: "Nhắc: còn 1 giờ nữa đến shop nhận máy",
    },
    {
      uid: `fao-return-${uidBase}@faocamera.vn`,
      summary: `Trả máy FAO — ${deviceLabel}`,
      start: details.bookingTo,
      end: eventEndIso(details.bookingTo),
      alarmDesc: "Nhắc: còn 1 giờ nữa đến shop trả máy",
    },
  ];
}

/** ICS gồm 2 sự kiện (nhận + trả), mỗi sự kiện nhắc trước 1 giờ. */
export function buildOrderCalendarIcs(details) {
  if (!details?.bookingFrom || !details?.bookingTo) return null;

  const branch = branchMetaFromId(details.branchId);
  const location = branch.calendarLocation || branch.address || "";
  const description = buildEventDescription(details);
  const events = buildCalendarEvents(details);

  const vtimezone = `BEGIN:VTIMEZONE
TZID:${TZ}
X-LIC-LOCATION:${TZ}
BEGIN:STANDARD
TZOFFSETFROM:+0700
TZOFFSETTO:+0700
TZNAME:+07
DTSTART:19700101T000000
END:STANDARD
END:VTIMEZONE`;

  const vevents = events
    .map(
      (ev) => `BEGIN:VEVENT
UID:${ev.uid}
DTSTAMP:${toIcsUtcStamp()}
DTSTART;TZID=${TZ}:${toIcsLocal(ev.start)}
DTEND;TZID=${TZ}:${toIcsLocal(ev.end)}
SUMMARY:${escapeIcsText(ev.summary)}
DESCRIPTION:${escapeIcsText(description)}
LOCATION:${escapeIcsText(location)}
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:${escapeIcsText(ev.alarmDesc)}
END:VALARM
END:VEVENT`,
    )
    .join("\n");

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FAO Camera//Booking Order//VI
CALSCALE:GREGORIAN
METHOD:PUBLISH
${vtimezone}
${vevents}
END:VCALENDAR`;
}

export function downloadOrderCalendarIcs(details) {
  const ics = buildOrderCalendarIcs(details);
  if (!ics) return false;

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const slug = details.orderIdNew?.slice(0, 8) || details.orderCode || "don";
  a.href = url;
  a.download = `fao-lich-nhan-tra-${slug}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

export function openGoogleCalendarEvent({ title, start, end, location, description }) {
  if (!start || !end) return;
  const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatGCalDate(start)}/${formatGCalDate(end)}&details=${encodeURIComponent(description || "")}&location=${encodeURIComponent(location || "")}`;
  window.open(url, "_blank");
}

export function openGoogleCalendarPickup(details) {
  if (!details?.bookingFrom) return;
  const branch = branchMetaFromId(details.branchId);
  const deviceLabel = formatDevicesLine(details) || "Thiết bị";
  openGoogleCalendarEvent({
    title: `Nhận máy FAO — ${deviceLabel}`,
    start: details.bookingFrom,
    end: eventEndIso(details.bookingFrom),
    location: branch.calendarLocation || branch.address,
    description: `${buildEventDescription(details)}\n\n(Nên đặt nhắc trước 1 giờ trong Google Calendar)`,
  });
}

export function openGoogleCalendarReturn(details) {
  if (!details?.bookingTo) return;
  const branch = branchMetaFromId(details.branchId);
  const deviceLabel = formatDevicesLine(details) || "Thiết bị";
  openGoogleCalendarEvent({
    title: `Trả máy FAO — ${deviceLabel}`,
    start: details.bookingTo,
    end: eventEndIso(details.bookingTo),
    location: branch.calendarLocation || branch.address,
    description: `${buildEventDescription(details)}\n\n(Nên đặt nhắc trước 1 giờ trong Google Calendar)`,
  });
}

export function getBranchMetaForOrder(branchId) {
  return branchMetaFromId(branchId);
}
