/**
 * Trang mẫu hợp đồng trên cùng host (fao-booking route /hop-dong-thue-chuan).
 */
export function getFaoStandardRentalContractUrl() {
  if (typeof window === "undefined") {
    return "/hop-dong-thue-chuan";
  }
  return `${window.location.origin}/hop-dong-thue-chuan`;
}
