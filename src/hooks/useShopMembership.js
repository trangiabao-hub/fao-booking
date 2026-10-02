import { useCallback, useEffect, useState } from "react";
import api from "../config/axios";

const cache = new Map();

function currentToken() {
  return localStorage.getItem("token")?.replaceAll('"', "") || "";
}

/** Một request /v1/shop/me cho mỗi token — modal và trang đơn hàng dùng chung. */
export function fetchShopMembership({ force = false } = {}) {
  const token = currentToken();
  if (!token) return Promise.resolve(null);
  if (!force && cache.has(token)) return cache.get(token);
  const request = api
    .get("/v1/shop/me")
    .then((res) => (res?.data?.shopMember ? res.data : null))
    .catch(() => {
      cache.delete(token);
      return null;
    });
  cache.set(token, request);
  return request;
}

/**
 * Shop đối tác của tài khoản Google đang đăng nhập.
 * @param {boolean} enabled chỉ gọi API khi đã có phiên đăng nhập.
 * @returns {{ shop: {shopId:number, shopName:string, email:string}|null, loading: boolean, refresh: () => Promise<void> }}
 */
export function useShopMembership(enabled) {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));

  const load = useCallback(
    async (force = false) => {
      if (!enabled) {
        setShop(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await fetchShopMembership({ force });
      setShop(data);
      setLoading(false);
    },
    [enabled],
  );

  useEffect(() => {
    let alive = true;
    if (!enabled) {
      setShop(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    fetchShopMembership().then((data) => {
      if (!alive) return;
      setShop(data);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { shop, loading, refresh: () => load(true) };
}
