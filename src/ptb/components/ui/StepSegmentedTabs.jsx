import React from "react";
import { cn } from "../../lib/theme";

export default function StepSegmentedTabs({ tabs, activeId, onChange, className }) {
  return (
    <div
      className={cn(
        "flex w-full gap-1 rounded-[18px] border border-[#F1E4EC] bg-white p-1.5 shadow-[0_4px_16px_rgba(16,24,40,0.04)]",
        "lg:inline-flex lg:w-auto lg:min-w-[420px]",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 rounded-[14px] py-2.5 text-[13px] font-bold transition-all duration-200",
              "sm:py-3 sm:text-sm",
              "lg:flex-initial lg:min-w-[132px] lg:px-6",
              active
                ? "bg-gradient-to-r from-[#E6007E] to-[#EC4899] text-white shadow-[0_4px_14px_rgba(230,0,126,0.25)]"
                : "text-[#667085] hover:bg-[#FCE7F3]/60 hover:text-[#E6007E]",
            )}
          >
            {tab.label}
            {tab.badge ? (
              <span
                className={cn(
                  "ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                  active ? "bg-white/25 text-white" : "bg-[#FCE7F3] text-[#E6007E]",
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
