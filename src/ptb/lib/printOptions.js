/** Encode / parse print options stored on PtbPrintRequest.note */

export function buildPtbPrintNote({
  printBw = false,
  printNoCrop = false,
  bwBaked = false,
  extra = "",
} = {}) {
  const tags = [];
  if (printBw) tags.push(bwBaked ? "In trắng đen [BW] [BW_BAKED]" : "In trắng đen [BW]");
  if (printNoCrop) tags.push("In không cắt [NO_CROP]");
  const tagPart = tags.join(" · ");
  const extraPart = String(extra || "").trim();
  if (tagPart && extraPart) return `${tagPart} | ${extraPart}`;
  return tagPart || extraPart || undefined;
}

export function parsePtbPrintOptions(note = "") {
  const raw = String(note || "");
  /** Client đã bake grade vào pixel — agent grade lần nữa sẽ mất tone ấm. */
  const bwBaked = /\[bw_baked\]/i.test(raw);
  if (/\[bw\]/i.test(raw) || /\[no[_-]?crop\]/i.test(raw) || bwBaked) {
    return {
      printBw: /\[bw\]/i.test(raw) || bwBaked,
      printNoCrop: /\[no[_-]?crop\]/i.test(raw),
      bwBaked,
    };
  }
  const n = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\u0110/g, "d");
  return {
    printBw: /trang\s*den|\bbw\b/.test(n),
    printNoCrop: /khong\s*cat|nocrop/.test(n),
    bwBaked: false,
  };
}
