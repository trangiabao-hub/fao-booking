import { PRICE_RANGES } from "../constants/catalog";
import {
  inferBrand,
  inferBrandHintFromCategoryLabel,
  processedRowMatchesCategoryGroupKeys,
} from "./catalogCategory";

export function parseSearchKeywords(query = "") {
  return query
    .split("+")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeSearchText(text = "") {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function compactSearchText(text = "") {
  return normalizeSearchText(text).replace(/\s+/g, "");
}

export function filterAndSortCatalogRows(
  sourceList,
  {
    searchQuery,
    selectedCategory,
    priceRange,
    mergedCategories,
    globalDeviceOrder,
    allowedOnAllDeviceIds,
    apiCategoriesLength,
  },
) {
  let filtered = [...sourceList];

  if (searchQuery.trim()) {
    const keywords = parseSearchKeywords(searchQuery);
    filtered = filtered.filter((d) => {
      const deviceName = normalizeSearchText(d.displayName);
      const compactDeviceName = compactSearchText(d.displayName);
      return keywords.some((keyword) => {
        const normalizedKeyword = normalizeSearchText(keyword);
        const compactKeyword = compactSearchText(keyword);
        return (
          deviceName.includes(normalizedKeyword) ||
          compactDeviceName.includes(compactKeyword)
        );
      });
    });
  }

  const activeCat = mergedCategories.find((c) => c.key === selectedCategory);
  if (selectedCategory === "available") {
    filtered = filtered.filter((d) => d.isAvailable);
  } else if (activeCat?.apiCategoryId) {
    const catDeviceIds = activeCat.deviceIds;
    const brandHint = inferBrandHintFromCategoryLabel(activeCat.label || "");
    /** Chỉ fallback theo thương hiệu khi CMS chưa gán item nào — tránh tách Canon body / Len cùng brand bị trộn. */
    const hasExplicitCategoryMembership =
      (activeCat.groupKeysFromCategoryItems?.size ?? 0) > 0 ||
      (catDeviceIds?.size ?? 0) > 0;

    filtered = filtered.filter((d) => {
      if (
        processedRowMatchesCategoryGroupKeys(
          d,
          activeCat.groupKeysFromCategoryItems,
        )
      )
        return true;
      for (const gid of d.groupDeviceIds) {
        if (catDeviceIds.has(gid)) return true;
      }
      if (
        !hasExplicitCategoryMembership &&
        brandHint &&
        inferBrand(d.displayName) === brandHint
      )
        return true;
      return false;
    });
  }

  const restrictAllTabs =
    apiCategoriesLength > 0 &&
    (selectedCategory === "all" || selectedCategory === "available");
  if (restrictAllTabs) {
    const restricted = filtered.filter((d) => {
      if (d.crossBranchOnly) return true;
      for (const gid of d.groupDeviceIds) {
        if (allowedOnAllDeviceIds.has(gid)) return true;
      }
      return false;
    });
    if (restricted.length > 0) {
      filtered = restricted;
    }
  }

  const range = PRICE_RANGES.find((r) => r.id === priceRange);
  if (range && priceRange !== "all") {
    filtered = filtered.filter(
      (d) => d.priceOneDay >= range.min && d.priceOneDay < range.max,
    );
  }

  const availPriority = (d) => {
    if (d.isAvailable) return 0;
    if (d.blockedBeforeRelease) return 0;
    if (d.availabilitySuggestion) return 1;
    return 2;
  };

  const getCatOrder = (d) => {
    let bestCat = 999999;
    let bestItem = 999999;

    if (activeCat?.deviceIdOrder) {
      for (const gid of d.groupDeviceIds) {
        const idx = activeCat.deviceIdOrder.get(gid);
        if (idx !== undefined && idx < bestItem) {
          bestItem = idx;
          bestCat = 0;
        }
      }
    } else {
      for (const gid of d.groupDeviceIds) {
        const order = globalDeviceOrder.get(gid);
        if (order) {
          if (
            order.catOrder < bestCat ||
            (order.catOrder === bestCat && order.itemOrder < bestItem)
          ) {
            bestCat = order.catOrder;
            bestItem = order.itemOrder;
          }
        }
      }
    }

    return { cat: bestCat, item: bestItem };
  };

  const groupByCategoryFirst =
    selectedCategory === "all" || selectedCategory === "available";

  filtered.sort((a, b) => {
    const orderA = getCatOrder(a);
    const orderB = getCatOrder(b);

    if (groupByCategoryFirst) {
      if (orderA.cat !== orderB.cat) return orderA.cat - orderB.cat;
      const availDiff = availPriority(a) - availPriority(b);
      if (availDiff !== 0) return availDiff;
      if (orderA.item !== orderB.item) return orderA.item - orderB.item;
      return (a.orderNumber ?? 999999) - (b.orderNumber ?? 999999);
    }

    const availDiff = availPriority(a) - availPriority(b);
    if (availDiff !== 0) return availDiff;
    if (orderA.cat !== orderB.cat) return orderA.cat - orderB.cat;
    if (orderA.item !== orderB.item) return orderA.item - orderB.item;
    return (a.orderNumber ?? 999999) - (b.orderNumber ?? 999999);
  });

  return filtered;
}
