/** Design tokens — Album / Photobooth premium UI */
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

export const ptb = {
  pageBg:
    "min-h-dvh bg-[linear-gradient(180deg,#FFF7FB_0%,#FFFFFF_45%,#FFF9FC_100%)]",
  container: "mx-auto w-full max-w-[1240px] px-4 sm:px-5",
  contentPb: "pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10",

  card: "border border-[#F1E4EC] bg-white shadow-[0_12px_32px_rgba(16,24,40,0.06)]",
  cardSm:
    "border border-[#EEF2F6] bg-white shadow-[0_4px_16px_rgba(16,24,40,0.04)]",

  textTitle: "text-[#172033] text-lg sm:text-xl font-bold tracking-tight",
  textSection: "text-[#172033] text-[15px] sm:text-base font-bold",
  textBody: "text-[#667085] text-[13px] sm:text-sm font-medium leading-relaxed",
  textCaption:
    "text-[#667085] text-[11px] sm:text-xs font-semibold uppercase tracking-wide",

  btnPrimary:
    "inline-flex items-center justify-center gap-2 w-full h-12 sm:h-[52px] rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#E6007E] to-[#EC4899] shadow-[0_8px_24px_rgba(230,0,126,0.28)] transition-all duration-200 hover:shadow-[0_12px_28px_rgba(230,0,126,0.35)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none disabled:translate-y-0",

  badgeSuccess:
    "inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1.5 text-[12px] sm:text-[13px] font-semibold text-emerald-800",
};
