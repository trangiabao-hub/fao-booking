import React, { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import BookingPrefsForm, {
  computeAvailabilityRange,
  getAvailabilityRangeError,
} from "../BookingPrefsForm";

/**
 * Sheet gọn cho khách đã có lịch shop gửi — chỉ sửa giờ hoặc chi nhánh, không mở gate đầy đủ.
 */
export default function CatalogCuratedEditSheet({
  mode,
  onClose,
  onConfirm,
  branchId,
  date,
  endDate,
  timeFrom,
  timeTo,
  durationType,
  pickupType,
  pickupSlot,
  setBranchId,
  setDate,
  setEndDate,
  setTimeFrom,
  setTimeTo,
  setPickupType,
  setPickupSlot,
  setDurationType,
  error,
}) {
  const isOpen = mode === "time" || mode === "branch";

  const prefs = useMemo(
    () => ({
      date,
      endDate,
      timeFrom,
      timeTo,
      durationType,
      pickupType,
      pickupSlot,
      branchId,
    }),
    [
      date,
      endDate,
      timeFrom,
      timeTo,
      durationType,
      pickupType,
      pickupSlot,
      branchId,
    ],
  );

  const { fromDateTime, toDateTime } = useMemo(
    () => computeAvailabilityRange(prefs),
    [prefs],
  );

  const rangeError = getAvailabilityRangeError(prefs, fromDateTime, toDateTime);
  const isComplete = !rangeError;

  const title =
    mode === "branch" ? "Đổi chi nhánh" : "Đổi giờ nhận / trả";
  const subtitle =
    mode === "branch"
      ? "Chọn cửa hàng bạn muốn nhận máy."
      : durationType === "SIX_HOURS"
        ? "Gói 6 tiếng — chỉ đổi ngày và khung giờ nhận."
        : "Chọn ngày và giờ nhận / trả phù hợp.";

  const handleConfirm = useCallback(() => {
    if (!isComplete) return;
    onConfirm();
  }, [isComplete, onConfirm]);

  const MotionDiv = motion.div;

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          key={`curated-edit-${mode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[55] flex items-end justify-center bg-black/45"
          onClick={onClose}
        >
          <MotionDiv
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="mb-24 flex max-h-[calc(100dvh-8.5rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-emerald-100/80 bg-[#FFFBF5] shadow-xl md:mb-28 md:max-h-[75vh]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-emerald-100/60 bg-gradient-to-r from-emerald-50/80 to-[#FFFBF5] px-5 pb-3 pt-5">
              <div className="min-w-0">
                <h3 className="text-lg font-black uppercase tracking-wide text-[#222]">
                  {title}
                </h3>
                <p className="mt-1 text-xs font-medium text-[#666]">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-[#888] transition-colors hover:bg-black/5 hover:text-[#333]"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-5 py-4">
              <BookingPrefsForm
                sections={mode === "branch" ? "branch" : "time"}
                branchId={branchId}
                date={date}
                endDate={endDate}
                timeFrom={timeFrom}
                timeTo={timeTo}
                durationType={durationType}
                pickupType={pickupType}
                pickupSlot={pickupSlot}
                setBranchId={setBranchId}
                setDate={setDate}
                setEndDate={setEndDate}
                setTimeFrom={setTimeFrom}
                setTimeTo={setTimeTo}
                setDurationType={setDurationType}
                setPickupType={setPickupType}
                setPickupSlot={setPickupSlot}
                error={error}
              />
            </div>

            <div className="border-t border-emerald-100/60 bg-[#FFFBF5] px-5 pb-4 pt-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!isComplete}
                className={`w-full rounded-xl py-3 font-black uppercase tracking-wider transition-all ${
                  isComplete
                    ? "bg-[#222] text-[#FF9FCA] hover:bg-[#333]"
                    : "cursor-not-allowed border border-gray-100 bg-gray-200 text-gray-400"
                }`}
              >
                Lưu thay đổi
              </button>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
