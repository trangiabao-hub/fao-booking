import { useEffect } from "react";

const SITE_NAME = "FAO Booking";
const DEFAULT_IMAGE_PATH = "/og-image.png";

const upsertMeta = (attr, key, content) => {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const getAbsoluteUrl = (path) => {
  const configured = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${configured}${cleanPath}`;
};

const SeoMeta = ({ title, description, path = "/", noindex = false, children }) => {
  useEffect(() => {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const canonicalUrl = getAbsoluteUrl(path);
    const imageUrl = getAbsoluteUrl(DEFAULT_IMAGE_PATH);
    const robots = noindex ? "noindex, nofollow" : "index, follow";

    document.documentElement.lang = "vi";
    document.title = pageTitle;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:locale", "vi_VN");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", pageTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", pageTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);
  }, [title, description, path, noindex]);

  return children;
};

export default SeoMeta;
