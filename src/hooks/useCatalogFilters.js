import { useState } from "react";

/**
 * Lọc UI catalog: ô tìm, tab category, khoảng giá, modal lọc giá.
 * Đồng bộ URL ↔ state vẫn do DeviceCatalogPage (availability + filters).
 */
export function useCatalogFilters({
  initialCategory,
  initialSearchQuery,
  initialPriceRange,
}) {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [priceRange, setPriceRange] = useState(initialPriceRange);
  const [showFilterModal, setShowFilterModal] = useState(false);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    showFilterModal,
    setShowFilterModal,
  };
}
