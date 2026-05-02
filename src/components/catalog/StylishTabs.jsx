import React, { useRef, useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";

export default function StylishTabs({ activeTab, setActiveTab, categories }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return undefined;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    const timer = setTimeout(checkScroll, 100);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [checkScroll, categories]);

  const scrollBy = useCallback((dir) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  }, []);

  return (
    <div className="w-full mb-6 z-20 pt-2 relative">
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-10 z-30 flex items-center justify-center cursor-pointer"
          style={{
            background: "linear-gradient(to right, #FEF5ED 60%, transparent)",
          }}
          onClick={() => scrollBy(-1)}
        >
          <span className="text-[#FF69B4] text-xl font-bold animate-pulse">
            ‹
          </span>
        </div>
      )}

      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-10 z-30 flex items-center justify-center cursor-pointer"
          style={{
            background: "linear-gradient(to left, #FEF5ED 60%, transparent)",
          }}
          onClick={() => scrollBy(1)}
        >
          <span className="text-[#FF69B4] text-xl font-bold animate-pulse">
            ›
          </span>
        </div>
      )}

      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar px-2 touch-pan-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex justify-start md:justify-center gap-3 min-w-max pb-2 px-2">
          {categories.map((cat) => {
            const isActive = activeTab === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveTab(cat.key)}
                className={`relative px-5 py-2.5 rounded-lg uppercase text-xs md:text-sm font-black tracking-widest transition-all duration-200 active:scale-95 touch-manipulation group ${
                  isActive
                    ? "text-[#FF9FCA] translate-y-[-1px]"
                    : "text-[#555] bg-white border border-transparent"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-[#222] border border-[#222] shadow-[3px_3px_0_#ddd] -z-10" />
                )}
                <span
                  className={`relative z-10 flex items-center gap-2 transition-all ${
                    isActive ? "text-[#FF9FCA]" : ""
                  }`}
                >
                  {cat.label}
                  {isActive && <Sparkles size={12} fill="currentColor" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
