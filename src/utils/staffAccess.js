/**
 * Nhận diện tài khoản nội bộ — ẩn UI gửi catalog cho khách vãng lai / CUSTOMER.
 * Backend: vn.faodigital.demo.enums.Role
 */

/** Role được phép dùng công cụ gửi catalog cho khách. */
const INTERNAL_STAFF_ROLES = new Set(["ADMIN", "STAFF", "DESIGNER"]);

function normalizeRoleToken(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/^ROLE_/i, "");
}

function parseStaffEmailAllowlist() {
  const raw = import.meta.env.VITE_STAFF_EMAILS || "";
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isStaffAccount(account) {
  if (!account || typeof account !== "object") return false;

  const role = normalizeRoleToken(account.role);
  if (role && INTERNAL_STAFF_ROLES.has(role)) {
    return true;
  }

  const email = String(account.email || account.gmail || "")
    .trim()
    .toLowerCase();
  if (!email) return false;

  const allowlist = parseStaffEmailAllowlist();
  return allowlist.length > 0 && allowlist.includes(email);
}
