import React from "react";
import SaveToAlbumButton from "./SaveToAlbumButton";
import { cn } from "../../lib/theme";

export default function ComposerActions({
  hasFrame,
  missingCount = 0,
  canSave,
  saving,
  readOnly,
  onSave,
  className,
}) {
  return (
    <div
      className={cn(
        // Mobile: bar cố định ngay trên SlideNav, trong tầm ngón cái.
        "fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30",
        // Desktop: chỉ còn nút, canh phải, không khung nền.
        "lg:static lg:inset-auto lg:z-auto lg:flex lg:justify-end",
        className,
      )}
    >
      <div
        className={cn(
          "rounded-2xl border border-[#F1E4EC] bg-white/95 p-2.5 shadow-[0_8px_28px_rgba(16,24,40,0.12)] backdrop-blur-md",
          "lg:w-[300px] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none",
        )}
      >
        <SaveToAlbumButton
          onSave={onSave}
          saving={saving}
          hasFrame={hasFrame}
          missingCount={missingCount}
          disabled={readOnly || !canSave}
        />
      </div>
    </div>
  );
}
