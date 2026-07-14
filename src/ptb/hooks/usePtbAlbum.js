import { useCallback, useEffect, useState } from "react";
import {
  ensureSession,
  fetchAlbumByToken,
  getStoredSession,
  joinAlbum,
  listPrintRequests,
  submitPrintRequest,
  uploadStripImage,
} from "../api/ptbApi";
import { PTB_EVENTS, trackPtbEvent } from "../lib/ptbAnalytics";

export function usePtbAlbum(shareToken) {
  const [album, setAlbum] = useState(null);
  const [sessionToken, setSessionToken] = useState("");
  const [printRequests, setPrintRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);

  const refresh = useCallback(async () => {
    if (!shareToken) return;
    setError("");
    try {
      const data = await fetchAlbumByToken(shareToken);
      setAlbum(data);
      const prints = await listPrintRequests(shareToken);
      setPrintRequests(Array.isArray(prints) ? prints : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được album");
    }
  }, [shareToken]);

  const init = useCallback(
    async (displayName) => {
      if (!shareToken) return;
      setLoading(true);
      setError("");
      try {
        const { album: data, sessionToken: token } = await ensureSession(
          shareToken,
          displayName,
        );
        setAlbum(data);
        setSessionToken(token || getStoredSession(shareToken));
        trackPtbEvent(PTB_EVENTS.ALBUM_OPENED, { shareToken });
        const prints = await listPrintRequests(shareToken);
        setPrintRequests(Array.isArray(prints) ? prints : []);
      } catch (err) {
        setError(err?.response?.data?.message || "Không thể mở album");
      } finally {
        setLoading(false);
      }
    },
    [shareToken],
  );

  const handleJoin = useCallback(
    async (displayName) => {
      setJoining(true);
      try {
        const joined = await joinAlbum(shareToken, displayName);
        setSessionToken(joined.participant?.sessionToken || "");
        setAlbum(joined.collection);
      } catch (err) {
        setError(err?.response?.data?.message || "Không thể tham gia album");
      } finally {
        setJoining(false);
      }
    },
    [shareToken],
  );

  const uploadStrip = useCallback(
    async (blob, meta) => {
      const token = sessionToken || getStoredSession(shareToken);
      if (!token) throw new Error("Cần tham gia album trước");
      const image = await uploadStripImage(shareToken, token, blob, meta);
      trackPtbEvent(PTB_EVENTS.STRIP_CREATED, {
        shareToken,
        frameId: meta?.frameId,
        layoutType: meta?.layoutType,
      });
      await refresh();
      return image;
    },
    [shareToken, sessionToken, refresh],
  );

  const submitPrint = useCallback(
    async (body) => {
      const token = sessionToken || getStoredSession(shareToken);
      if (!token) throw new Error("Cần tham gia album trước");
      const result = await submitPrintRequest(shareToken, token, body);
      trackPtbEvent(PTB_EVENTS.PRINT_SUBMITTED, {
        shareToken,
        freeCount: result?.freeCount,
        paidCount: result?.paidCount,
      });
      if ((result?.paidCount ?? 0) > 0) {
        trackPtbEvent(PTB_EVENTS.PAID_PRINTS, {
          shareToken,
          subtotalVnd: result?.subtotalVnd,
        });
      }
      await refresh();
      return result;
    },
    [shareToken, sessionToken, refresh],
  );

  useEffect(() => {
    if (shareToken) {
      init();
    }
  }, [shareToken, init]);

  return {
    album,
    sessionToken,
    printRequests,
    loading,
    error,
    joining,
    refresh,
    init,
    handleJoin,
    uploadStrip,
    submitPrint,
    isReadonly: album?.status === "READONLY",
    freeRemaining: album?.freePrintRemaining ?? 0,
  };
}
