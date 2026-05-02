import { useState, useMemo, useEffect, useCallback } from "react";

/**
 * Giỏ hàng catalog: nhiều máy cùng model (modelKey + quantity).
 * Logic giữ nguyên với DeviceCatalogPage trước refactor.
 */
export function useCartLines() {
  const [cartLines, setCartLines] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  const cartQtyByModelKey = useMemo(() => {
    const m = new Map();
    for (const l of cartLines) m.set(l.modelKey, l.quantity);
    return m;
  }, [cartLines]);

  const cartTotalQty = useMemo(
    () => cartLines.reduce((s, l) => s + l.quantity, 0),
    [cartLines],
  );

  useEffect(() => {
    if (cartLines.length === 0) setShowCartDrawer(false);
  }, [cartLines.length]);

  const handleToggleSelect = useCallback((device) => {
    if (device?.crossBranchOnly) return;
    const mk = device.modelKey;
    if (!mk) return;
    setCartLines((prev) => {
      const idx = prev.findIndex((l) => l.modelKey === mk);
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      return [...prev, { modelKey: mk, quantity: 1 }];
    });
  }, []);

  const handleCartIncrement = useCallback((modelKey, maxAllowed) => {
    setCartLines((prev) =>
      prev.map((l) => {
        if (l.modelKey !== modelKey) return l;
        if (l.quantity >= maxAllowed) return l;
        return { ...l, quantity: l.quantity + 1 };
      }),
    );
  }, []);

  const handleCartDecrement = useCallback((modelKey) => {
    setCartLines((prev) => {
      const next = prev
        .map((l) => {
          if (l.modelKey !== modelKey) return l;
          if (l.quantity <= 1) return null;
          return { ...l, quantity: l.quantity - 1 };
        })
        .filter(Boolean);
      return next;
    });
  }, []);

  const handleCartRemoveLine = useCallback((modelKey) => {
    setCartLines((prev) => prev.filter((l) => l.modelKey !== modelKey));
  }, []);

  return {
    cartLines,
    setCartLines,
    showCartDrawer,
    setShowCartDrawer,
    cartQtyByModelKey,
    cartTotalQty,
    handleToggleSelect,
    handleCartIncrement,
    handleCartDecrement,
    handleCartRemoveLine,
  };
}
