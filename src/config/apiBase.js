const envApiUrl = import.meta.env.VITE_API_URL || "";
const envWsUrl = import.meta.env.VITE_WS_URL || "";

const trimSlash = (value) => value.replace(/\/+$/, "");

/**
 * REST base URL for axios.
 * Dev uses Vite proxy (/api/) so browser calls stay same-origin.
 */
export function resolveApiBaseUrl() {
  if (import.meta.env.DEV) {
    return "/api/";
  }
  return envApiUrl || "/api/";
}

/** Origin phục vụ file tĩnh `/uploads/**` (không nằm dưới `/api`). */
export function resolveUploadOrigin() {
  const envApi = (import.meta.env.VITE_API_URL || "").trim();
  if (envApi) {
    return envApi.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return "https://api.faodigital.vn";
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://api.faodigital.vn";
}

/** SockJS/STOMP endpoint (proxied as /ws in dev). */
export function resolveWsEndpoint() {
  if (import.meta.env.DEV) {
    return "/ws";
  }

  const explicit = envWsUrl ? trimSlash(envWsUrl) : null;
  if (explicit) {
    return explicit.endsWith("/ws") ? explicit : `${explicit}/ws`;
  }

  const apiRoot = trimSlash(envApiUrl).replace(/\/api$/, "");
  return apiRoot ? `${apiRoot}/ws` : "/ws";
}
