import api from "../config/axios";
import { normalizeDevicesListResponse } from "./deviceBranch";

/**
 * API trả link ảnh dạng `http://` và host này 301 sang https — nâng sẵn để
 * tránh một vòng redirect và tránh bị chặn mixed-content khi web chạy https.
 * Bỏ qua API chạy local vì thường không có chứng chỉ.
 */
function toSecureImageUrl(url) {
  if (!url || !url.startsWith("http://")) return url || null;
  const host = url.slice(7).split("/")[0];
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(host)) return url;
  return `https://${url.slice(7)}`;
}

/**
 * `GET /v1/devices/{id}` không trả `images` (BE chỉ hydrate ảnh ở endpoint danh
 * sách), nên muốn hiện ảnh máy trong đơn phải tải danh sách rồi map theo id.
 * Máy lẻ chưa có ảnh thì mượn ảnh máy (1) cùng modelKey — giống catalog.
 */
export async function fetchDeviceDisplayMap() {
  const byId = new Map();
  try {
    const res = await api.get("v1/devices", {
      params: { type: "DEVICE", includeFeedbackImages: false },
    });
    const list = normalizeDevicesListResponse(res.data);
    const modelKeyOf = (device) =>
      (device?.modelKey || "").trim() ||
      (device?.name || "").trim().toLowerCase();

    const imageByModel = new Map();
    const byUnitAsc = [...list].sort(
      (a, b) => (a.unitNo ?? 999) - (b.unitNo ?? 999),
    );
    for (const device of byUnitAsc) {
      const img = device?.images?.[0];
      const key = modelKeyOf(device);
      if (!img || !key || imageByModel.has(key)) continue;
      imageByModel.set(key, img);
    }

    for (const device of list) {
      byId.set(String(device.id), {
        name: device.name || null,
        img: toSecureImageUrl(
          device?.images?.[0] || imageByModel.get(modelKeyOf(device)),
        ),
      });
    }
  } catch (err) {
    console.warn("Không tải được ảnh thiết bị:", err);
  }
  return byId;
}
