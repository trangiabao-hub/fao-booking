import { getRedirectResult, signInWithPopup, signInWithRedirect } from "firebase/auth";

/**
 * Google từ chối OAuth trong WebView (403 disallowed_useragent): popup không mở,
 * redirect cũng không giữ được cookie/sessionStorage. Chỉ đăng nhập được trong Safari/Chrome.
 * Safari thường thì popup vẫn có thể mất "initial state" vì cookie firebaseapp.com bị chia vùng
 * — lúc đó chuyển sang redirect, state nằm ở IndexedDB của chính site.
 */

export const GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI =
  "Google không cho đăng nhập khi mở link trong Zalo, Facebook, Instagram hay Messenger. Hãy mở trang này bằng Safari hoặc Chrome, rồi đăng nhập ở đó. Phiên đăng nhập không dùng chung với app tin nhắn.";

export const GOOGLE_LOGIN_STORAGE_BLOCKED_HINT_VI =
  "Trình duyệt đang chặn cookie hoặc bộ nhớ nên Google không hoàn tất được đăng nhập. Hãy tắt chế độ riêng tư và thử lại bằng Safari hoặc Chrome.";

export const GOOGLE_LOGIN_IOS_STEPS_VI =
  "Trên iPhone: bấm nút ⋯ hoặc biểu tượng chia sẻ, chọn “Mở bằng Safari”. Nếu không thấy, sao chép link rồi dán vào Safari.";

export const GOOGLE_LOGIN_ANDROID_STEPS_VI =
  "Bấm “Mở Chrome”. Nếu vẫn nằm trong app, sao chép link rồi dán vào Chrome.";

const EMBEDDED_UA =
  /FBAN|FBAV|FB_IAB|FBIOS|FB4A|MessengerFor|Instagram|Barcelona|Threads|Line\/|Zalo|MicroMessenger|musical_ly|BytedanceWebview|TikTok|trill|Snapchat|Twitter|WhatsApp|Telegram|Viber|LinkedInApp|Pinterest|GSA\/|KAKAOTALK|NAVER/i;

export function isLikelyEmbeddedBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/; wv\)/i.test(ua)) return true;
  if (EMBEDDED_UA.test(ua)) return true;
  if (/iPhone|iPad|iPod/i.test(ua) && !isStandaloneMobileBrowser(ua)) return true;
  return false;
}

function isStandaloneMobileBrowser(ua) {
  if (/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|SamsungBrowser/i.test(ua)) return true;
  return /Version\/[\d.]+/i.test(ua) && /Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua);
}

export function isAndroidDevice() {
  return typeof navigator !== "undefined" && /android/i.test(navigator.userAgent || "");
}

export function tryOpenInSystemBrowser(url) {
  const href = url || (typeof window !== "undefined" ? window.location.href : "");
  if (!href || typeof window === "undefined") return false;
  try {
    const u = new URL(href);
    if (isAndroidDevice()) {
      const path = `${u.host}${u.pathname}${u.search}${u.hash}`;
      const scheme = u.protocol.replace(":", "") || "https";
      const fallback = encodeURIComponent(href);
      window.location.href = `intent://${path}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
      return true;
    }
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return false;
  } catch {
    return false;
  }
}

export async function copyPageUrlToClipboard(url) {
  const href = url || (typeof window !== "undefined" ? window.location.href : "");
  if (!href) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(href);
      return true;
    }
  } catch {
    /* WebView thường chặn Clipboard API */
  }
  try {
    const area = document.createElement("textarea");
    area.value = href;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export function resolveGoogleSignInError(error, fallback = "Đăng nhập Google thất bại.") {
  const code = error?.code;
  const raw = `${error?.message || ""} ${error?.customData?.message || ""}`;

  if (code === "auth/embedded-browser" || /disallowed_useragent|403:\s*disallowed/i.test(raw)) {
    return GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI;
  }
  if (code === "auth/popup-blocked" && isLikelyEmbeddedBrowser()) {
    return GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI;
  }
  if (
    code === "auth/web-storage-unsupported" ||
    code === "auth/missing-initial-state" ||
    /missing initial state/i.test(raw)
  ) {
    return isLikelyEmbeddedBrowser()
      ? GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI
      : GOOGLE_LOGIN_STORAGE_BLOCKED_HINT_VI;
  }
  if (code === "auth/popup-closed-by-user") {
    return "";
  }
  if (code === "auth/cancelled-popup-request") {
    return "";
  }
  if (code === "auth/popup-blocked") {
    return "Trình duyệt đã chặn cửa sổ đăng nhập. Cho phép popup, hoặc mở trang bằng Safari/Chrome rồi thử lại.";
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return error?.message || fallback;
}

/** null = đã chuyển sang redirect, trang sẽ tải lại. */
export async function signInWithGoogle(auth, provider) {
  if (isLikelyEmbeddedBrowser()) {
    const error = new Error(GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI);
    error.code = "auth/embedded-browser";
    throw error;
  }
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    const code = error?.code || "";
    const raw = `${error?.message || ""}`;
    const storageBroken =
      code === "auth/web-storage-unsupported" ||
      code === "auth/missing-initial-state" ||
      /missing initial state/i.test(raw);
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      throw error;
    }
    if (code === "auth/popup-blocked" || storageBroken) {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function consumeGoogleRedirect(auth) {
  if (typeof window === "undefined" || isLikelyEmbeddedBrowser()) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error) {
    console.warn("Google redirect không hoàn tất:", error);
    return null;
  }
}
