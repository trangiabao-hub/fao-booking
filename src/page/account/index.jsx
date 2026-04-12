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
import { computeTotalSpentFromBookings } from "../../utils/loyaltyEarn";

function getMemberTier(totalSpent = 0) {
  const spent = Number(totalSpent) || 0;

  if (spent > 3000000) {
    return {
      key: "vip",
      name: "Thành viên VIP",
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

  if (spent >= 1000000) {
    return {
      key: "silver",
      name: "Thành viên bạc",
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
    key: "member",
    name: "Thành viên",
    emoji: "✨",
    cardClass:
      "border-rose-200 bg-[radial-gradient(circle_at_top_left,_#fff7fb_0%,_#ffe7f2_35%,_#fbcfe8_100%)] text-rose-950 shadow-[0_20px_50px_rgba(225,29,72,0.14)]",
    badgeClass: "border-rose-300/70 bg-white/55 text-rose-900 backdrop-blur",
    pointCardClass: "border-white/50 bg-white/35 text-rose-950 backdrop-blur",
    accentClass: "bg-rose-900/75",
    ringClass: "border-white/40",
  };
}

function getTierProgressMeta(totalSpent = 0) {
  const spent = Math.max(0, Number(totalSpent) || 0);

  if (spent > 3000000) {
    return {
      progressPercent: 100,
      message: "Bạn đang ở hạng VIP - ưu đãi cao nhất hiện tại.",
    };
  }

  if (spent >= 1000000) {
    const lower = 1000000;
    const upper = 3000000;
    const progressPercent = Math.min(
      100,
      Math.max(0, ((spent - lower) / (upper - lower)) * 100),
    );
    const remaining = Math.max(0, upper - spent);
    return {
      progressPercent,
      message: `Chỉ còn ${remaining.toLocaleString(
        "vi-VN",
      )}đ nữa bạn sẽ lên thành viên VIP ưu đãi cao hơn.`,
    };
  }

  const progressPercent = Math.min(100, (spent / 1000000) * 100);
  const remaining = Math.max(0, 1000000 - spent);
  return {
    progressPercent,
    message: `Chỉ còn ${remaining.toLocaleString(
      "vi-VN",
    )}đ nữa bạn sẽ lên thành viên bạc ưu đãi cao hơn.`,
  };
}

export default function AccountPage() {
  const [hasSession, setHasSession] = useState(
    () => !!loadCustomerSession()?.token,
  );
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");
  const [totalSpent, setTotalSpent] = useState(0);
  const memberPoint = Number(account?.point || 0);
  const redeemValue = memberPoint * 1000;
  const cardholderName = (account?.fullName || "FAO MEMBER")
    .toUpperCase()
    .slice(0, 32);
  const memberCardCode = `FAO ${String(account?.id || 0).padStart(
    4,
    "0",
  )} ${String(Math.max(0, memberPoint)).slice(-4).padStart(4, "0")}`;

  const tier = getMemberTier(totalSpent);
  const tierProgress = getTierProgressMeta(totalSpent);

  const fetchAccount = async () => {
    try {
      setError("");
      const res = await api.get("/account");
      setAccount(res?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Không tải được tài khoản.");
    }
  };

  const fetchTotalSpent = async () => {
    try {
      const res = await api.get("/v1/bookings/me");
      const bookings = Array.isArray(res?.data) ? res.data : [];
      setTotalSpent(computeTotalSpentFromBookings(bookings));
    } catch (err) {
      setTotalSpent(0);
    }
  };

  useEffect(() => {
    if (!hasSession) return;
    fetchAccount();
    fetchTotalSpent();
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
      await fetchTotalSpent();
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
    setTotalSpent(0);
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
            Xem hạng thành viên theo chi tiêu và tổng điểm tích lũy của bạn.
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
          <>
            <div
              className={`relative overflow-hidden rounded-[32px] border p-6 md:p-7 ${tier.cardClass}`}
            >
              <div className="absolute right-[-30px] top-[-30px] h-36 w-36 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute bottom-[-40px] left-[-30px] h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -right-16 top-20 h-44 w-44 rounded-full border border-white/20" />
              <div className="absolute right-6 top-8 h-6 w-10 rounded-md border border-white/40 bg-white/30 backdrop-blur" />

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
                    <div className="mt-4 space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-70">
                        Card Holder
                      </div>
                      <div className="text-base md:text-lg font-black tracking-[0.08em]">
                        {cardholderName}
                      </div>
                      <div className="text-xs md:text-sm font-semibold tracking-[0.12em] opacity-80">
                        {memberCardCode}
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
                      Total Spending Tier
                    </div>
                    <div className="mt-2 text-xl font-black">
                      {tier.emoji} {tier.name}
                    </div>
                    <div className="mt-1 text-xs opacity-80">
                      Chi tiêu:{" "}
                      {Number(totalSpent || 0).toLocaleString("vi-VN")} đ
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
                        {memberPoint.toLocaleString("vi-VN")}
                      </span>
                      <span className="pb-1 text-sm font-semibold opacity-80">
                        điểm
                      </span>
                    </div>
                    <div className="mt-2 rounded-xl border border-[#f7bfd9] bg-[#fff1f8] px-3 py-2 text-xs font-semibold leading-5 text-[#b83372]">
                      {memberPoint === 0 ? (
                        <>Bạn có thể dùng điểm để trừ trực tiếp vào đơn hàng.</>
                      ) : (
                        <>
                          Quy đổi ngay:{" "}
                          <b>{memberPoint.toLocaleString("vi-VN")} điểm</b> ={" "}
                          <b>{redeemValue.toLocaleString("vi-VN")}đ</b> khi thuê
                          máy.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-full bg-white/20">
                  <div
                    className={`h-1.5 rounded-full ${tier.accentClass}`}
                    style={{ width: `${tierProgress.progressPercent}%` }}
                  />
                </div>
                <div className="text-xs md:text-sm opacity-85">
                  {tierProgress.message}
                </div>
              </div>
            </div>

            <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_14px_36px_rgba(31,31,31,0.05)] backdrop-blur">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d85b97]">
                User Profile
              </div>
              <h2 className="mt-2 text-xl font-black text-[#1f1f1f]">
                Thông tin người dùng
              </h2>
              <p className="mt-2 text-sm text-[#6f6f75]">
                Dữ liệu đang liên kết với tài khoản thành viên của bạn.
              </p>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[#f6dbe8] bg-[#fff7fb] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b67092]">
                    Họ tên
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#222]">
                    {account?.fullName || "Chưa cập nhật"}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#f6dbe8] bg-[#fff7fb] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b67092]">
                    Email
                  </div>
                  <div className="mt-1 break-all text-sm font-bold text-[#222]">
                    {account?.email || "Chưa cập nhật"}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#f6dbe8] bg-[#fff7fb] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b67092]">
                    Số điện thoại
                  </div>
                  <div className="mt-1 text-sm font-bold text-[#222]">
                    {account?.phone || "Chưa cập nhật"}
                  </div>
                </div>

                <div className="rounded-2xl border border-[#f6dbe8] bg-[#fff7fb] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b67092]">
                    Instagram / Facebook
                  </div>
                  <div className="mt-1 break-all text-sm font-bold text-[#222]">
                    {account?.ig || account?.fb || "Chưa cập nhật"}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_14px_36px_rgba(31,31,31,0.05)] backdrop-blur">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#d85b97]">
            Member Policy
          </div>
          <h2 className="mt-2 text-xl font-black text-[#1f1f1f]">
            Chính sách thành viên FAO Booking
          </h2>

          <div className="mt-4 space-y-3 text-sm leading-6 text-[#5f5f66]">
            <div className="rounded-2xl border border-[#f6dbe8] bg-[#fff7fb] p-4">
              <div className="font-bold text-[#c74886]">1) Voucher đơn đầu</div>
              <p>
                Thành viên được giảm trực tiếp <b>30%</b> trên đơn đặt đầu tiên
                tại FAO Booking, tối đa <b>200.000đ</b>. Voucher được áp dụng tự
                động tại bước thanh toán.
              </p>
            </div>

            <div className="rounded-2xl border border-[#f6dbe8] bg-[#fff7fb] p-4">
              <div className="font-bold text-[#c74886]">
                2) Phân hạng theo tổng chi tiêu
              </div>
              <p>
                Dưới <b>1.000.000đ</b>: <b>Thành viên</b>.<br />
                Từ <b>1.000.000đ đến 3.000.000đ</b>: <b>Thành viên bạc</b>.
                <br />
                Trên <b>3.000.000đ</b>: <b>Thành viên VIP</b>.
              </p>
            </div>

            <div className="rounded-2xl border border-[#f6dbe8] bg-[#fff7fb] p-4">
              <div className="font-bold text-[#c74886]">
                3) Cơ chế tích điểm theo cấp bậc hiện tại
              </div>
              <p>
                Thành viên: <b>50.000đ = 3 điểm</b>.<br />
                Thành viên bạc: <b>50.000đ = 4 điểm</b>.<br />
                Thành viên VIP: <b>50.000đ = 5 điểm</b>.
              </p>
              <p className="mt-2 text-xs text-[#8b5f75]">
                Hạng hiện tại của bạn: <b>{tier.name}</b>. Chênh lệch nhỏ giữa
                các hạng giúp khách có lý do quay lại, không đổi giá thuê hay
                quy đổi điểm (1 điểm = 1.000đ). Điểm được cộng sau khi đơn hoàn
                tất.
              </p>
            </div>

            <div className="rounded-2xl border border-[#f6dbe8] bg-[#fff7fb] p-4">
              <div className="font-bold text-[#c74886]">
                4) Dùng điểm để thanh toán
              </div>
              <p>
                <b>1 điểm = 1.000đ</b>, có thể trừ trực tiếp vào tổng tiền đơn
                hàng ở trang đặt lịch. Bạn có thể tự chọn số điểm muốn dùng
                trước khi thanh toán.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
