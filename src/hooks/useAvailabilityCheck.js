import { useState, useEffect, useCallback, useRef } from "react";
import { addDays } from "date-fns";
import api from "../config/axios";
import {
  computeAvailabilityRange,
  getAvailabilityRangeError,
  normalizeDate,
} from "../components/BookingPrefsForm";
import { BRANCHES, isBranchBookable } from "../data/bookingConstants";
import { normalizeBookingBranchId } from "../utils/deviceBranch";
import { filterBookingsOverlappingSlot } from "../utils/bookingOverlap";
import { formatDateTimeLocalForAPI } from "../utils/catalogDatetime";
import { CATALOG_API_TIMEOUT_MS } from "../constants/catalog";

/**
 * Trạng thái + fetch availability / gợi ý model / cross-branch busy — giữ nguyên hành vi DeviceCatalogPage.
 * Dùng ref thế hệ request để không ghi state khi response đến muộn sau khi đổi prefs.
 */
export function useAvailabilityCheck({
  availabilityConfirmed,
  availabilityPrefs,
}) {
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [busyDeviceIds, setBusyDeviceIds] = useState([]);
  const [otherBranchesBusyIds, setOtherBranchesBusyIds] = useState({});
  const [deviceBookingsById, setDeviceBookingsById] = useState({});
  const [deviceRawBookingsById, setDeviceRawBookingsById] = useState({});
  const [modelAvailabilitySuggestions, setModelAvailabilitySuggestions] =
    useState({});

  const fetchGeneration = useRef(0);

  const fetchAvailability = useCallback(
    async ({ silent = false } = {}) => {
      if (!availabilityConfirmed) return;
      const gen = ++fetchGeneration.current;

      const { fromDateTime, toDateTime } =
        computeAvailabilityRange(availabilityPrefs);
      const rangeError = getAvailabilityRangeError(
        availabilityPrefs,
        fromDateTime,
        toDateTime,
      );
      if (rangeError) {
        if (!silent) setAvailabilityError(rangeError);
        return;
      }

      if (!silent) setAvailabilityError("");
      if (!silent) setAvailabilityLoading(true);
      const from = formatDateTimeLocalForAPI(fromDateTime);
      const exactTo = formatDateTimeLocalForAPI(toDateTime);
      const lookupToDateTime =
        availabilityPrefs.durationType === "ONE_DAY"
          ? addDays(toDateTime, 1)
          : toDateTime;
      const to = formatDateTimeLocalForAPI(lookupToDateTime);
      if (!from || !to || !exactTo) {
        if (!silent) setAvailabilityLoading(false);
        return;
      }
      try {
        const [bookingResp, suggestionResp] = await Promise.all([
          api.get("v1/devices/booking", {
            params: {
              startDate: from?.slice(0, 10),
              endDate: to?.slice(0, 10),
              branchId: availabilityPrefs.branchId,
            },
            timeout: CATALOG_API_TIMEOUT_MS,
          }),
          api.get("v1/devices/model-availability-suggestions", {
            params: { from, to: exactTo },
            timeout: CATALOG_API_TIMEOUT_MS,
          }),
        ]);

        if (gen !== fetchGeneration.current) return;

        const data = bookingResp.data || [];
        const busySet = new Set();
        const bookingMap = {};
        const rawBookingMap = {};
        data.forEach((d) => {
          const idKey = String(d.id);
          const raw = Array.isArray(d.bookingDtos) ? d.bookingDtos : [];
          rawBookingMap[idKey] = raw;
          const overlapping = filterBookingsOverlappingSlot(
            raw,
            fromDateTime,
            toDateTime,
          );
          bookingMap[idKey] = overlapping;
          if (overlapping.length > 0) {
            busySet.add(idKey);
          }
        });
        setBusyDeviceIds(Array.from(busySet));
        setDeviceBookingsById(bookingMap);
        setDeviceRawBookingsById(rawBookingMap);
        setModelAvailabilitySuggestions(suggestionResp.data || {});

        const pickupDay = normalizeDate(fromDateTime);
        const currentBid = normalizeBookingBranchId(availabilityPrefs.branchId);
        const otherBranches = BRANCHES.filter(
          (b) =>
            normalizeBookingBranchId(b.id) !== currentBid &&
            (!pickupDay || isBranchBookable(b, pickupDay)),
        );

        const otherBusyEntries = await Promise.all(
          otherBranches.map(async (b) => {
            try {
              const resp = await api.get("v1/devices/booking", {
                params: {
                  startDate: from?.slice(0, 10),
                  endDate: to?.slice(0, 10),
                  branchId: b.id,
                },
                timeout: CATALOG_API_TIMEOUT_MS,
              });
              const rows = resp.data || [];
              const ob = new Set();
              rows.forEach((row) => {
                const raw = Array.isArray(row.bookingDtos) ? row.bookingDtos : [];
                const overlapping = filterBookingsOverlappingSlot(
                  raw,
                  fromDateTime,
                  toDateTime,
                );
                if (overlapping.length > 0) ob.add(String(row.id));
              });
              return [b.id, Array.from(ob)];
            } catch (e) {
              console.warn("cross-branch booking fetch failed", b.id, e);
              return [b.id, null];
            }
          }),
        );

        if (gen !== fetchGeneration.current) return;

        const obMap = {};
        for (const [bid, arr] of otherBusyEntries) {
          if (arr !== null) obMap[bid] = arr;
        }
        setOtherBranchesBusyIds(obMap);
      } catch (err) {
        console.error("Failed to fetch availability:", err);
        if (!silent) {
          setBusyDeviceIds([]);
          setDeviceBookingsById({});
          setDeviceRawBookingsById({});
          setModelAvailabilitySuggestions({});
          setOtherBranchesBusyIds({});
        }
      } finally {
        if (gen === fetchGeneration.current && !silent) {
          setAvailabilityLoading(false);
        }
      }
    },
    [availabilityConfirmed, availabilityPrefs],
  );

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return {
    availabilityError,
    setAvailabilityError,
    availabilityLoading,
    busyDeviceIds,
    setBusyDeviceIds,
    otherBranchesBusyIds,
    setOtherBranchesBusyIds,
    deviceBookingsById,
    setDeviceBookingsById,
    deviceRawBookingsById,
    setDeviceRawBookingsById,
    modelAvailabilitySuggestions,
    setModelAvailabilitySuggestions,
    fetchAvailability,
  };
}
