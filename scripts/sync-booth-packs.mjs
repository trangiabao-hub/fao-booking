#!/usr/bin/env node
/**
 * Chép dữ liệu bộ khung của booth (frame-generation/clone|release/<slug>/pack.json) vào public/booth-packs/ cho những bộ
 * CHƯA được tải lên server (các bộ chỉ nằm trong app booth). Bộ đã có trên server thì web lấy thẳng từ server nên không chép.
 * Chỉ giữ các khổ web đặt lịch vẽ được (strip s2/s3/s4, p2/p4/p6, l1, l5) cho file nhẹ.
 *
 * Chạy lại mỗi khi build.py sinh khung mới:  node scripts/sync-booth-packs.mjs [--all]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const gen = join(root, "..", "frame-generation");
const out = join(root, "public", "booth-packs");
const KEEP = new Set(["s2", "s3", "s4", "p2", "p4", "p6", "l1", "l5"]);
const API = process.env.VITE_API_URL || "https://api.faodigital.vn/api";
const all = process.argv.includes("--all");

const onServer = new Set();
if (!all) {
  const res = await fetch(`${API.replace(/\/$/, "")}/booth-mgmt/frames/packs/catalog`);
  if (!res.ok) throw new Error(`catalog HTTP ${res.status}`);
  for (const p of await res.json()) onServer.add(p.slug);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
let n = 0;
let bytes = 0;
for (const dir of ["clone", "release"]) {
  const base = join(gen, dir);
  if (!existsSync(base)) continue;
  for (const slug of readdirSync(base)) {
    const file = join(base, slug, "pack.json");
    if (!existsSync(file) || onServer.has(slug) || existsSync(join(out, `${slug}.json`))) continue;
    const pack = JSON.parse(readFileSync(file, "utf8"));
    pack.variants = pack.variants.filter((v) => KEEP.has(v.kind));
    if (!pack.variants.length) continue;
    const text = JSON.stringify(pack);
    writeFileSync(join(out, `${slug}.json`), text);
    n += 1;
    bytes += text.length;
  }
}
console.log(`booth-packs: ${n} bộ, ${(bytes / 1e6).toFixed(1)} MB -> ${out}`);
