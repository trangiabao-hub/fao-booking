// Infer brand from device name
export function inferBrand(name = "") {
  const n = name.toUpperCase();
  if (n.includes("FUJIFILM") || n.includes("FUJI")) return "fuji";
  if (n.includes("CANON")) return "canon";
  if (n.includes("SONY")) return "sony";
  if (
    n.includes("POCKET") ||
    n.includes("GOPRO") ||
    n.includes("DJI") ||
    n.includes("INSTA360")
  )
    return "pocket";
  return "other";
}

/**
 * Danh mục chỉ ống kính / flash / phụ kiện quang học — không được dùng fallback
 * “mọi máy Canon/Fuji…” (tránh body máy lọt vào tab Len).
 */
export function categoryLabelSuggestsLensFlashOrAccessoryLine(label = "") {
  const n = String(label).toUpperCase();
  return (
    /\bLEN\b/.test(n) ||
    n.includes("LENS") ||
    n.includes("FLASH") ||
    n.includes("ỐNG") ||
    n.includes("KÍNH") ||
    n.includes("SPEEDLITE") ||
    n.includes("STROBE") ||
    n.includes("SOFTBOX")
  );
}

/**
 * Gợn thương hiệu từ tên tab danh mục API (CHỮ HOA).
 * Dùng làm fallback lọc/tab chỉ khi danh mục **chưa có item CMS** (xem catalogFilters).
 * Không áp dụng cho danh mục Len/Flash (vd "LEN + FLASH CANON") → luôn null.
 */
export function inferBrandHintFromCategoryLabel(label = "") {
  if (categoryLabelSuggestsLensFlashOrAccessoryLine(label)) return null;
  const n = String(label).toUpperCase();
  if (n.includes("FUJI") || n.includes("FUJIFILM")) return "fuji";
  if (n.includes("CANON")) return "canon";
  if (n.includes("SONY")) return "sony";
  if (
    n.includes("POCKET") ||
    n.includes("GOPRO") ||
    n.includes("DJI") ||
    n.includes("INSTA360") ||
    n.includes("ACTION")
  )
    return "pocket";
  return null;
}

// Normalize device name
export function normalizeDeviceName(name = "") {
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

/**
 * Khóa gộp model để khớp category / đại diện CMS — không phụ thuộc một field duy nhất.
 * So khớp case-insensitive; thêm cả tên đã chuẩn hoá vì máy có thể chỉ trùng tên mà khác chuỗi modelKey.
 */
export function addDeviceCategoryGroupKeys(device, intoSet) {
  if (!device || !intoSet) return;
  if (String(device.type || "").toUpperCase() !== "DEVICE") return;
  const mk = String(device.modelKey || "").trim().toLowerCase();
  if (mk) intoSet.add(mk);
  const nn = normalizeDeviceName(device.name || "").toLowerCase();
  if (nn) intoSet.add(nn);
}

export function categoryGroupKeysFromItemDeviceIds(deviceIds, deviceById) {
  const keys = new Set();
  if (!deviceIds || !deviceById) return keys;
  for (const nid of deviceIds) {
    const dev = deviceById.get(String(nid));
    if (dev) addDeviceCategoryGroupKeys(dev, keys);
  }
  return keys;
}

export function processedRowMatchesCategoryGroupKeys(d, groupKeys) {
  if (!groupKeys?.size) return false;
  const mk = String(d.modelKey || "").trim().toLowerCase();
  if (mk && groupKeys.has(mk)) return true;
  const dn = normalizeDeviceName(d.displayName || "").toLowerCase();
  if (dn && groupKeys.has(dn)) return true;
  return false;
}

export function physicalDeviceMatchesCategoryGroupKeys(device, groupKeys) {
  if (!device || !groupKeys?.size) return false;
  if (String(device.type || "").toUpperCase() !== "DEVICE") return false;
  const mk = String(device.modelKey || "").trim().toLowerCase();
  if (mk && groupKeys.has(mk)) return true;
  const nn = normalizeDeviceName(device.name || "").toLowerCase();
  if (nn && groupKeys.has(nn)) return true;
  return false;
}

export function getDeviceNameIndex(name = "") {
  const match = String(name).match(/\((\d+)\)\s*$/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]);
}

/** Chuẩn hoá id máy để khớp danh mục API (luôn string). */
export function normalizeCatalogDeviceId(id) {
  if (id === null || id === undefined || id === "") return null;
  const s = String(id).trim();
  return s || null;
}

/**
 * Id máy trên item danh mục API — một số payload chỉ có device.id lồng nhau, không có deviceId.
 * @see feedback/index.jsx (cùng endpoint v1/device-categories/with-items)
 */
export function categoryItemDeviceId(item) {
  if (!item) return null;
  const raw = item.deviceId ?? item.device?.id;
  return normalizeCatalogDeviceId(raw);
}

/** Máy vật lý cùng model (đúng thứ tự ưu tiên như catalog) — dùng trong modal để đặt nhiều máy cùng mã. */
export function buildModelGroupDevicesForModal(modelRow, rawDevices, deviceBookingsById) {
  if (!modelRow?.groupDeviceIds?.size) return [];
  const idSet = new Set(
    [...modelRow.groupDeviceIds].map((id) => String(id)),
  );
  const list = [];
  for (const d of rawDevices) {
    if (String(d.type || "").toUpperCase() !== "DEVICE") continue;
    if (!idSet.has(String(d.id))) continue;
    const bookingDtos = deviceBookingsById[d.id] || [];
    list.push({ ...d, bookingDtos });
  }
  list.sort((a, b) => {
    const indexA = getDeviceNameIndex(a.name);
    const indexB = getDeviceNameIndex(b.name);
    if (indexA !== indexB) return indexA - indexB;
    const orderA = a.orderNumber ?? Number.POSITIVE_INFINITY;
    const orderB = b.orderNumber ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.id).localeCompare(String(b.id));
  });
  return list;
}

export function getMaxQtyForCartLine(deviceRow, availabilityConfirmed) {
  if (!deviceRow) return 0;
  if (!availabilityConfirmed) {
    return Math.max(1, deviceRow.unitCount || 1);
  }
  if (deviceRow.isAvailable === false || deviceRow.blockedBeforeRelease) {
    return 0;
  }
  return Math.max(0, deviceRow.availableCount ?? 0);
}

/**
 * @returns {{ ok: true, devices: object[] } | { ok: false, modelKey?: string }}
 */
export function expandCartLinesToPhysicalDevices(
  cartLines,
  processedDevices,
  rawDevices,
  deviceBookingsById,
) {
  const processedByKey = new Map(
    processedDevices.map((d) => [d.modelKey, d]),
  );
  const out = [];
  const usedPhysicalIds = new Set();
  const isBusy = (d) =>
    Array.isArray(d?.bookingDtos) && d.bookingDtos.length > 0;
  for (const line of cartLines) {
    const row = processedByKey.get(line.modelKey);
    if (!row) {
      return { ok: false, modelKey: line.modelKey };
    }
    const members = buildModelGroupDevicesForModal(
      row,
      rawDevices,
      deviceBookingsById,
    );
    const free = members.filter(
      (d) => !isBusy(d) && !usedPhysicalIds.has(d.id),
    );
    const pick = free.slice(0, line.quantity);
    if (pick.length < line.quantity) {
      return { ok: false, modelKey: line.modelKey };
    }
    pick.forEach((d) => usedPhysicalIds.add(d.id));
    out.push(...pick);
  }
  return { ok: true, devices: out };
}
