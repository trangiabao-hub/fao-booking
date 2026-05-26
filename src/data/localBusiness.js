/**
 * NAP + dữ liệu chi nhánh — dùng chung cho schema, trang SEO tĩnh và llms.txt (GEO).
 */
export const BRANCHES = {
  PHU_NHUAN: {
    id: "PHU_NHUAN",
    name: "FAO Camera Phú Nhuận",
    slug: "thue-may-anh-phu-nhuan",
    address: "Lầu 1, 475 Huỳnh Văn Bánh",
    ward: "Phường 13",
    district: "Quận Phú Nhuận",
    locality: "TP.HCM",
    country: "VN",
    fullAddress: "Lầu 1, 475 Huỳnh Văn Bánh, P.13, Q. Phú Nhuận, TP.HCM",
    phone: "0901355198",
    phoneDisplay: "0901 355 198",
    mapUrl: "https://maps.app.goo.gl/Lg6KoXzXWrdiurWj9",
    geo: { lat: 10.7997, lng: 106.6878 },
    opens: "09:00",
    closes: "22:00",
    openingHours: "Mo-Su 09:00-22:00",
    priceRange: "₫₫",
    priceFrom: "150.000đ/ngày",
    areaServed: ["Quận Phú Nhuận", "Quận 1", "Quận 3", "Tân Bình", "Bình Thạnh", "Gò Vấp"],
    description:
      "Cửa hàng cho thuê máy ảnh, ống kính và phụ kiện tại trung tâm Phú Nhuận — Fujifilm, Sony, Canon, DJI. Đặt lịch online, lịch trống realtime.",
  },
  Q9: {
    id: "Q9",
    name: "FAO Camera Q9 Thủ Đức",
    slug: "thue-may-anh-thu-duc",
    address: "465 Lê Văn Việt (Elan Cafe)",
    ward: "",
    district: "Quận 9",
    locality: "TP. Thủ Đức",
    country: "VN",
    fullAddress: "465 Lê Văn Việt (Elan Cafe), Q.9, Thủ Đức, TP.HCM",
    phone: "0775844479",
    phoneDisplay: "0775 844 479",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=465+L%C3%AA+V%C4%83n+Vi%E1%BB%87t+Elan+Cafe+Th%E1%BB%A7+%C4%90%E1%BB%A9c",
    geo: { lat: 10.8489, lng: 106.7717 },
    opens: "09:00",
    closes: "22:00",
    openingHours: "Mo-Su 09:00-22:00",
    priceRange: "₫₫",
    priceFrom: "150.000đ/ngày",
    areaServed: ["Quận 9", "Thủ Đức", "Làng Đại Học", "Quận 2", "Bình Dương"],
    description:
      "Điểm giao nhận máy ảnh FAO tại Làng Đại Học, Thủ Đức — tiện cho sinh viên và khách khu Đông Sài Gòn.",
  },
};

/** Chuyển branch config → localBusiness cho seoPages */
export function branchToLocalBusiness(branch) {
  return {
    name: branch.name,
    address: branch.address,
    locality: branch.locality,
    district: branch.district,
    phone: branch.phone,
    mapUrl: branch.mapUrl,
    geo: branch.geo,
    opens: branch.opens,
    closes: branch.closes,
    openingHours: branch.openingHours,
    priceRange: branch.priceRange,
    priceFrom: branch.priceFrom,
    areaServed: branch.areaServed,
    description: branch.description,
    fullAddress: branch.fullAddress,
  };
}
