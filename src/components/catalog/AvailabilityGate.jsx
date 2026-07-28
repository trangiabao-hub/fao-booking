import React, { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BookingPrefsForm, {
  computeAvailabilityRange,
  getAvailabilityRangeError,
} from "../../components/BookingPrefsForm";

export default function AvailabilityGate({
  isOpen,
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
  const { fromDateTime, toDateTime } = useMemo(
    () =>
      computeAvailabilityRange({
        date,
        endDate,
        timeFrom,
        timeTo,
        durationType,
        pickupType,
        pickupSlot,
      }),
    [date, endDate, timeFrom, timeTo, durationType, pickupType, pickupSlot],
  );

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

  const rangeError = getAvailabilityRangeError(prefs, fromDateTime, toDateTime);
  const isComplete = !rangeError;

  const handleBackdropClick = useCallback(() => {
    if (isComplete) onConfirm();
  }, [isComplete, onConfirm]);

  const MotionDiv = motion.div;

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          key="availability-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 sm:px-4"
        >
          <MotionDiv
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="mb-20 flex max-h-[calc(100dvh-6rem)] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-3xl bg-[#FFFBF5] md:mb-28 md:max-h-[85vh]"
          >
            <div className="px-5 pt-5 pb-4 border-b border-[#FFE4F0] bg-[#FFFBF5]">
              <h3 className="text-lg font-black text-[#222] uppercase tracking-wide sm:text-xl">
                Chọn ngày & khung giờ
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 min-w-0">
              <BookingPrefsForm
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
                variant="gate"
              />
            </div>

            <div className="border-t border-[#FFE4F0] bg-[#FFFBF5] px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onConfirm}
                disabled={!isComplete}
                className={`w-full min-h-[52px] touch-manipulation rounded-xl py-4 text-base font-black uppercase tracking-wide transition-all active:scale-[0.99] ${
                  isComplete
                    ? "bg-[#222] text-[#FF9FCA] hover:bg-[#333]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-100"
                }`}
              >
                Giữ ưu đãi & xem máy còn trống
              </button>
              <div className="mt-2.5 text-center text-sm leading-relaxed text-[#888]">
                Bạn có thể đổi lại thời gian bất cứ lúc nào.
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
