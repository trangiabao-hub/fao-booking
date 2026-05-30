import React from "react";
import { motion } from "framer-motion";
import {
  LinkIcon,
  ShareIcon,
  ClipboardDocumentIcon,
  UserGroupIcon,
  QrCodeIcon,
} from "@heroicons/react/24/solid";
import { buildRoomShareUrl } from "../utils";
import { ptbBtnGradient, ptbCard } from "../theme";

/** Panel chia sẻ link album — dùng chung chủ phòng & phòng nhóm */
export default function AlbumSharePanel({ shareToken, title, variant = "card" }) {
  const shareUrl = buildRoomShareUrl(shareToken);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const handleShare = async () => {
    const text = `Vào album photobooth cùng mình nhé! 📸\n${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "Album photobooth FAO", text, url: shareUrl });
        return;
      } catch {
        /* fallback */
      }
    }
    handleCopy();
  };

  const isSidebar = variant === "sidebar";
  const isBanner = variant === "banner";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden ${ptbCard} ${
        isSidebar ? "rounded-3xl" : isBanner ? "rounded-2xl lg:rounded-3xl" : ""
      }`}
    >
      <div
        className={`flex items-center gap-3 border-b border-pink-50 ${
          isSidebar
            ? "px-5 py-4 bg-pink-50/50"
            : "px-4 py-3.5 bg-gradient-to-r from-pink-50 to-[#FFF8FB]"
        }`}
      >
        <span
          className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#E85C9C] to-[#FF9FCA] text-white shrink-0 ${
            isSidebar ? "w-11 h-11" : "w-9 h-9"
          }`}
        >
          <UserGroupIcon className={isSidebar ? "w-5 h-5" : "w-4 h-4"} />
        </span>
        <div className="min-w-0">
          <p className={`font-bold text-slate-800 ${isSidebar ? "text-base" : "text-sm"}`}>
            Mời vào album
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isSidebar
              ? "Gửi link — ai cũng tạo & xem ảnh realtime"
              : "Chia sẻ link cho bạn bè"}
          </p>
        </div>
      </div>

      <div className={`space-y-3 ${isSidebar ? "p-5" : "p-4"}`}>
        <div className="flex items-start gap-2 rounded-2xl bg-pink-50/60 border border-pink-100 px-3 py-2.5">
          <LinkIcon className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs text-slate-600 font-mono break-all leading-relaxed flex-1">
            {shareUrl}
          </p>
        </div>

        <div className={`flex gap-2 ${isSidebar ? "flex-col sm:flex-row lg:flex-col" : ""}`}>
          <button
            type="button"
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border border-pink-100 bg-white font-semibold text-slate-700 hover:bg-pink-50 transition-colors touch-manipulation ${
              isSidebar ? "py-3.5 text-sm min-h-[48px]" : "py-3 text-sm min-h-[44px]"
            }`}
          >
            <ClipboardDocumentIcon className="w-4 h-4 text-pink-500" />
            {copied ? "Đã copy!" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className={`flex-1 flex items-center justify-center gap-2 rounded-2xl ${ptbBtnGradient} ${
              isSidebar ? "py-3.5 text-sm min-h-[48px]" : "py-3 text-sm min-h-[44px]"
            }`}
          >
            <ShareIcon className="w-4 h-4" />
            Chia sẻ
          </button>
        </div>

        {isSidebar && (
          <p className="flex items-center gap-2 text-[10px] text-slate-400 pt-1">
            <QrCodeIcon className="w-3.5 h-3.5" />
            Quét link hoặc gửi qua Zalo / Messenger
          </p>
        )}
      </div>
    </motion.div>
  );
}
