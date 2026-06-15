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
