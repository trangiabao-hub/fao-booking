import React, { useState } from "react";
import {
  GOOGLE_LOGIN_ANDROID_STEPS_VI,
  GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI,
  GOOGLE_LOGIN_IOS_STEPS_VI,
  isAndroidDevice,
  isLikelyEmbeddedBrowser,
  tryOpenInSystemBrowser,
  copyPageUrlToClipboard,
} from "../utils/googleSignInEnvironment";

export default function EmbeddedBrowserGoogleHint({ className = "" }) {
  const [copyDone, setCopyDone] = useState(false);
  const [opened, setOpened] = useState(false);

  if (!isLikelyEmbeddedBrowser()) return null;

  const android = isAndroidDevice();

  const handleCopy = async () => {
    const ok = await copyPageUrlToClipboard();
    if (ok) {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2200);
    }
  };

  const handleOpen = async () => {
    const leftApp = tryOpenInSystemBrowser();
    setOpened(leftApp);
    if (!leftApp) await handleCopy();
  };

  return (
    <div
      role="note"
      className={`rounded-2xl border border-[#f3d7e6] bg-[#fff5fa] px-4 py-3 text-sm leading-relaxed text-[#5c3d4a] ${className}`}
    >
      <div className="font-bold text-[#b3447a]">Đăng nhập Google từ app tin nhắn</div>
      <p className="mt-2">{GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI}</p>
      <p className="mt-2">{android ? GOOGLE_LOGIN_ANDROID_STEPS_VI : GOOGLE_LOGIN_IOS_STEPS_VI}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleOpen}
          className="rounded-xl bg-[#1f1f1f] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#ffb2d2]"
        >
          {opened ? "Đang mở Chrome…" : android ? "Mở Chrome" : "Thử mở trình duyệt"}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-xl border border-[#e8b8d4] bg-white/80 px-3 py-2 text-xs font-bold text-[#a04572]"
        >
          {copyDone ? "Đã sao chép link" : "Sao chép link trang"}
        </button>
      </div>
    </div>
  );
}
