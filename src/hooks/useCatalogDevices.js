import { useState, useCallback, useEffect } from "react";
import api from "../config/axios";
import { CATALOG_API_TIMEOUT_MS } from "../constants/catalog";
import { normalizeDevicesListResponse } from "../utils/deviceBranch";

/**
 * Tải danh sách máy + danh mục API cho catalog.
 */
export function useCatalogDevices() {
  const [devices, setDevices] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDevices = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
      setError("");
    }
    try {
      const [devicesRes, categoriesRes] = await Promise.all([
        api.get("v1/devices", {
          params: { type: "DEVICE", includeFeedbackImages: false },
          timeout: CATALOG_API_TIMEOUT_MS,
        }),
        api
          .get("v1/device-categories/with-items", {
            params: { includeFeedbackImages: false },
            timeout: CATALOG_API_TIMEOUT_MS,
          })
          .catch(() => ({ data: [] })),
      ]);
      setDevices(normalizeDevicesListResponse(devicesRes.data));
      setApiCategories(categoriesRes.data || []);
      if (!silent) setError("");
    } catch (err) {
      console.error("Failed to fetch devices:", err);
      if (!silent) {
        const msg =
          err?.code === "ECONNABORTED" || err?.message?.includes?.("timeout")
            ? "Kết nối quá lâu. Kiểm tra mạng hoặc API rồi thử lại."
            : "Không thể tải danh sách máy. Vui lòng thử lại.";
        setError(msg);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    devices,
    setDevices,
    apiCategories,
    setApiCategories,
    isLoading,
    error,
    setError,
    fetchDevices,
  };
}
