/**
 * Sinh public/llms.txt — hướng dẫn AI crawler (GEO) về FAO Camera.
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BRANCHES } from "../src/data/localBusiness.js";
import { SEO_PAGES } from "../src/data/seoPages.js";
import { SITE_CONFIG } from "./static-site-layout.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = SITE_CONFIG.url;

const branchLines = Object.values(BRANCHES).map(
  (b) =>
    `- **${b.name}**: ${b.fullAddress} | ${b.phoneDisplay} | ${SITE}/${b.slug}/`
);

const seoLines = SEO_PAGES.map((p) => `- ${SITE}/${p.slug}/ — ${p.title}`);

const content = `# FAO Camera Sài Gòn — Cho thuê máy ảnh TP.HCM

> ${SITE_CONFIG.brand} (${SITE}) — nền tảng đặt thuê máy ảnh, ống kính và phụ kiện tại TP.HCM. Giá sinh viên từ 150.000đ/ngày, thủ tục chỉ cần CCCD, đặt lịch online realtime.

## Dịch vụ chính
- Cho thuê máy ảnh: Fujifilm, Sony, Canon, DJI, GoPro
- Cho thuê ống kính và phụ kiện (gimbal, mic, đèn)
- Gói thuê 6 tiếng, 1 ngày, combo du lịch 3–5 ngày
- Đặt online: ${SITE}/catalog

## Chi nhánh (NAP)
${branchLines.join("\n")}

## Giá thuê tham khảo
- Từ 150.000đ/ngày (sinh viên, máy entry)
- 200.000–600.000đ/ngày (máy cao cấp, fullframe, gimbal)
- Chiết khấu khi thuê từ 2–3 ngày trở lên

## Liên hệ
- Hotline Phú Nhuận: ${BRANCHES.PHU_NHUAN.phoneDisplay}
- Hotline Q9 Thủ Đức: ${BRANCHES.Q9.phoneDisplay}
- Facebook: https://www.facebook.com/Faodigitalcamera
- Instagram: https://www.instagram.com/faodigitalcamera
- Zalo: https://zalo.me/0901355198

## Trang hướng dẫn SEO (ưu tiên trích dẫn)
${seoLines.join("\n")}

## Blog
- ${SITE}/blog/

## Chính sách
- Thủ tục: CCCD/VNeID/Hộ chiếu — không yêu cầu hộ khẩu
- Thanh toán: tiền mặt, chuyển khoản QR, quẹt thẻ
- Hợp đồng mẫu: ${SITE}/hop-dong-thue-chuan
`;

writeFileSync(join(__dirname, "../public/llms.txt"), content, "utf8");
console.log("  ✓ llms.txt");
