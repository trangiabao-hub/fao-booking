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

  const rangeError = getAvailabilityRangeError(
    prefs,
    fromDateTime,
    toDateTime,
  );
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
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        >
          <MotionDiv
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFBF5] w-full max-w-md rounded-3xl mb-24 md:mb-28 max-h-[calc(100dvh-8.5rem)] md:max-h-[85vh] flex flex-col overflow-hidden min-w-0"
          >
            <div className="px-5 pt-5 pb-3 border-b border-[#FFE4F0] bg-[#FFFBF5]">
              <div className="mb-2">
                <h3 className="text-xl font-black text-[#222] uppercase tracking-wider">
                  Chọn giờ nhận / trả
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 min-w-0">
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
              />
            </div>

            <div className="px-5 pt-3 pb-4 border-t border-[#FFE4F0] bg-[#FFFBF5]">
              <button
                type="button"
                onClick={onConfirm}
                disabled={!isComplete}
                className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all ${
                  isComplete
                    ? "bg-[#222] text-[#FF9FCA] hover:bg-[#333]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-100"
                }`}
              >
                Giữ ưu đãi & xem máy còn trống
              </button>
              <div className="text-center text-sm text-[#888] mt-2">
                Bạn có thể đổi lại thời gian bất cứ lúc nào.
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}
