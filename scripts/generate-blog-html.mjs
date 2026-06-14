/**
 * Sinh trang blog tĩnh — editorial magazine UI + SEO/AI-friendly.
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
import {
  getAllBlogListingPosts,
  getBlogListingCategories,
  loadDeviceReviewBlogPosts,
} from "./lib/deviceReviewBlog.mjs";
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
  renderHeaderNavScript,
} from "./static-site-layout.mjs";
import {
  BLOG_CSS,
  renderCategoryPill,
  renderReadingProgress,
  renderBlogSearch,
  renderThemeToggle,
  renderInlineCta,
  renderRelatedCards,
  renderArticleNav,
  renderTocRail,
  renderTocMobile,
  renderBlogIndexScripts,
  renderBlogArticleScripts,
} from "./lib/blogUi.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");
const BLOG_DIR = join(PUBLIC_DIR, "blog");
const SLUG_MANIFEST = join(__dirname, "../src/data/.blog-slugs-manifest.json");
const SEO_SLUGS = new Set(SEO_PAGES.map((p) => p.slug));
const DEVICE_REVIEW_SLUGS = new Set(loadDeviceReviewBlogPosts().map((p) => p.slug));
const PROTECTED_STATIC_SLUGS = new Set([
  ...SEO_SLUGS,
  ...DEVICE_REVIEW_SLUGS,
  "bang-gia-thue-may-anh",
]);

function isProtectedStaticSlug(slug) {
  return PROTECTED_STATIC_SLUGS.has(slug);
}

function discoverBlogDirsOnDisk() {
  if (!existsSync(PUBLIC_DIR)) return [];
  return readdirSync(PUBLIC_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "blog" && !isProtectedStaticSlug(e.name))
    .filter((e) => existsSync(join(PUBLIC_DIR, e.name, "index.html")))
    .map((e) => e.name);
}

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
    previous = discoverBlogDirsOnDisk();
  }

  for (const slug of previous) {
    if (current.has(slug) || isProtectedStaticSlug(slug)) continue;
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

  try {
    writeFileSync(SLUG_MANIFEST, JSON.stringify([...current], null, 2), "utf8");
  } catch (err) {
    console.warn(`  ⚠ could not update blog slug manifest: ${err.message}`);
  }
}

function postImageAlt(post) {
  return post.imageAlt || post.title;
}

function renderImg(src, alt, className = "", opts = {}) {
  const loading = opts.eager ? "eager" : "lazy";
  const fetch = opts.eager ? ' fetchpriority="high"' : "";
  const dims =
    opts.width && opts.height ? ` width="${opts.width}" height="${opts.height}"` : "";
  return `<img class="${className}" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async"${fetch}${dims} />`;
}

function renderPostThumb(post, className, eager = false) {
  return renderImg(getBlogPostImage(post), postImageAlt(post), className, {
    eager,
    width: 800,
    height: 500,
  });
}

const formatDateVi = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

function getHeadings(sections) {
  return sections.filter((s) => s.type === "h2");
}

function renderSectionsWithInlineCta(sections, post) {
  let h2Index = 0;
  let insertedCta = false;
  const h2Total = sections.filter((s) => s.type === "h2").length;
  const ctaAfter = Math.max(1, Math.floor(h2Total / 2));

  return sections
    .map((s) => {
      let html = "";
      if (s.type === "h2") {
        h2Index += 1;
        html = `<h2 id="section-${h2Index}">${escapeHtml(s.text)}</h2>`;
        if (!insertedCta && h2Index === ctaAfter) {
          insertedCta = true;
          html += renderInlineCta(post);
        }
      } else if (s.type === "p") {
        html = `<p>${escapeHtml(s.text)}</p>`;
      } else if (s.type === "ul") {
        html = `<ul>${s.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
      }
      return html;
    })
    .join("\n              ");
}

function buildArticleSchema(post, pageUrl) {
  const wordCount = post.sections
    .map((s) => (s.text || "") + (s.items || []).join(" "))
    .join(" ")
    .split(/\s+/).length;
  const aiSummary = post.aiSummary || post.excerpt;

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
      ...(aiSummary ? { abstract: aiSummary } : {}),
    },
    ...(aiSummary
      ? [
          {
            "@type": "FAQPage",
            "@id": `${pageUrl}#faq`,
            mainEntity: [
              {
                "@type": "Question",
                name: post.title,
                acceptedAnswer: { "@type": "Answer", text: aiSummary },
              },
            ],
          },
        ]
      : []),
  ]);
}

function renderArticleSidebar(post, relatedBlog, relatedSeo, catalogLink) {
  const relatedList = relatedBlog
    .slice(0, 4)
    .map(
      (b) =>
        `<li><a href="${getBlogPostPath(b.slug)}/">${escapeHtml(b.title)}</a></li>`
    )
    .join("");
  const seoLinks = relatedSeo
    .map((s) => `<li><a href="/${s.slug}/">${escapeHtml(s.h1)}</a></li>`)
    .join("");

  return `<aside class="blog-sidebar-rail">
    <div class="sidebar-box sidebar-cta">
      <h3>Đặt thuê máy</h3>
      <p>Lịch trống realtime — Phú Nhuận &amp; Q9 Thủ Đức.</p>
      <a class="btn" href="${escapeHtml(catalogLink)}">${escapeHtml(post.ctaLabel || "Xem catalog")}</a>
    </div>
    ${relatedList ? `<div class="sidebar-box"><h3>Bài liên quan</h3><ul>${relatedList}</ul></div>` : ""}
    ${seoLinks ? `<div class="sidebar-box"><h3>Dịch vụ FAO</h3><ul>${seoLinks}</ul></div>` : ""}
    <div class="sidebar-box">
      <h3>Khám phá</h3>
      <ul>
        <li><a href="/bang-gia-thue-may-anh/">Bảng giá thuê máy</a></li>
        <li><a href="/blog/?tag=Review">Review thiết bị</a></li>
        <li><a href="/catalog">Catalog đặt lịch</a></li>
        <li><a href="/feedback">Feedback khách thuê</a></li>
      </ul>
    </div>
  </aside>`;
}

function getAdjacentPosts(slug) {
  const idx = BLOG_POSTS_SORTED.findIndex((p) => p.slug === slug);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? BLOG_POSTS_SORTED[idx - 1] : null,
    next: idx < BLOG_POSTS_SORTED.length - 1 ? BLOG_POSTS_SORTED[idx + 1] : null,
  };
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
  const catalogLink = catalogHref(post.ctaLink || "/catalog", "blog", post.slug);
  const aiSummary = post.aiSummary || post.excerpt;
  const headings = getHeadings(post.sections);
  const tocMobile = renderTocMobile(headings);
  const { prev, next } = getAdjacentPosts(post.slug);

  const aiBox = renderAiAnswerBox({
    summary: aiSummary,
    highlight: post.aiHighlight,
    sourcePath: `${path}/`,
    sourceLabel: "FAO Blog",
  });

  const articleHero = `<figure class="article-hero" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
                ${renderPostThumb(post, "", true)}
                <meta itemprop="caption" content="${escapeHtml(postImageAlt(post))}" />
              </figure>`;

  return `${renderHead({
    title: post.title,
    description: post.description,
    path,
    jsonLd: buildArticleSchema({ ...post, aiSummary }, pageUrl),
    ogType: "article",
    image: getBlogPostImage(post),
    extraCss: BLOG_CSS,
  })}
<body class="blog-page blog-article">
  ${renderReadingProgress()}
  ${renderSiteHeader({ active: "blog", ctaHref: catalogLink, ctaLabel: "Đặt máy" })}
  <main>
    <div class="wrap blog-wrap">
      ${renderBreadcrumb([
        { label: "Trang chủ", href: "/" },
        { label: "Blog", href: "/blog/" },
        { label: post.category, href: `/blog/?tag=${encodeURIComponent(post.category)}` },
      ])}
      <div style="display:flex;justify-content:flex-end;margin-bottom:12px">${renderThemeToggle()}</div>
      <div class="blog-article-shell">
        ${renderTocRail(headings)}
        <div class="blog-prose-wrap">
          <article class="blog-prose" itemscope itemtype="https://schema.org/BlogPosting">
            ${articleHero}
            <h1 itemprop="headline">${escapeHtml(post.title)}</h1>
            <div class="article-meta">
              <time datetime="${post.date}" itemprop="datePublished">${formatDateVi(post.date)}</time>
              ${renderCategoryPill(post.category)}
              <span>${post.readMinutes} phút đọc</span>
              <span>${escapeHtml(SITE_CONFIG.brand)}</span>
            </div>
            ${aiBox}
            <p class="article-lead intro" itemprop="description">${escapeHtml(post.excerpt)}</p>
            <div class="blog-prose-body" itemprop="articleBody">
              ${renderSectionsWithInlineCta(post.sections, { ...post, ctaLink: catalogLink })}
            </div>
            ${renderInlineCta({ ...post, ctaLink: catalogLink })}
            ${renderRelatedCards(relatedBlog, (p) => getBlogPostPath(p.slug), getBlogPostImage, formatDateVi)}
            ${renderArticleNav(prev, next, (p) => getBlogPostPath(p.slug))}
          </article>
        </div>
        ${renderArticleSidebar(post, relatedBlog, relatedSeo, catalogLink)}
      </div>
    </div>
  </main>
  ${renderSiteFooter()}
  ${renderHeaderNavScript()}
  ${tocMobile.fab}
  ${tocMobile.sheet}
  <div class="mobile-cta-bar" aria-label="Hành động nhanh">
    <a class="secondary" href="/blog/">← Blog</a>
    <a class="primary" href="${escapeHtml(catalogLink)}">${escapeHtml(post.ctaLabel || "Đặt máy")}</a>
  </div>
  ${renderBlogArticleScripts()}
  ${renderAttributionBootstrapScript("blog", post.slug)}
</body>
</html>`;
}

function renderBlogIndex() {
  const path = "/blog";
  const allPosts = getAllBlogListingPosts(BLOG_POSTS);
  const categories = getBlogListingCategories(allPosts);
  const [featured, ...rest] = BLOG_POSTS_SORTED;

  const featuredMain = featured
    ? `<a class="featured-main" href="${getBlogPostPath(featured.slug)}/">
      ${renderPostThumb(featured, "thumb-bg", true)}
      <div class="card-content">
        ${renderCategoryPill(featured.category)}
        <h2>${escapeHtml(featured.title)}</h2>
        <p>${escapeHtml(featured.excerpt)}</p>
        <div class="meta-row">
          <span>${formatDateVi(featured.date)}</span>
          <span>${featured.readMinutes} phút đọc</span>
        </div>
      </div>
    </a>`
    : "";

  const featuredSide = rest
    .slice(0, 2)
    .map(
      (p) => `<a class="mini-card" href="${getBlogPostPath(p.slug)}/">
      ${renderPostThumb(p, "mini-thumb")}
      <div class="mini-body">
        ${renderCategoryPill(p.category)}
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.excerpt)}</p>
      </div>
    </a>`
    )
    .join("");

  const gridPosts = allPosts
    .map((p) => {
      const searchBlob = `${p.title} ${p.excerpt} ${p.category}`.toLowerCase();
      return `<a class="post-card" href="${getBlogPostPath(p.slug)}/" data-category="${escapeHtml(p.category)}" data-search="${escapeHtml(searchBlob)}">
      <div class="post-card-thumb">${renderPostThumb(p, "")}</div>
      <div class="post-card-body">
        <div class="meta">
          ${renderCategoryPill(p.tagLabel || p.category)}
          <span>${formatDateVi(p.date)} · ${p.readMinutes} phút</span>
        </div>
        <h2>${escapeHtml(p.title)}</h2>
        <p>${escapeHtml(p.excerpt)}</p>
        <span class="read-more">Đọc tiếp →</span>
      </div>
    </a>`;
    })
    .join("\n      ");

  const filterChips = `<button type="button" class="filter-chip" data-filter="all">Tất cả</button>${categories
    .map(
      (c) =>
        `<button type="button" class="filter-chip" data-filter="${escapeHtml(c)}">${escapeHtml(c)}</button>`
    )
    .join("")}`;

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
      blogPost: allPosts.map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        url: `${SITE_CONFIG.url}${getBlogPostPath(p.slug)}`,
        datePublished: p.date,
        image: absoluteImageUrl(getBlogPostImage(p)),
        articleSection: p.category,
      })),
    },
  ]);

  const indexOgImage = featured ? getBlogPostImage(featured) : DEFAULT_BLOG_IMAGE;

  return `${renderHead({
    title: "Blog thuê máy ảnh & tips chụp ảnh",
    description:
      "Blog FAO — kinh nghiệm thuê máy ảnh, review thiết bị, hướng dẫn chụp kỷ yếu và tips Fujifilm tại Sài Gòn. Đọc miễn phí, đặt máy online.",
    path,
    jsonLd,
    image: indexOgImage,
    extraCss: BLOG_CSS,
  })}
<body class="blog-page">
  ${renderSiteHeader({ active: "blog", ctaHref: "/catalog", ctaLabel: "Đặt máy" })}
  <main>
    <div class="wrap blog-wrap">
      ${renderBreadcrumb([
        { label: "Trang chủ", href: "/" },
        { label: "Blog", href: "/blog/" },
      ])}
      <header class="blog-index-hero">
        <p class="eyebrow">FAO Camera · Editorial</p>
        <h1>Blog thuê máy &amp; nhiếp ảnh</h1>
        <p>Kinh nghiệm thuê máy, review thiết bị và mẹo chụp ảnh — từ đội ngũ FAO Camera Sài Gòn.</p>
      </header>
      <div class="blog-toolbar">
        ${renderBlogSearch()}
        ${renderThemeToggle()}
      </div>
      <section class="blog-featured" aria-label="Bài nổi bật">
        ${featuredMain}
        <div class="featured-side">${featuredSide}</div>
      </section>
      <div class="blog-filters-scroll">
        <div class="blog-filters" role="group" aria-label="Lọc theo chủ đề">
          ${filterChips}
        </div>
      </div>
      <section aria-label="Tất cả bài viết">
        <div class="post-grid" id="post-grid">
          ${gridPosts}
        </div>
        <div class="blog-empty" id="blog-empty" hidden>
          <h3>Không tìm thấy bài viết</h3>
          <p>Thử từ khóa khác hoặc chọn chủ đề &quot;Tất cả&quot;.</p>
        </div>
      </section>
      <section class="blog-services" aria-label="Dịch vụ FAO">
        <h2>Dịch vụ cho thuê tại FAO</h2>
        <div class="cross-grid">${seoLinks}</div>
      </section>
    </div>
  </main>
  ${renderSiteFooter()}
  ${renderHeaderNavScript()}
  ${renderBlogIndexScripts(["all", ...categories])}
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
