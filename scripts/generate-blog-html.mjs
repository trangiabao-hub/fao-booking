/**
 * Sinh trang blog tĩnh — UI magazine + schema AI-friendly.
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  BLOG_POSTS,
  BLOG_POSTS_BY_SLUG,
  BLOG_POSTS_SORTED,
  getBlogPostPath,
  getBlogPostImage,
  DEFAULT_BLOG_IMAGE,
} from "../src/data/blogPosts.js";
import { readdirSync } from "fs";
import { SEO_PAGES, SEO_PAGES_BY_SLUG } from "../src/data/seoPages.js";
import {
  escapeHtml,
  renderHead,
  renderSiteHeader,
  renderSiteFooter,
  renderBreadcrumb,
  renderAiAnswerBox,
  stringifySchemaGraph,
  buildWebPageNode,
  buildBreadcrumbNode,
  SITE_CONFIG,
  absoluteImageUrl,
  catalogHref,
  renderAttributionBootstrapScript,
} from "./static-site-layout.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");
const BLOG_DIR = join(PUBLIC_DIR, "blog");
const SLUG_MANIFEST = join(__dirname, ".blog-slugs-manifest.json");
const SEO_SLUGS = new Set(SEO_PAGES.map((p) => p.slug));

/** Thư mục public/<slug>/ có index.html, không phải trang SEO */
function discoverBlogDirsOnDisk() {
  if (!existsSync(PUBLIC_DIR)) return [];
  return readdirSync(PUBLIC_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "blog" && !SEO_SLUGS.has(e.name))
    .filter((e) => existsSync(join(PUBLIC_DIR, e.name, "index.html")))
    .map((e) => e.name);
}

/** Xóa public/<slug>/ và public/blog/<slug>/ của bài đã bỏ khỏi blogPosts.js */
function cleanupRemovedBlogPosts(currentSlugs) {
  const current = new Set(currentSlugs);
  let previous = [];
  if (existsSync(SLUG_MANIFEST)) {
    try {
      previous = JSON.parse(readFileSync(SLUG_MANIFEST, "utf8"));
      if (!Array.isArray(previous)) previous = [];
    } catch {
      previous = [];
    }
  } else {
    // Lần đầu: quét disk để dọn bài orphan (đã xóa trong blogPosts.js trước đó)
    previous = discoverBlogDirsOnDisk();
  }

  for (const slug of previous) {
    if (current.has(slug)) continue;
    const rootDir = join(PUBLIC_DIR, slug);
    const legacyDir = join(BLOG_DIR, slug);
    if (existsSync(rootDir)) {
      rmSync(rootDir, { recursive: true });
      console.log(`  ✗ removed /${slug}/ (bài đã xóa khỏi blogPosts.js)`);
    }
    if (existsSync(legacyDir)) {
      rmSync(legacyDir, { recursive: true });
      console.log(`  ✗ removed /blog/${slug}/ (legacy)`);
    }
  }

  writeFileSync(SLUG_MANIFEST, JSON.stringify([...current], null, 2), "utf8");
}

function postImageAlt(post) {
  return post.imageAlt || post.title;
}

function renderImg(src, alt, className = "") {
  return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" />`;
}

function renderPostThumb(post, className) {
  return renderImg(getBlogPostImage(post), postImageAlt(post), className);
}

const formatDateVi = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

function buildToc(sections) {
  const headings = sections.filter((s) => s.type === "h2");
  if (headings.length < 2) return "";
  const links = headings
    .map((h, i) => {
      const id = `section-${i + 1}`;
      return `<a href="#${id}">${escapeHtml(h.text)}</a>`;
    })
    .join("");
  return `<nav class="toc sidebar-box" aria-label="Mục lục"><h3>Mục lục</h3>${links}</nav>`;
}

function renderSections(sections) {
  let h2Index = 0;
  return sections
    .map((s) => {
      if (s.type === "h2") {
        h2Index += 1;
        return `<h2 id="section-${h2Index}">${escapeHtml(s.text)}</h2>`;
      }
      if (s.type === "p") return `<p>${escapeHtml(s.text)}</p>`;
      if (s.type === "ul") {
        return `<ul>${s.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
      }
      return "";
    })
    .join("\n        ");
}

function buildArticleSchema(post, pageUrl) {
  const wordCount = post.sections
    .map((s) => (s.text || "") + (s.items || []).join(" "))
    .join(" ")
    .split(/\s+/).length;

  return stringifySchemaGraph([
    buildWebPageNode({
      pageUrl,
      name: post.title,
      description: post.description,
      dateModified: post.date,
    }),
    buildBreadcrumbNode(
      [
        { label: "Trang chủ", href: "/" },
        { label: "Blog", href: "/blog/" },
        { label: post.title, href: `${getBlogPostPath(post.slug)}/` },
      ],
      pageUrl
    ),
    {
      "@type": "BlogPosting",
      "@id": `${pageUrl}#article`,
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      inLanguage: "vi-VN",
      url: pageUrl,
      wordCount,
      author: { "@type": "Organization", "@id": `${SITE_CONFIG.url}/#organization` },
      publisher: { "@id": `${SITE_CONFIG.url}/#organization` },
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
      articleSection: post.category,
      image: [absoluteImageUrl(getBlogPostImage(post))],
      thumbnailUrl: absoluteImageUrl(getBlogPostImage(post)),
      ...(post.aiSummary
        ? {
            abstract: post.aiSummary,
          }
        : {}),
    },
    ...(post.aiSummary
      ? [
          {
            "@type": "QAPage",
            mainEntity: {
              "@type": "Question",
              name: post.title,
              acceptedAnswer: {
                "@type": "Answer",
                text: post.aiSummary,
              },
            },
          },
        ]
      : []),
  ]);
}

function renderArticleSidebar(post, relatedBlog, relatedSeo) {
  const relatedPosts = relatedBlog
    .map(
      (b) =>
        `<li><a href="${getBlogPostPath(b.slug)}/">${escapeHtml(b.title)}</a></li>`
    )
    .join("");
  const seoLinks = relatedSeo
    .map((s) => `<li><a href="/${s.slug}/">${escapeHtml(s.h1)}</a></li>`)
    .join("");

  return `<aside class="article-sidebar">
    ${buildToc(post.sections)}
    <div class="sidebar-box sidebar-cta">
      <h3>Đặt thuê máy</h3>
      <p>Lịch trống realtime — Phú Nhuận &amp; Q9 Thủ Đức.</p>
      <a class="btn" href="${escapeHtml(catalogHref(post.ctaLink || "/catalog", "blog", post.slug))}">${escapeHtml(post.ctaLabel || "Xem catalog")}</a>
    </div>
    ${
      relatedPosts
        ? `<div class="sidebar-box"><h3>Bài liên quan</h3><ul>${relatedPosts}</ul></div>`
        : ""
    }
    ${
      seoLinks
        ? `<div class="sidebar-box"><h3>Dịch vụ FAO</h3><ul>${seoLinks}</ul></div>`
        : ""
    }
    <div class="sidebar-box">
      <h3>Liên kết</h3>
      <ul>
        <li><a href="/">Trang chủ đặt máy</a></li>
        <li><a href="/catalog">Catalog thiết bị</a></li>
        <li><a href="/feedback">Feedback khách thuê</a></li>
      </ul>
    </div>
  </aside>`;
}

function renderArticle(post) {
  const path = getBlogPostPath(post.slug);
  const pageUrl = `${SITE_CONFIG.url}${path}`;
  const relatedBlog = (post.relatedBlogSlugs || [])
    .map((s) => BLOG_POSTS_BY_SLUG[s])
    .filter(Boolean);
  const relatedSeo = (post.relatedSeoSlugs || [])
    .map((s) => SEO_PAGES_BY_SLUG[s])
    .filter(Boolean);

  const aiSummary = post.aiSummary || post.excerpt;
  const aiBox = renderAiAnswerBox({
    summary: aiSummary,
    highlight: post.aiHighlight,
    sourcePath: `${path}/`,
    sourceLabel: "FAO Blog",
  });

  const articleHero = `<figure class="article-hero" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
              ${renderPostThumb(post, "")}
              <meta itemprop="caption" content="${escapeHtml(postImageAlt(post))}" />
            </figure>`;

  return `${renderHead({
    title: post.title,
    description: post.description,
    path,
    jsonLd: buildArticleSchema({ ...post, aiSummary }, pageUrl),
    ogType: "article",
    image: getBlogPostImage(post),
  })}
<body>
  ${renderSiteHeader({ active: "blog" })}
  <main>
    <div class="wrap">
      ${renderBreadcrumb([
        { label: "Trang chủ", href: "/" },
        { label: "Blog", href: "/blog/" },
        { label: post.category, href: "/blog/" },
      ])}
      <div class="article-layout">
        <div class="article-main">
          <article itemscope itemtype="https://schema.org/BlogPosting">
            ${articleHero}
            <h1 itemprop="headline">${escapeHtml(post.title)}</h1>
            <div class="article-meta">
              <time datetime="${post.date}" itemprop="datePublished">${formatDateVi(post.date)}</time>
              <span class="tag" itemprop="articleSection">${escapeHtml(post.category)}</span>
              <span>${post.readMinutes} phút đọc</span>
              <span>Bởi ${escapeHtml(SITE_CONFIG.brand)}</span>
            </div>
            ${aiBox}
            <p class="article-lead" itemprop="description">${escapeHtml(post.excerpt)}</p>
            <div itemprop="articleBody">
              ${renderSections(post.sections)}
            </div>
          </article>
        </div>
        ${renderArticleSidebar(post, relatedBlog, relatedSeo)}
      </div>
    </div>
  </main>
  ${renderSiteFooter()}
  ${renderAttributionBootstrapScript("blog", post.slug)}
</body>
</html>`;
}

function renderBlogIndex() {
  const path = "/blog";
  const [featured, ...rest] = BLOG_POSTS_SORTED;

  const featuredMain = featured
    ? `<a class="featured-main" href="${getBlogPostPath(featured.slug)}/">
      ${renderPostThumb(featured, "thumb-bg")}
      <div class="card-content">
        <span class="tag">${escapeHtml(featured.category)}</span>
        <h2>${escapeHtml(featured.title)}</h2>
        <p>${escapeHtml(featured.excerpt)}</p>
      </div>
    </a>`
    : "";

  const featuredSide = rest
    .slice(0, 2)
    .map(
      (p) => `<a class="mini-card" href="${getBlogPostPath(p.slug)}/">
      ${renderPostThumb(p, "mini-thumb")}
      <div class="mini-body">
        <span class="tag">${escapeHtml(p.category)}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.excerpt)}</p>
      </div>
    </a>`
    )
    .join("");

  const gridPosts = BLOG_POSTS_SORTED.map(
    (p) => `<a class="post-card" href="${getBlogPostPath(p.slug)}/">
      <div class="post-card-thumb">${renderPostThumb(p, "")}</div>
      <div class="post-card-body">
        <div class="meta">
          <span class="tag-pill">${escapeHtml(p.category)}</span>
          <span>${formatDateVi(p.date)} · ${p.readMinutes} phút</span>
        </div>
        <h2>${escapeHtml(p.title)}</h2>
        <p>${escapeHtml(p.excerpt)}</p>
        <span class="read-more">Đọc tiếp →</span>
      </div>
    </a>`
  ).join("\n      ");

  const seoLinks = Object.values(SEO_PAGES_BY_SLUG)
    .slice(0, 8)
    .map((s) => `<a href="/${s.slug}/">${escapeHtml(s.h1)}</a>`)
    .join("\n          ");

  const jsonLd = stringifySchemaGraph([
    buildWebPageNode({
      pageUrl: `${SITE_CONFIG.url}/blog/`,
      name: "Blog FAO — Thuê máy ảnh Sài Gòn",
      description:
        "Kinh nghiệm thuê máy ảnh, review thiết bị và hướng dẫn chụp ảnh tại FAO TP.HCM.",
    }),
    buildBreadcrumbNode(
      [
        { label: "Trang chủ", href: "/" },
        { label: "Blog", href: "/blog/" },
      ],
      `${SITE_CONFIG.url}/blog/`
    ),
    {
      "@type": "Blog",
      "@id": `${SITE_CONFIG.url}/blog/#blog`,
      name: "FAO Blog — Thuê máy ảnh Sài Gòn",
      description:
        "Kinh nghiệm thuê máy ảnh, review thiết bị và hướng dẫn chụp ảnh tại FAO TP.HCM.",
      url: `${SITE_CONFIG.url}/blog/`,
      inLanguage: "vi-VN",
      publisher: { "@id": `${SITE_CONFIG.url}/#organization` },
      blogPost: BLOG_POSTS.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `${SITE_CONFIG.url}${getBlogPostPath(p.slug)}`,
        datePublished: p.date,
        image: absoluteImageUrl(getBlogPostImage(p)),
      })),
    },
  ]);

  const indexOgImage = featured
    ? getBlogPostImage(featured)
    : DEFAULT_BLOG_IMAGE;

  return `${renderHead({
    title: "Blog thuê máy ảnh & tips chụp ảnh",
    description:
      "Blog FAO — kinh nghiệm thuê máy ảnh, review vlog/TikTok, hướng dẫn chụp áo dài Tết và tips Fujifilm tại Sài Gòn.",
    path,
    jsonLd,
    image: indexOgImage,
  })}
<body>
  ${renderSiteHeader({ active: "blog" })}
  <main>
    <div class="wrap">
      ${renderBreadcrumb([
        { label: "Trang chủ", href: "/" },
        { label: "Blog", href: "/blog/" },
      ])}
      <header class="blog-hero">
        <h1>Blog FAO</h1>
        <p>Kinh nghiệm thuê máy, review thiết bị và mẹo chụp ảnh — từ đội ngũ FAO Camera Sài Gòn.</p>
      </header>
      <section class="blog-featured" aria-label="Bài nổi bật">
        ${featuredMain}
        <div class="featured-side">${featuredSide}</div>
      </section>
      <section aria-label="Tất cả bài viết">
        <div class="post-grid">
          ${gridPosts}
        </div>
      </section>
      <section class="cross-links">
        <h2>Dịch vụ cho thuê tại FAO</h2>
        <div class="cross-grid">${seoLinks}</div>
      </section>
    </div>
  </main>
  ${renderSiteFooter()}
  ${renderAttributionBootstrapScript("blog", "")}
</body>
</html>`;
}

const currentSlugs = BLOG_POSTS.map((p) => p.slug);
cleanupRemovedBlogPosts(currentSlugs);

mkdirSync(BLOG_DIR, { recursive: true });
writeFileSync(join(BLOG_DIR, "index.html"), renderBlogIndex(), "utf8");
console.log("  ✓ /blog/index.html");

for (const post of BLOG_POSTS) {
  const legacyDir = join(BLOG_DIR, post.slug);
  if (existsSync(legacyDir)) {
    rmSync(legacyDir, { recursive: true });
  }
  const outDir = join(PUBLIC_DIR, post.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), renderArticle(post), "utf8");
  console.log(`  ✓ /${post.slug}/index.html`);
}

console.log(`\nGenerated blog index + ${BLOG_POSTS.length} articles at public/<slug>/`);
