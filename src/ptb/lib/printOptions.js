/** Encode / parse print options stored on PtbPrintRequest.note */

export function buildPtbPrintNote({
  printBw = false,
  printNoCrop = false,
  extra = "",
} = {}) {
  const tags = [];
  if (printBw) tags.push("In trắng đen");
  if (printNoCrop) tags.push("In không cắt");
  const tagPart = tags.join(" · ");
  const extraPart = String(extra || "").trim();
  if (tagPart && extraPart) return `${tagPart} | ${extraPart}`;
  return tagPart || extraPart || undefined;
}

export function parsePtbPrintOptions(note = "") {
  const n = String(note || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return {
    printBw: /trang den|\[bw\]|\bbw\b/.test(n),
    printNoCrop: /khong cat|\[no[_-]?crop\]|nocrop/.test(n),
  };
}
