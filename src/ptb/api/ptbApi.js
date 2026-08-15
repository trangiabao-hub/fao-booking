import api from "../../config/axios";

const SESSION_PREFIX = "ptb-session-";

export function getStoredSession(shareToken) {
  try {
    return localStorage.getItem(`${SESSION_PREFIX}${shareToken}`) || "";
  } catch {
    return "";
  }
}

export function storeSession(shareToken, sessionToken) {
  try {
    localStorage.setItem(`${SESSION_PREFIX}${shareToken}`, sessionToken);
  } catch {
    /* ignore */
  }
}

export async function fetchAlbumByOrder(orderIdNew) {
  const res = await api.get(`/v1/ptb/trip/order/${encodeURIComponent(orderIdNew)}`);
  return res.data;
}

export async function fetchAlbumByToken(shareToken) {
  const res = await api.get(`/v1/ptb/trip/token/${encodeURIComponent(shareToken)}`);
  return res.data;
}

export async function joinAlbum(shareToken, displayName) {
  const res = await api.post(
    `/v1/ptb/trip/token/${encodeURIComponent(shareToken)}/join`,
    { displayName: displayName || "Khách" },
  );
  const sessionToken = res.data?.participant?.sessionToken;
  if (sessionToken) {
    storeSession(shareToken, sessionToken);
  }
  return res.data;
}

export async function ensureSession(shareToken, displayName) {
  const existing = getStoredSession(shareToken);
  if (existing) {
    try {
      const album = await fetchAlbumByToken(shareToken);
      return { album, sessionToken: existing };
    } catch {
      /* re-join */
    }
  }
  const joined = await joinAlbum(shareToken, displayName);
  return {
    album: joined.collection,
    sessionToken: joined.participant?.sessionToken,
  };
}

export async function uploadStripImage(shareToken, sessionToken, blob, { frameId, layoutType }) {
  const form = new FormData();
  const ext = blob?.type === "image/jpeg" ? "jpg" : "png";
  form.append("file", blob, `strip-${Date.now()}.${ext}`);
  if (frameId != null) form.append("frameId", String(frameId));
  if (layoutType) form.append("layoutType", layoutType);

  // Do not set Content-Type manually — browser must add multipart boundary.
  // Upload timeout is longer than the global 15s axios default (large PNG/JPEG strips).
  const res = await api.post(
    `/v1/ptb/trip/token/${encodeURIComponent(shareToken)}/images`,
    form,
    {
      headers: {
        "X-Ptb-Session": sessionToken,
      },
      timeout: 120000,
    },
  );
  return res.data;
}

export async function submitPrintRequest(shareToken, sessionToken, body) {
  const res = await api.post(
    `/v1/ptb/trip/token/${encodeURIComponent(shareToken)}/print`,
    body,
    { headers: { "X-Ptb-Session": sessionToken } },
  );
  return res.data;
}

export async function listPrintRequests(shareToken) {
  const res = await api.get(`/v1/ptb/trip/token/${encodeURIComponent(shareToken)}/print`);
  return res.data;
}

export async function fetchFrames() {
  const res = await api.get("/v1/photo-booth-frames");
  return Array.isArray(res.data) ? res.data : [];
}
