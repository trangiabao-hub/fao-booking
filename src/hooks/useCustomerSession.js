import { useEffect, useState } from "react";
import { loadCustomerSession, SESSION_EVENT } from "../utils/storage";

export function useCustomerSession() {
  const [token, setToken] = useState(() => loadCustomerSession()?.token || "");
  useEffect(() => {
    const sync = () => setToken(loadCustomerSession()?.token || "");
    window.addEventListener(SESSION_EVENT, sync);
    return () => window.removeEventListener(SESSION_EVENT, sync);
  }, []);
  return token;
}
