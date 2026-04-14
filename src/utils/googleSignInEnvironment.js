/**
 * Google OAuth blocks embedded in-app browsers (Zalo, Facebook, etc.) with 403 disallowed_useragent.
 * We detect likely WebViews and guide users to open the site in a full browser.
 */

export const GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI =
  "Google không cho đăng nhập khi bạn mở link từ Zalo, Facebook hoặc trình duyệt trong app. Hãy mở trang này bằng Chrome hoặc Safari (menu ⋮ / “Mở bằng…” → trình duyệt).";

export function isLikelyEmbeddedBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";

  if (/; wv\)/i.test(ua)) return true;

  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|Zalo|MicroMessenger|musical_ly|TikTok|Snapchat/i.test(
    ua,
  );
}

/**
 * Best-effort: open current URL in an external browser (Android intent; others window.open).
 */
export function tryOpenInSystemBrowser(url) {
  const href =
    url ||
    (typeof window !== "undefined" ? window.location.href : "") ||
    "";
  if (!href || typeof window === "undefined") return false;

  try {
    const u = new URL(href);
    const hostPathQueryHash =
      u.host + u.pathname + u.search + u.hash;
    const scheme = u.protocol.replace(":", "") || "https";

    if (/android/i.test(navigator.userAgent)) {
      window.location.href = `intent://${hostPathQueryHash}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
      return true;
    }

    window.open(href, "_blank", "noopener,noreferrer");
    return true;
  } catch {
    try {
      window.open(href, "_blank", "noopener,noreferrer");
      return true;
    } catch {
      return false;
    }
  }
}

export async function copyPageUrlToClipboard(url) {
  const href =
    url ||
    (typeof window !== "undefined" ? window.location.href : "") ||
    "";
  if (!href) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(href);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

export function resolveGoogleSignInError(error, fallback = "Đăng nhập Google thất bại.") {
  const code = error?.code;
  const raw = `${error?.message || ""} ${error?.customData?.message || ""}`;

  if (/disallowed_useragent|403:\s*disallowed/i.test(raw)) {
    return GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI;
  }
  if (code === "auth/popup-blocked" && isLikelyEmbeddedBrowser()) {
    return GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI;
  }
  if (code === "auth/popup-closed-by-user") {
    return "Đăng nhập đã bị hủy.";
  }
  if (code === "auth/cancelled-popup-request") {
    return fallback;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return error?.message || fallback;
}
