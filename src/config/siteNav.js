/** Liên kết điều hướng dùng chung SPA ↔ blog/SEO tĩnh */
export const SITE_NAV = [
  { href: "/", label: "Trang chủ", spa: true },
  { href: "/catalog", label: "Đặt máy", spa: true },
  { href: "/in-anh", label: "In ảnh", spa: true },
  { href: "/blog/", label: "Blog", spa: false },
  { href: "/feedback", label: "Feedback", spa: true },
];

export const GUIDE_LINKS = [
  { href: "/thue-may-anh-tphcm/", label: "Thuê máy TP.HCM" },
  { href: "/thue-may-anh-quay-vlog/", label: "Quay vlog" },
  { href: "/thue-may-anh-chup-ao-dai/", label: "Chụp áo dài" },
  { href: "/thue-may-anh-fujifilm/", label: "Fujifilm" },
];

export const BLOG_PREVIEW = [
  {
    href: "/kinh-nghiem-thue-may-anh-lan-dau/",
    title: "Kinh nghiệm thuê máy ảnh lần đầu",
    excerpt: "7 điều cần biết trước khi nhận máy — giấy tờ, chọn body, kiểm tra tại quầy.",
    tag: "Hướng dẫn",
  },
  {
    href: "/top-may-anh-vlog-tiktok-2026/",
    title: "Top máy vlog & TikTok 2026",
    excerpt: "Sony ZV-E10, DJI Pocket 3, Canon G7X — dòng máy được thuê nhiều nhất.",
    tag: "Review",
  },
  {
    href: "/huong-dan-chup-ao-dai-tet/",
    title: "Chụp áo dài Tết — chọn máy & đặt lịch",
    excerpt: "Mùa cao điểm: đặt trước 1–2 tuần, Fujifilm được ưa chuộng nhất.",
    tag: "Mùa vụ",
  },
];
