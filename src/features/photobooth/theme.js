/** FAO Photobooth — brand tokens & mobile layout (SlideNav z-[70], h-16) */

export const PTB_BRAND = {
  primary: "#E85C9C",
  primaryDark: "#D44A87",
  accent: "#FF9FCA",
  surface: "#FFF8FB",
  surfaceMid: "#FDF2F7",
  border: "#FFE4F0",
};

/** Khớp SlideNav mobile: px-3 · max-w-md · h-16 · pb safe-area */
export const mobileDockOuter = "px-3";
export const mobileDockInner = "mx-auto w-full max-w-md";

export const MOBILE_SLIDE_NAV_HEIGHT =
  "calc(4rem + max(12px, env(safe-area-inset-bottom, 0px)))";

/** CTA dock — bottom trùng mép trên SlideNav (không chồng) */
export const MOBILE_CTA_DOCK_BOTTOM = MOBILE_SLIDE_NAV_HEIGHT;

/** ~ nút 48px + pb-2 */
export const MOBILE_CTA_BLOCK_HEIGHT = "3.5rem";

/** Padding scroll album mobile — nav + CTA + khe */
export const MOBILE_ALBUM_SCROLL_PAD = `calc(${MOBILE_SLIDE_NAV_HEIGHT} + ${MOBILE_CTA_BLOCK_HEIGHT} + 0.75rem)`;

export const ptbBtnPrimary =
  "bg-[#E85C9C] hover:bg-[#D44A87] active:bg-[#C43D78] text-white font-bold shadow-lg shadow-pink-500/30 transition-colors touch-manipulation";

export const ptbBtnGradient =
  "bg-gradient-to-r from-[#E85C9C] via-pink-500 to-[#FF9FCA] hover:opacity-95 active:opacity-90 text-white font-bold shadow-xl shadow-pink-500/25 transition-opacity touch-manipulation";

export const ptbHeroGradient =
  "bg-gradient-to-br from-[#E85C9C] via-pink-500 to-[#FF9FCA]";

export const ptbShellBg =
  "min-h-dvh bg-gradient-to-b from-[#FFFCFD] via-[#FFF8FB] to-[#FDF2F7]";

export const ptbCard = "rounded-3xl bg-white border border-pink-100/80 shadow-sm";

export const ptbSpinner =
  "w-12 h-12 border-4 border-pink-100 border-t-[#E85C9C] rounded-full animate-spin";
