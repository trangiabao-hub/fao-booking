import React, { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import SlideNav from "../../components/SlideNav";
import { auth, googleProvider } from "../../config/firebase";
import api from "../../config/axios";
import {
  clearCustomerSession,
  loadCustomerSession,
  saveCustomerSession,
} from "../../utils/storage";

function getMemberTier(point = 0) {
  const p = Number(point) || 0;

  if (p >= 1000) {
    return {
      key: "gold",
      name: "Vàng",
      emoji: "👑",
      cardClass:
        "border-amber-200 bg-[radial-gradient(circle_at_top_left,_#fff8db_0%,_#fff1b8_35%,_#f6d365_100%)] text-amber-950 shadow-[0_20px_50px_rgba(245,158,11,0.18)]",
      badgeClass:
        "border-amber-300/70 bg-white/55 text-amber-900 backdrop-blur",
      pointCardClass:
        "border-white/50 bg-white/35 text-amber-950 backdrop-blur",
      accentClass: "bg-amber-900/80",
      ringClass: "border-white/40",
    };
  }

  if (p >= 300) {
    return {
      key: "silver",
      name: "Bạc",
      emoji: "✦",
      cardClass:
        "border-slate-200 bg-[radial-gradient(circle_at_top_left,_#ffffff_0%,_#eef2f7_35%,_#cfd8e3_100%)] text-slate-900 shadow-[0_20px_50px_rgba(100,116,139,0.16)]",
      badgeClass:
        "border-slate-300/70 bg-white/55 text-slate-800 backdrop-blur",
      pointCardClass:
        "border-white/50 bg-white/35 text-slate-900 backdrop-blur",
      accentClass: "bg-slate-800/80",
      ringClass: "border-white/50",
    };
  }

  return {
    key: "bronze",
    name: "Đồng",
    emoji: "◆",
    cardClass:
      "border-orange-200 bg-[radial-gradient(circle_at_top_left,_#fff7f2_0%,_#fde2d1_35%,_#e6b17e_100%)] text-orange-950 shadow-[0_20px_50px_rgba(180,83,9,0.16)]",
    badgeClass:
      "border-orange-300/70 bg-white/55 text-orange-900 backdrop-blur",
    pointCardClass: "border-white/50 bg-white/35 text-orange-950 backdrop-blur",
    accentClass: "bg-orange-900/75",
    ringClass: "border-white/40",
  };
}

export default function AccountPage() {
  const [hasSession, setHasSession] = useState(
    () => !!loadCustomerSession()?.token,
  );
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");

  const tier = getMemberTier(account?.point);

  const fetchAccount = async () => {
    try {
      setError("");
      const res = await api.get("/account");
      setAccount(res?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được tài khoản.");
    }
  };

  useEffect(() => {
    if (!hasSession) return;
    fetchAccount();
  }, [hasSession]);

  const handleGoogleLogin = async () => {
    setIsLoginLoading(true);
    setError("");

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const response = await api.post("/login-gg", {
        email: user?.email,
        name: user?.displayName,
        avatar: user?.photoURL,
      });

      const token = response?.data?.token;
      if (!token) throw new Error("Không nhận được token.");

      saveCustomerSession({ token });
      setHasSession(true);
      await fetchAccount();
    } catch (err) {
      setError(err?.response?.data?.message || "Đăng nhập Google thất bại.");
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = () => {
    clearCustomerSession();
    setHasSession(false);
    setAccount(null);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8fb_0%,_#fdf1f7_35%,_#f8efe8_100%)] px-4 py-6 pb-32 md:pb-36">
      <SlideNav />

      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_50px_rgba(31,31,31,0.06)] backdrop-blur">
          <div className="inline-flex rounded-full border border-[#f3d7e6] bg-[#fff5fa] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d85b97]">
            Membership
          </div>

          <h1 className="mt-3 text-2xl font-black uppercase tracking-wide text-[#1f1f1f] md:text-3xl">
            Tài khoản thành viên
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#6f6f75]">
            Xem hạng thành viên và tổng điểm tích lũy của bạn.
          </p>
        </div>

        {!hasSession && (
          <div className="rounded-[28px] border border-white/70 bg-white/85 p-6 shadow-[0_16px_40px_rgba(31,31,31,0.05)] backdrop-blur">
            <div className="max-w-md">
              <div className="text-lg font-black text-[#222]">
                Đăng nhập để xem hạng thành viên
              </div>
              <p className="mt-2 text-sm text-[#777]">
                Kết nối tài khoản khách để hiển thị hạng và điểm thành viên của
                bạn.
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoginLoading}
              className="mt-5 rounded-2xl bg-[#1f1f1f] px-5 py-3 text-sm font-black uppercase tracking-wide text-[#ffb2d2] transition hover:opacity-95 disabled:opacity-50"
            >
              {isLoginLoading ? "Đang đăng nhập..." : "Đăng nhập Google"}
            </button>
          </div>
        )}

        {hasSession && (
          <div
            className={`relative overflow-hidden rounded-[32px] border p-6 md:p-7 ${tier.cardClass}`}
          >
            <div className="absolute right-[-30px] top-[-30px] h-36 w-36 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute bottom-[-40px] left-[-30px] h-40 w-40 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-75">
                    FAO MEMBER
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${tier.ringClass} bg-white/20 text-2xl shadow-sm backdrop-blur`}
                    >
                      {tier.emoji}
                    </div>
                    <div>
                      <div className="text-sm font-medium opacity-80">
                        Hạng thành viên
                      </div>
                      <div className="text-3xl font-black tracking-wide">
                        {tier.name}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-2xl border border-white/35 bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/30"
                >
                  Đăng xuất
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div
                  className={`rounded-3xl border px-4 py-4 ${tier.badgeClass}`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">
                    Membership Tier
                  </div>
                  <div className="mt-2 text-xl font-black">
                    {tier.emoji} Hạng {tier.name}
                  </div>
                </div>

                <div
                  className={`rounded-3xl border px-4 py-4 ${tier.pointCardClass}`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-75">
                    Member Points
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-3xl font-black">
                      {Number(account?.point || 0).toLocaleString("vi-VN")}
                    </span>
                    <span className="pb-1 text-sm font-semibold opacity-80">
                      điểm
                    </span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-full bg-white/20">
                <div
                  className={`h-1.5 w-2/3 rounded-full ${tier.accentClass}`}
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
