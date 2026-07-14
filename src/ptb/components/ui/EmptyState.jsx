import React from "react";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { cn, ptb } from "../../lib/theme";

export default function EmptyState({
  icon: Icon = PhotoIcon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#F1E4EC] bg-[#FFF9FC] px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FCE7F3]">
        <Icon className="h-7 w-7 text-[#E6007E]" strokeWidth={1.5} />
      </div>
      <p className={cn(ptb.textSection, "mt-4")}>{title}</p>
      {description ? (
        <p className={cn(ptb.textBody, "mt-2 max-w-xs")}>{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
