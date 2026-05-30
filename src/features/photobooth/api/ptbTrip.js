import api from "../../../config/axios";
import { getPtbSession } from "../ptbStorage";

export async function fetchCollectionByOrder(orderIdNew) {
  const res = await api.get(`/v1/ptb/trip/order/${encodeURIComponent(orderIdNew)}`);
  return res.data;
}

export async function fetchCollectionByBooking(bookingId) {
  const res = await api.get(`/v1/ptb/trip/booking/${encodeURIComponent(bookingId)}`);
  return res.data;
}

export async function fetchCollectionByToken(shareToken) {
  const res = await api.get(`/v1/ptb/trip/token/${encodeURIComponent(shareToken)}`);
  return res.data;
}

export async function joinRoom(shareToken, displayName) {
  const res = await api.post(
    `/v1/ptb/trip/token/${encodeURIComponent(shareToken)}/join`,
    { displayName: displayName || undefined }
  );
  return res.data;
}

export async function uploadPhotoboothImage(shareToken, file, { frameId, layoutType, sessionToken } = {}) {
  const token = sessionToken || getPtbSession(shareToken);
  if (!token) throw new Error("Cần tham gia album trước");

  const form = new FormData();
  form.append("file", file);
  if (frameId != null) form.append("frameId", String(frameId));
  if (layoutType) form.append("layoutType", layoutType);

  const res = await api.post(
    `/v1/ptb/trip/token/${encodeURIComponent(shareToken)}/images`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Ptb-Session": token,
      },
    }
  );
  return res.data;
}

export async function fetchPhotoBoothFrames() {
  const res = await api.get("/v1/photo-booth-frames");
  return Array.isArray(res.data) ? res.data : [];
}

/** Ensure user has session — join if needed */
export async function ensurePtbSession(shareToken, displayName) {
  const existing = getPtbSession(shareToken);
  if (existing) {
    try {
      const collection = await fetchCollectionByToken(shareToken);
      return { sessionToken: existing, collection, joined: false };
    } catch {
      /* re-join below */
    }
  }
  const joinRes = await joinRoom(shareToken, displayName);
  return {
    sessionToken: joinRes.participant?.sessionToken,
    collection: joinRes.collection,
    participant: joinRes.participant,
    joined: true,
  };
}
