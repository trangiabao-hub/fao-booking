import { useEffect, useState } from "react";
import api from "../config/axios";
import { loadCustomerSession } from "../utils/storage";
import { isStaffAccount } from "../utils/staffAccess";

/**
 * true chỉ khi đã đăng nhập và /account là staff/admin.
 * Vãng lai và khách hàng thường → false.
 */
export function useStaffAccess() {
  const hasSession = !!loadCustomerSession()?.token;
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(hasSession);

  useEffect(() => {
    if (!hasSession) {
      setIsStaff(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    api
      .get("/account")
      .then((res) => {
        if (!cancelled) setIsStaff(isStaffAccount(res?.data));
      })
      .catch(() => {
        if (!cancelled) setIsStaff(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  return { isStaff, loading, hasSession };
}
