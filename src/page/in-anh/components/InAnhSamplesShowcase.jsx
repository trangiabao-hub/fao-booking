import React from "react";
import { PHOTOBOOTH_MARKETING_SAMPLES } from "../../../features/photobooth/constants";
import { IN_ANH_DESCRIPTION, IN_ANH_STEPS, IN_ANH_TITLE } from "../copy";

const TILTS = ["-rotate-[2.5deg]", "rotate-0", "rotate-[2.5deg]"];

/** Kích thước strip theo thiết bị — ưu tiên người dùng thấy rõ ảnh mẫu */
const SIZE = {
  mobile: {
    wrap: "gap-3 sm:gap-4 px-2 py-6 sm:py-8",
    figure: "flex-1 min-w-0 max-w-[34vw] sm:max-w-[118px]",
    captionTitle: "text-[11px] sm:text-xs",
    captionTag: "text-[10px] sm:text-[11px]",
    subtitle: "text-sm sm:text-base leading-snug",
    steps: "text-xs sm:text-sm",
    title: "text-lg sm:text-xl leading-tight",
  },
  tablet: {
    wrap: "gap-5 md:gap-8 px-4 py-8 md:py-10",
    figure: "flex-1 min-w-0 max-w-[200px] md:max-w-[220px]",
    captionTitle: "text-sm md:text-base",
    captionTag: "text-xs md:text-sm",
    subtitle: "text-sm md:text-base leading-snug",
    steps: "text-xs md:text-sm",
    title: "text-2xl md:text-[1.75rem] leading-tight",
  },
  desktop: {
    wrap: "gap-8 lg:gap-12 px-6 py-10 lg:py-12",
    figure: "flex-1 min-w-0 max-w-[240px] lg:max-w-[280px] xl:max-w-[300px]",
    captionTitle: "text-base lg:text-lg",
    captionTag: "text-sm",
    subtitle: "text-base lg:text-lg leading-snug max-w-xl",
    steps: "text-sm",
    title: "text-3xl lg:text-4xl leading-tight",
  },
};

/**
 * @param {{ variant?: "mobile" | "tablet" | "desktop"; className?: string }} props
 */
export default function InAnhSamplesShowcase({ variant = "mobile", className = "" }) {
  const s = SIZE[variant];

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-white via-[#FFF8FB] to-pink-50/90 border border-pink-100/90 shadow-lg shadow-pink-500/10 ${className}`}
      aria-labelledby="in-anh-samples-title"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(232,92,156,0.12),transparent_70%)]"
        aria-hidden
      />

      <div className="relative text-center px-4 sm:px-6 pt-5 sm:pt-6">
        <h1
          id="in-anh-samples-title"
          className={`font-black text-pink-900 tracking-tight mx-auto ${s.title}`}
        >
          {IN_ANH_TITLE}
        </h1>
        <p className={`mt-1.5 text-pink-600 font-semibold mx-auto ${s.steps}`}>
          {IN_ANH_STEPS}
        </p>
        <p className={`mt-2 text-slate-600 mx-auto max-w-md ${s.subtitle}`}>
          {IN_ANH_DESCRIPTION}
        </p>
      </div>

      <div className={`relative flex items-end justify-center ${s.wrap}`}>
        {PHOTOBOOTH_MARKETING_SAMPLES.map((sample, index) => (
          <figure
            key={sample.src}
            className={`group ${s.figure} ${TILTS[index % TILTS.length]} transition-transform duration-300 hover:rotate-0 hover:scale-[1.04] hover:z-10`}
          >
            <div className="rounded-xl sm:rounded-2xl overflow-hidden shadow-xl shadow-pink-900/20 ring-2 ring-pink-200/90 bg-[#FFF8FB]">
              <img
                src={sample.src}
                alt={`Mẫu photobooth ${sample.label}`}
                className="w-full aspect-[1/2.65] object-cover object-top"
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
                draggable={false}
              />
            </div>
            <figcaption className="mt-2 sm:mt-3 text-center">
              <p className={`font-black text-pink-900 leading-tight ${s.captionTitle}`}>
                {sample.label}
              </p>
              <p className={`text-pink-500 font-semibold mt-0.5 ${s.captionTag}`}>
                {sample.tag}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
