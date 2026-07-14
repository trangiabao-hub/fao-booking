#!/usr/bin/env node
/**
 * Đồng bộ layoutConfig cho khung photobooth trên admin API.
 * Chạy: node scripts/ptb-frames-sync.mjs
 * Cần: API_URL (mặc định https://api.faodigital.vn/api), ADMIN_TOKEN (Bearer)
 */
const API_URL = process.env.API_URL || "https://api.faodigital.vn/api";
const TOKEN = process.env.ADMIN_TOKEN || "";

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: TOKEN ? `Bearer ${TOKEN}` : "",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${path}: ${text}`);
  }
  return res.json();
}

async function main() {
  if (!TOKEN) {
    console.error("Set ADMIN_TOKEN (staff JWT) để chạy script.");
    process.exit(1);
  }

  const frames = await api("/v1/photo-booth-frames");
  console.log(`Found ${frames.length} frame themes`);

  for (const frame of frames) {
    if (frame.layoutConfig) {
      console.log(`✓ #${frame.id} ${frame.themeName} — đã có layoutConfig`);
      continue;
    }
    if (!frame.frame1x4Url && !frame.frame2x2Url && !frame.frame1x1Url) {
      console.log(`⊘ #${frame.id} ${frame.themeName} — không có ảnh khung`);
      continue;
    }

    console.log(`⟳ #${frame.id} ${frame.themeName} — detect-layout…`);
    await api(`/v1/photo-booth-frames/${frame.id}/detect-layout`, {
      method: "POST",
    });
    console.log(`  done`);
  }

  console.log("\nKhuyến nghị: upload khung strip dọc 5×15 cm (1x4) qua /dashboard/photo-booth-frames");
  console.log("Mỗi đơn thuê: 2 strip miễn phí · strip thêm 10.000đ");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
