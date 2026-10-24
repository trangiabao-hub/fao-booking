import { resolveShareOrigin } from "./catalogShareLink";

/** Link trang feedback đang xem (hãng + dòng máy hoặc cặp so sánh). */
export function buildFeedbackViewUrl({ category, model, compare = [] } = {}) {
  const params = new URLSearchParams();
  const pair = compare.filter(Boolean);
  if (pair.length) {
    for (const name of pair) params.append("compare", name);
  } else {
    if (category) params.set("category", category);
    if (model) params.set("model", model);
  }
  const qs = params.toString();
  return `${resolveShareOrigin()}/feedback${qs ? `?${qs}` : ""}`;
}

/**
 * Tin nhắn copy-paste cho Messenger / Zalo khi khách xin ảnh feedback của một hoặc nhiều máy.
 * @param {{label:string, url:string}[]} items — mỗi máy một link (nên là link ngắn)
 * @param {string} compareUrl — link so sánh cạnh nhau (chỉ khi đúng 2 máy)
 */
export function buildFeedbackShareMessage({ items = [], compareUrl = "" }) {
  const list = items.filter((i) => i?.label && i?.url);
  if (!list.length) return "";

  if (list.length === 1) {
    return [
      `Dạ em gửi ảnh feedback thực tế của ${list[0].label} ạ:`,
      list[0].url,
      "",
      "Ảnh do khách thuê chụp thật tại FAO, anh/chị xem rồi chọn máy ưng ý nhé ạ.",
    ].join("\n");
  }

  const lines = [
    `Dạ em gửi ảnh feedback thực tế của ${list.length} máy ạ:`,
    "",
    ...list.map((i) => `• ${i.label}: ${i.url}`),
  ];
  if (compareUrl) {
    lines.push("", `📸 Xem ${list.length} máy cạnh nhau để so sánh:`, compareUrl);
  }
  lines.push(
    "",
    "Ảnh do khách thuê chụp thật tại FAO, anh/chị xem rồi chọn máy ưng ý nhé ạ.",
  );
  return lines.join("\n");
}
