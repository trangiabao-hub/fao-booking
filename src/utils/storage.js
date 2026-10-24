// Customer Info Storage Utilities
const STORAGE_KEY = "fao_customer_info";
const CUSTOMER_SESSION_KEY = "fao_customer_session";
const CUSTOMER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_ORDER_KEY = "fao_recent_order";

/**
 * Save customer info to localStorage
 * @param {Object} customer - { fullName, phone, gmail, ig, fb, birthDate }
 */
export function saveCustomerInfo(customer) {
  try {
    const data = {
      fullName: customer.fullName || "",
      phone: customer.phone || "",
      gmail: customer.gmail || "",
      ig: customer.ig || "",
      fb: customer.fb || "",
      birthDate: customer.birthDate || "",
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save customer info:", e);
  }
}

/**
 * Load customer info from localStorage
 * @returns {Object|null} - { fullName, phone, gmail, ig, fb } or null
 */
export function loadCustomerInfo() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    
    // Check if data is older than 30 days
    const savedAt = new Date(data.savedAt);
    const now = new Date();
    const daysDiff = (now - savedAt) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 30) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return {
      fullName: data.fullName || "",
      phone: data.phone || "",
      gmail: data.gmail || "",
      ig: data.ig || "",
      fb: data.fb || "",
      birthDate: data.birthDate || "",
    };
  } catch (e) {
    console.warn("Failed to load customer info:", e);
    return null;
  }
}

/**
 * Clear stored customer info
 */
export function clearCustomerInfo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear customer info:", e);
  }
}

export const SESSION_EVENT = "fao-session-changed";
const SESSION_COOKIE = "fao_customer_session";

function notifySession() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function writeSessionCookie(data) {
  if (typeof document === "undefined") return;
  const maxAge = Math.floor(CUSTOMER_SESSION_TTL_MS / 1000);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(data))}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function readSessionCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function validSession(data) {
  if (!data?.token) return null;
  const savedAt = new Date(data.savedAt);
  if (Number.isNaN(savedAt.getTime())) return null;
  if (Date.now() - savedAt.getTime() > CUSTOMER_SESSION_TTL_MS) return null;
  return { token: data.token };
}

export function saveCustomerSession(session) {
  const data = {
    token: session?.token || "",
    savedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(data));
    if (data.token) localStorage.setItem("token", JSON.stringify(data.token));
  } catch (e) {
    console.warn("Failed to save customer session:", e);
  }
  if (data.token) writeSessionCookie(data);
  else clearSessionCookie();
  notifySession();
}

export function loadCustomerSession() {
  try {
    const stored = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (stored) {
      const parsed = validSession(JSON.parse(stored));
      if (parsed) return parsed;
      localStorage.removeItem(CUSTOMER_SESSION_KEY);
      localStorage.removeItem("token");
    }
  } catch (e) {
    console.warn("Failed to load customer session:", e);
  }
  const fromCookie = validSession(readSessionCookie());
  if (!fromCookie) {
    clearSessionCookie();
    return null;
  }
  try {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify({ ...fromCookie, savedAt: new Date().toISOString() }));
    localStorage.setItem("token", JSON.stringify(fromCookie.token));
  } catch {
    /* cookie vẫn dùng được khi localStorage bị chặn */
  }
  return fromCookie;
}

export function clearCustomerSession() {
  try {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    localStorage.removeItem("token");
  } catch (e) {
    console.warn("Failed to clear customer session:", e);
  }
  clearSessionCookie();
  notifySession();
}

export function saveRecentOrder(payload) {
  try {
    const data = {
      orderCode: payload?.orderCode || null,
      orderIdNew: payload?.orderIdNew || null,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(RECENT_ORDER_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Failed to save recent order:", e);
  }
}

export function loadRecentOrder() {
  try {
    const stored = localStorage.getItem(RECENT_ORDER_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    if (!data?.orderCode && !data?.orderIdNew) return null;
    return data;
  } catch (e) {
    console.warn("Failed to load recent order:", e);
    return null;
  }
}

export function clearRecentOrder() {
  try {
    localStorage.removeItem(RECENT_ORDER_KEY);
  } catch (e) {
    console.warn("Failed to clear recent order:", e);
  }
}

// Booking preferences storage
const PREFS_KEY = "fao_booking_prefs";

/**
 * Save booking preferences (branch, duration preference)
 * @param {Object} prefs - { branchId, durationId }
 */
export function saveBookingPrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn("Failed to save booking prefs:", e);
  }
}

/**
 * Load booking preferences
 * @returns {Object|null}
 */
export function loadBookingPrefs() {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn("Failed to load booking prefs:", e);
    return null;
  }
}
