import React, { useCallback, useMemo, useRef, useState } from "react";
import { Link2, MessageSquare, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  buildCatalogShareMessage,
  buildCatalogShareSearchParams,
  buildCatalogShareUrl,
} from "../../utils/catalogShareLink";
import { shortenUrl } from "../../utils/shortLink";
import { copyTextToClipboard } from "../../utils/clipboard";

/**
 * Copy link / tin nhắn gửi khách.
 * modelKeys rỗng → full catalog; có modelKeys → link danh sách đã chọn (+ trên thẻ).
 */
export default function CatalogStaffShareActions({
  availabilityPrefs,
  pickupReturnSummary,
  branchLabel,
  modelKeys = [],
  modelLabels = [],
  hint,
}) {
  const [toast, setToast] = useState(null);
  const [shortening, setShortening] = useState(false);
  const shortCacheRef = useRef(new Map());

  const pickedKeys = modelKeys.filter(Boolean);
  const hasPickedList = pickedKeys.length > 0;
  const pickedLabels = modelLabels.filter(Boolean);

  const scheduleParamsKey = useMemo(
    () => buildCatalogShareSearchParams(availabilityPrefs).toString(),
    [
      availabilityPrefs?.branchId,
      availabilityPrefs?.durationType,
      availabilityPrefs?.date?.getTime?.(),
      availabilityPrefs?.endDate?.getTime?.(),
      availabilityPrefs?.timeFrom,
      availabilityPrefs?.timeTo,
      availabilityPrefs?.pickupType,
      availabilityPrefs?.pickupSlot,
    ],
  );

  const longUrl = useMemo(
    () =>
      buildCatalogShareUrl(
        availabilityPrefs,
        hasPickedList ? { modelKeys: pickedKeys } : {},
      ),
    [scheduleParamsKey, availabilityPrefs, hasPickedList, pickedKeys.join(",")],
  );

  const showToast = useCallback((kind) => {
    setToast(kind);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const resolveShareUrl = useCallback(async () => {
    const cached = shortCacheRef.current.get(longUrl);
    if (cached) return cached;

    setShortening(true);
    try {
      const short = await shortenUrl(longUrl);
      const resolved = short || longUrl;
      shortCacheRef.current.set(longUrl, resolved);
      return resolved;
    } finally {
      setShortening(false);
    }
  }, [longUrl]);

  const handleCopyMessage = useCallback(async () => {
    const url = await resolveShareUrl();
    const text = buildCatalogShareMessage({
      pickupReturnSummary,
      branchLabel,
      url,
      modelKeys: hasPickedList ? pickedKeys : [],
      modelLabels: hasPickedList ? pickedLabels : [],
    });
    const ok = await copyTextToClipboard(text);
    showToast(ok ? "message" : "error");
  }, [
    resolveShareUrl,
    pickupReturnSummary,
    branchLabel,
    hasPickedList,
    pickedKeys,
    pickedLabels,
    showToast,
  ]);

  const handleCopyLink = useCallback(async () => {
    const url = await resolveShareUrl();
    const ok = await copyTextToClipboard(url);
    showToast(ok ? "link" : "error");
  }, [resolveShareUrl, showToast]);

  const messageLabel = hasPickedList
    ? pickedKeys.length === 1
      ? "Copy tin nhắn 1 máy"
      : `Copy tin nhắn ${pickedKeys.length} máy`
    : "Copy tin nhắn catalog";

  const linkLabel = hasPickedList
    ? pickedKeys.length === 1
      ? "Copy link 1 máy"
      : `Copy link ${pickedKeys.length} máy`
    : "Copy link catalog";

  return (
    <div className={hint ? "px-4 py-3" : "space-y-2"}>
      {hint ? (
        <p className="mb-2 text-[11px] leading-relaxed text-[#888]">{hint}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleCopyMessage}
          disabled={shortening}
          className="flex flex-1 items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#222] px-3 py-2.5 text-sm font-bold text-[#FF9FCA] hover:bg-[#333] transition-colors active:scale-[0.99] disabled:opacity-60"
        >
          {toast === "message" ? (
            <Check size={16} className="shrink-0" />
          ) : (
            <MessageSquare size={16} className="shrink-0" />
          )}
          {toast === "message" ? "Đã copy tin nhắn!" : messageLabel}
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          disabled={shortening}
          className="flex flex-1 items-center justify-center gap-2 min-h-[44px] rounded-xl border-2 border-[#EADCE3] bg-white px-3 py-2.5 text-sm font-bold text-[#444] hover:bg-[#FFFCFD] transition-colors active:scale-[0.99] disabled:opacity-60"
        >
          {toast === "link" ? (
            <Check size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <Link2 size={16} className="shrink-0 text-[#E85C9C]" />
          )}
          {toast === "link" ? "Đã copy link!" : linkLabel}
        </button>
      </div>

      {shortening ? (
        <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[#aaa]">
          <Loader2 size={11} className="animate-spin" />
          Đang rút gọn link…
        </p>
      ) : null}

      {toast === "error" ? (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
          <AlertCircle size={12} className="shrink-0" />
          Không copy được — chạm giữ để copy thủ công.
        </p>
      ) : null}
    </div>
  );
}
