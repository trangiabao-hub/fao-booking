import React from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, SparklesIcon } from "@heroicons/react/24/solid";
import { ptbBtnPrimary } from "../../../features/photobooth/theme";
import { IN_ANH_CTA_PRIMARY, IN_ANH_CTA_SECONDARY } from "../copy";

/** @typedef {"stack" | "row"} InAnhCtaLayout */

const SIZE = {
  mobile: { py: "py-3.5", text: "text-sm" },
  tablet: { py: "py-4", text: "text-base" },
  desktop: { py: "py-4", text: "text-base lg:text-lg" },
};

/**
 * @param {{ layout?: InAnhCtaLayout; variant?: "mobile" | "tablet" | "desktop"; className?: string }} props
 */
export default function InAnhCta({
  layout = "stack",
  variant = "mobile",
  className = "",
}) {
  const s = SIZE[variant];

  const primary = (
    <Link
      to={IN_ANH_CTA_PRIMARY.to}
      className={`flex items-center justify-center gap-2 rounded-2xl text-white font-bold ${s.py} ${s.text} ${ptbBtnPrimary}`}
    >
      <SparklesIcon className="w-5 h-5 shrink-0" />
      {IN_ANH_CTA_PRIMARY.label}
      <ArrowRightIcon className="w-4 h-4 shrink-0" />
    </Link>
  );

  const secondary = (
    <Link
      to={IN_ANH_CTA_SECONDARY.to}
      className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-pink-300 bg-white text-pink-800 font-bold hover:bg-pink-50 transition-colors ${s.py} ${s.text}`}
    >
      {IN_ANH_CTA_SECONDARY.label}
    </Link>
  );

  if (layout === "row") {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${className}`}>
        {primary}
        {secondary}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {primary}
      {secondary}
    </div>
  );
}
