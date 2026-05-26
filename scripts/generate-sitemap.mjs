/**
 * Sinh public/sitemap.xml từ SEO + blog data.
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { SEO_PAGES } from "../src/data/seoPages.js";
import { BLOG_POSTS } from "../src/data/blogPosts.js";
import { SITE_CONFIG } from "./static-site-layout.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = SITE_CONFIG.url;

function loadDeviceSlugs() {
  const snapPath = join(__dirname, "../src/data/deviceSeoSnapshot.json");
  if (!existsSync(snapPath)) return [];
  try {
    const snap = JSON.parse(readFileSync(snapPath, "utf8"));
    return (snap.models || []).map((m) => m.slug);
  } catch {
    return [];
  }
}

const deviceSlugs = loadDeviceSlugs();

const entries = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/catalog", changefreq: "daily", priority: "0.95" },
  { loc: "/bang-gia-thue-may-anh", changefreq: "daily", priority: "0.95" },
  { loc: "/menu", changefreq: "weekly", priority: "0.7" },
  { loc: "/feedback", changefreq: "weekly", priority: "0.7" },
  { loc: "/catalog?branchId=Q9", changefreq: "weekly", priority: "0.7" },
  { loc: "/blog/", changefreq: "weekly", priority: "0.75" },
  { loc: "/hop-dong-thue-chuan", changefreq: "monthly", priority: "0.5" },
  { loc: "/photobooth", changefreq: "weekly", priority: "0.6" },
  ...BLOG_POSTS.map((p) => ({
    loc: `/${p.slug}`,
    changefreq: "monthly",
    priority: "0.7",
  })),
  ...SEO_PAGES.map((p) => ({
    loc: `/${p.slug}`,
    changefreq: "weekly",
    priority: p.slug.includes("phu-nhuan") || p.slug.includes("tphcm") ? "0.9" : "0.85",
  })),
  { loc: "/catalog?branchId=PHU_NHUAN", changefreq: "daily", priority: "0.85" },
  ...deviceSlugs.map((slug) => ({
    loc: `/${slug}`,
    changefreq: "weekly",
    priority: "0.8",
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${SITE}${e.loc}</loc>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

writeFileSync(join(__dirname, "../public/sitemap.xml"), xml, "utf8");
console.log(`  ✓ sitemap.xml (${entries.length} URLs)`);
