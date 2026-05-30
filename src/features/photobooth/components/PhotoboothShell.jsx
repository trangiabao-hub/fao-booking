import React from "react";
import SlideNav from "../../../components/SlideNav";
import { ptbShellBg } from "../theme";

/** Padding đáy tránh SlideNav fixed che nội dung */
const SHELL_BOTTOM_PAD =
  "pb-[calc(4rem+max(12px,env(safe-area-inset-bottom,0px))+1.25rem)] md:pb-[calc(5rem+max(12px,env(safe-area-inset-bottom,0px))+1.5rem)]";

/** Shell chung — album đơn & phòng nhóm · responsive mobile / iPad / PC */
export default function PhotoboothShell({ children }) {
  return (
    <div className={`${ptbShellBg} relative`}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 right-0 w-[28rem] h-[28rem] rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full bg-[#FF9FCA]/20 blur-3xl" />
        <div className="hidden lg:block absolute bottom-0 right-1/4 w-96 h-48 rounded-full bg-pink-100/40 blur-3xl" />
      </div>

      <SlideNav />

      <div
        className={`relative mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 ${SHELL_BOTTOM_PAD} max-w-lg md:max-w-3xl lg:max-w-[88rem]`}
      >
        {children}
      </div>
    </div>
  );
}
