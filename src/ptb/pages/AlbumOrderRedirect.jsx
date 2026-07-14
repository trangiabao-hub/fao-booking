import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchAlbumByOrder } from "../api/ptbApi";

export default function AlbumOrderRedirect() {
  const { orderIdNew } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderIdNew) return;

    let cancelled = false;

    (async () => {
      try {
        const album = await fetchAlbumByOrder(orderIdNew);
        const token = album?.shareToken;
        if (!token) throw new Error("Album chưa sẵn sàng");
        if (!cancelled) {
          navigate(`/trip/${token}`, { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Không mở được album cho đơn này",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderIdNew, navigate]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-pink-50 p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-pink-50">
      <p className="text-sm text-slate-600">Đang mở album chuyến đi…</p>
    </div>
  );
}
