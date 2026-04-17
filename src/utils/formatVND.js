/** Định dạng VND dạng chấm nghìn (đồng bộ logic in hợp đồng FAO). */
export function formatVND(value) {
  if (value === null || value === undefined || value === "") return "0";
  const v = Math.round(Number(value));
  if (!Number.isFinite(v)) return "0";
  if (v === 0) return "0";
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  const withDots = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${withDots}`;
}
