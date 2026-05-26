/**
 * Chuyển snapshot device SEO → entry hiển thị trên /blog/ (tag Review).
 */
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { formatVnd } from "./deviceCatalogSeo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, "../../src/data/deviceSeoSnapshot.json");

export function loadDeviceReviewBlogPosts() {
  if (!existsSync(SNAPSHOT_PATH)) return [];
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  const fetchedDate = snapshot.fetchedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);

  return (snapshot.models || []).map((m, i) => {
    const priceLine = `${formatVnd(m.priceOneDay)}/ngày`;
    const excerpt = `${priceLine} · ${(m.useCase || "").trim()}`.slice(0, 140);

    return {
      slug: m.slug,
      title: `Review thuê ${m.displayName}`,
      description: `Review ${m.displayName} tại FAO Camera: ${formatVnd(m.priceSixHours)}/6h, ${priceLine}. ${m.useCase || ""}`.trim(),
      excerpt,
      date: fetchedDate,
      category: "Review",
      readMinutes: 3,
      image: m.image || "/og-image.png",
      imageAlt: `${m.displayName} — thuê tại FAO Camera`,
      isDeviceReview: true,
      sortOrder: (m.categoryOrder ?? 99) * 1000 + (m.itemOrder ?? i),
    };
  });
}

export function getAllBlogListingPosts(editorialPosts) {
  const reviews = loadDeviceReviewBlogPosts();
  return [...editorialPosts, ...reviews].sort((a, b) => {
    if (a.isDeviceReview !== b.isDeviceReview) {
      return a.isDeviceReview ? 1 : -1;
    }
    if (!a.isDeviceReview) {
      return new Date(b.date) - new Date(a.date);
    }
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });
}

export function getBlogListingCategories(posts) {
  const cats = new Set(posts.map((p) => p.category).filter(Boolean));
  const ordered = ["Review", ...[...cats].filter((c) => c !== "Review").sort()];
  return ordered;
}
