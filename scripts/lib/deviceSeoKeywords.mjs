/**
 * Từ khóa tìm kiếm phổ biến — thuê máy ảnh TP.HCM (long-tail + GEO).
 * Dùng cho title, meta, FAQ, H2 — khớp intent Google & AI Search.
 */

const USE_CASE_KEYWORDS = {
  G7X: ["thuê g7x tphcm", "thuê canon g7x chụp tiktok", "thuê máy ảnh compact du lịch"],
  G7X3: ["thuê g7x mark iii", "thuê máy vlog tiktok", "thuê canon g7x giá rẻ"],
  R50: ["thuê canon r50 tphcm", "thuê máy ảnh kỷ yếu", "thuê r50 chụp chân dung"],
  R50V: ["thuê canon r50v", "thuê máy ảnh mirrorless giá rẻ"],
  R8: ["thuê canon r8", "thuê máy full frame giá rẻ tphcm"],
  RP: ["thuê canon rp", "thuê máy ảnh chụp đám cưới"],
  M100: ["thuê canon m100", "thuê máy ảnh sinh viên giá rẻ", "thuê máy nhỏ gọn tphcm"],
  M50: ["thuê canon m50", "thuê máy ảnh cho người mới"],
  X100V: ["thuê fujifilm x100v", "thuê máy film look tphcm", "thuê x100v chụp cafe"],
  X100F: ["thuê fujifilm x100f", "thuê máy ảnh màu đẹp"],
  XS10: ["thuê fujifilm xs10", "thuê máy fujifilm giá rẻ"],
  XS20: ["thuê fujifilm xs20", "thuê máy quay vlog fujifilm"],
  XT30: ["thuê fujifilm xt30", "thuê máy chụp kỷ yếu fujifilm"],
  XA3: ["thuê fujifilm xa3", "thuê máy ảnh sinh viên rẻ"],
  XA5: ["thuê fujifilm xa5", "thuê máy ảnh giá rẻ tphcm"],
  A6400: ["thuê sony a6400", "thuê máy ảnh sony tphcm"],
  ZV10: ["thuê sony zv-e10", "thuê máy quay youtube", "thuê máy vlog giá rẻ"],
  ZV1: ["thuê sony zv-1", "thuê máy vlog compact"],
  PK3: ["thuê dji pocket 3", "thuê máy quay vlog du lịch", "thuê pocket 3 tphcm"],
  RC: ["thuê ricoh gr iii", "thuê máy chụp street photo"],
};

const BRAND_KEYWORDS = {
  Canon: ["thuê máy ảnh canon tphcm", "cho thuê canon giá rẻ", "thuê máy canon phú nhuận"],
  Fujifilm: ["thuê máy ảnh fujifilm tphcm", "thuê fuji giá rẻ", "thuê máy film simulation"],
  Sony: ["thuê máy ảnh sony tphcm", "thuê sony giá rẻ", "thuê máy quay sony"],
  DJI: ["thuê dji pocket tphcm", "thuê máy quay dji giá rẻ"],
  Ricoh: ["thuê ricoh gr tphcm", "thuê máy compact cao cấp"],
  "Insta 360": ["thuê insta360 tphcm", "thuê action cam giá rẻ"],
};

const GEO_PHRASES = [
  "thuê máy ảnh phú nhuận",
  "thuê máy ảnh tphcm giá rẻ",
  "cho thuê máy ảnh sài gòn",
  "thuê máy ảnh thủ đức",
  "thuê máy ảnh sinh viên tphcm",
];

export function getDeviceSearchKeywords(m) {
  const modelKw = USE_CASE_KEYWORDS[m.modelKey] || [];
  const brandKw = BRAND_KEYWORDS[m.brandLabel] || BRAND_KEYWORDS[m.categoryName] || [];
  const nameLower = m.displayName.toLowerCase();
  const dynamic = [
    `thuê ${nameLower} tphcm`,
    `cho thuê ${nameLower} giá rẻ`,
    `thuê ${nameLower} phú nhuận`,
  ];
  return [...new Set([...dynamic, ...modelKw, ...brandKw, ...GEO_PHRASES.slice(0, 3)])];
}

export function buildDeviceKeywordPhrase(m) {
  const kws = getDeviceSearchKeywords(m);
  return kws.slice(0, 4).join(", ");
}

/** FAQ bổ sung theo intent tìm kiếm volume cao */
export function buildDeviceKeywordFaqs(m, formatVnd, branchLabel, depositBullets) {
  const name = m.displayName;
  const faqs = [
    {
      q: `Cho thuê ${name} ở đâu TP.HCM?`,
      a: `FAO Camera cho thuê ${name} tại ${branchLabel}, TP.HCM — địa chỉ Phú Nhuận (475 Huỳnh Văn Bánh)${m.branches.includes("Q9") ? " và Q9 Thủ Đức (465 Lê Văn Việt)" : ""}. Đặt lịch online tại faocamera.vn.`,
    },
    {
      q: `Thuê ${name} Phú Nhuận giá rẻ có không?`,
      a: `Có — thuê ${name} tại FAO Phú Nhuận từ ${formatVnd(m.priceOneDay)}/ngày, ${formatVnd(m.priceSixHours)}/6 tiếng. Giá công khai trên web, HSSV được COC 0D với minh chứng lịch học.`,
    },
    {
      q: `Thuê máy ảnh ${name} cần giấy tờ gì?`,
      a: `Mang CCCD/VNeID mức 2 khi nhận máy. HSSV: thêm minh chứng lịch học để được COC 0D. ${depositBullets[1] || ""}`.trim(),
    },
  ];

  const vlogModels = ["G7X", "G7X3", "ZV10", "ZV1", "PK3", "XS20"];
  if (vlogModels.includes(m.modelKey)) {
    faqs.push({
      q: `Thuê ${name} quay vlog TikTok được không?`,
      a: `Được — ${name} ${m.useCase || "phù hợp quay vlog, TikTok, YouTube ngắn"}. Thuê tại FAO từ ${formatVnd(m.priceOneDay)}/ngày, đặt online có lịch trống realtime.`,
    });
  }

  const kyYeuModels = ["R50", "R50V", "XT30", "XT301545", "XA3", "XA5", "XS10", "M100"];
  if (kyYeuModels.includes(m.modelKey)) {
    faqs.push({
      q: `Thuê ${name} chụp kỷ yếu sinh viên được không?`,
      a: `Rất phù hợp — ${name} ${m.useCase || "dễ dùng cho nhóm sinh viên"}. FAO hỗ trợ HSSV COC 0D và giảm 20% T2–T6. Nên đặt trước 1–2 tuần mùa cao điểm.`,
    });
  }

  return faqs;
}
