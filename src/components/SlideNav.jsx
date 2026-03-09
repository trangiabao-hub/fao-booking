import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, House, ReceiptText, UserRound, Menu, X } from "lucide-react";
import api from "../config/axios";
import { loadCustomerSession, loadRecentOrder } from "../utils/storage";

function getMemberTier(point = 0) {
  const p = Number(point) || 0;
  if (p >= 1000) return { name: "Vàng", color: "text-amber-500" };
  if (p >= 300) return { name: "Bạc", color: "text-slate-500" };
  return { name: "Đồng", color: "text-orange-500" };
}

export default function SlideNav() {
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState(null);
  const location = useLocation();
  const MotionButton = motion.button;
  const MotionAside = motion.aside;

  const hasSession = !!loadCustomerSession()?.token;
  const recentOrder = loadRecentOrder();
  const orderLink = recentOrder?.orderIdNew
    ? `/order/${recentOrder.orderIdNew}`
    : recentOrder?.orderCode
      ? `/order/code/${recentOrder.orderCode}`
      : null;
  const tier = getMemberTier(account?.point);

  const navItems = [
    { id: "home", to: "/", label: "Home", icon: House },
    { id: "catalog", to: "/catalog", label: "Đặt lịch", icon: Camera },
    ...(hasSession
      ? [
          {
            id: "bookings",
            to: "/my-bookings",
            label: "Đơn hàng",
            icon: ReceiptText,
          },
        ]
      : []),
    { id: "account", to: "/account", label: "Tài khoản", icon: UserRound },
  ];

  useEffect(() => {
    if (!hasSession) return;
    api
      .get("/account")
      .then((res) => setAccount(res?.data || null))
      .catch(() => setAccount(null));
  }, [hasSession]);

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 z-[70] px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex h-16 md:h-20 w-full max-w-md md:max-w-5xl items-center justify-between rounded-2xl md:rounded-3xl border border-[#FFE4F0] bg-white/95 px-2 md:px-4 shadow-xl backdrop-blur">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.to === "/" && location.pathname === "/") ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            return (
              <div key={item.id} className="flex flex-1 items-center">
                <Link
                  to={item.to}
                  className={`flex w-full flex-col items-center justify-center gap-1 md:gap-1.5 rounded-xl md:rounded-2xl py-1.5 md:py-2 text-[10px] md:text-sm font-semibold transition ${
                    isActive
                      ? "bg-[#FFF1F8] text-[#E85C9C]"
                      : "text-[#777] hover:bg-[#f8f8f8]"
                  }`}
                >
                  <Icon size={16} className="md:w-[18px] md:h-[18px]" />
                  <span>{item.label}</span>
                </Link>
                {item.id === "bookings" && (
                  <div className="mx-1 h-6 w-px bg-[#eee] md:h-8" />
                )}
              </div>
            );
          })}
          {/* <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-1 flex min-w-[48px] md:min-w-[96px] flex-col items-center justify-center gap-1 md:gap-1.5 rounded-xl md:rounded-2xl py-1.5 md:py-2 text-[10px] md:text-sm font-semibold text-[#777] hover:bg-[#f8f8f8]"
          >
            <Menu size={16} className="md:w-[18px] md:h-[18px]" />
            <span>Menu</span>
          </button> */}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <MotionButton
              type="button"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] bg-black/40"
            />
            <MotionAside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 z-[90] mx-auto w-full max-w-md rounded-t-3xl border border-[#FFE4F0] bg-white p-4 pb-[max(20px,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-black uppercase tracking-wide text-[#222]">
                  Menu nhanh
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1 hover:bg-[#f7f7f7]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-[#FFE4F0] bg-[#FFF9FC] p-3">
                {hasSession ? (
                  <>
                    <div className="text-xs text-[#888]">Đã đăng nhập</div>
                    <div className="text-sm font-semibold text-[#222] mt-1">
                      {account?.fullName || account?.email || "Khách FAO"}
                    </div>
                    <div className="mt-1 text-xs text-[#666]">
                      Điểm:{" "}
                      <span className="font-semibold">
                        {account?.point || 0}
                      </span>{" "}
                      • Hạng{" "}
                      <span className={`font-semibold ${tier.color}`}>
                        {tier.name}
                      </span>
                    </div>
                    {account?.email && (
                      <div className="text-xs text-[#777] mt-1">
                        {account.email}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-[#666]">
                    Chưa đăng nhập, bạn vẫn có thể đặt đơn vãng lai.
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <Link
                  to="/"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg border border-[#eee] px-3 py-2 text-sm font-semibold text-[#333] hover:border-[#FF9FCA]"
                >
                  Trang chủ
                </Link>
                <Link
                  to="/catalog"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg border border-[#eee] px-3 py-2 text-sm font-semibold text-[#333] hover:border-[#FF9FCA]"
                >
                  Danh mục thiết bị
                </Link>
                {hasSession && (
                  <Link
                    to="/my-bookings"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg border border-[#eee] px-3 py-2 text-sm font-semibold text-[#333] hover:border-[#FF9FCA]"
                  >
                    Đơn của tôi
                  </Link>
                )}
                <Link
                  to="/account"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg border border-[#eee] px-3 py-2 text-sm font-semibold text-[#333] hover:border-[#FF9FCA]"
                >
                  Tài khoản
                </Link>
                {orderLink && (
                  <Link
                    to={orderLink}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg border border-[#FF9FCA]/50 bg-[#FFF1F8] px-3 py-2 text-sm font-semibold text-[#E85C9C]"
                  >
                    Đơn gần nhất
                  </Link>
                )}
              </div>
            </MotionAside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
