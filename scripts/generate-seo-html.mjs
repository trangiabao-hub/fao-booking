/**
 * Build-time: sinh HTML tĩnh cho trang SEO — tối ưu Google AI Overview.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { SEO_PAGES, SEO_PAGES_BY_SLUG } from "../src/data/seoPages.js";
import {
  escapeHtml,
  renderHead,
  renderSiteHeader,
  renderSiteFooter,
  renderBreadcrumb,
  renderAiAnswerBox,
  renderLocalBusinessCard,
  stringifySchemaGraph,
  buildWebPageNode,
  buildBreadcrumbNode,
  buildLocalBusinessNode,
  SITE_CONFIG,
  catalogHref,
  renderAttributionBootstrapScript,
} from "./static-site-layout.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");

function buildSchema(page, pageUrl) {
  const graph = [
    buildWebPageNode({
      pageUrl,
      name: page.h1,
      description: page.description,
    }),
    buildBreadcrumbNode(
      [
        { label: "Trang chủ", href: "/" },
        { label: page.h1, href: `/${page.slug}/` },
      ],
      pageUrl
    ),
    {
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: page.faq.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ];

  if (page.aiSummary) {
    graph.push({
      "@type": "QAPage",
      mainEntity: {
        "@type": "Question",
        name: page.h1,
        acceptedAnswer: {
          "@type": "Answer",
          text: page.aiSummary,
          author: { "@id": `${SITE_CONFIG.url}/#organization` },
        },
      },
    });
  }

  if (page.localBusiness) {
    graph.push(buildLocalBusinessNode(page.localBusiness, pageUrl));
  }

  return stringifySchemaGraph(graph);
}

function renderPage(page) {
  const path = `/${page.slug}`;
  const pageUrl = `${SITE_CONFIG.url}${path}`;
  const related = (page.relatedSlugs || [])
    .map((s) => SEO_PAGES_BY_SLUG[s])
    .filter(Boolean);

  const devicesHtml = (page.devices || [])
    .map(
      (d) =>
        `<a class="card" href="${escapeHtml(d.link)}"><strong>${escapeHtml(d.name)}</strong><span>${escapeHtml(d.desc)}</span></a>`
    )
    .join("\n          ");

  const faqHtml = page.faq
    .map(
      ({ q, a }) =>
        `<details itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
          <summary itemprop="name">${escapeHtml(q)}</summary>
          <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
            <p itemprop="text">${escapeHtml(a)}</p>
          </div>
        </details>`
    )
    .join("\n          ");

  const relatedHtml = related
    .map((r) => `<li><a href="/${r.slug}/">${escapeHtml(r.h1)}</a></li>`)
    .join("\n            ");

  const aiBox =
    page.aiSummary &&
    renderAiAnswerBox({
      summary: page.aiSummary,
      highlight: page.aiHighlight,
      sourcePath: `${path}/`,
      sourceLabel: "FAO Booking",
    });

  const localCard =
    page.localBusiness &&
    renderLocalBusinessCard(page.localBusiness, page.pros || []);

  return `${renderHead({
    title: page.title,
    description: page.description,
    path,
    jsonLd: buildSchema(page, pageUrl),
  })}
<body>
  ${renderSiteHeader({ active: "catalog", ctaHref: catalogHref(page.ctaLink || "/catalog", "seo", page.slug), ctaLabel: page.ctaLabel || "Đặt máy" })}
  <main>
    <div class="wrap">
      ${renderBreadcrumb([
        { label: "Trang chủ", href: "/" },
        { label: page.h1, href: `${path}/` },
      ])}
      <article class="seo-hero" itemscope itemtype="https://schema.org/Article">
        <h1 itemprop="headline">${escapeHtml(page.h1)}</h1>
        ${aiBox || ""}
        <p class="intro" itemprop="description">${escapeHtml(page.intro)}</p>
        <p class="byline">Cập nhật bởi <span itemprop="author">${escapeHtml(SITE_CONFIG.brand)}</span></p>

        ${localCard || ""}

        <section class="block">
          <h2 class="accent">Vì sao chọn FAO?</h2>
          <ul class="check">
            ${page.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join("\n            ")}
          </ul>
        </section>

        ${
          page.devices?.length
            ? `<section class="block">
          <h2>Máy phổ biến</h2>
          <div class="grid cols-2">
          ${devicesHtml}
          </div>
        </section>`
            : ""
        }

        <section class="block faq" itemscope itemtype="https://schema.org/FAQPage">
          <h2>Câu hỏi thường gặp</h2>
          ${faqHtml}
        </section>

        <section class="cta-panel">
          <h2>Sẵn sàng thuê máy?</h2>
          <p>Đặt lịch online — lịch trống realtime, thanh toán nhanh.</p>
          <div class="cta-btns">
            <a class="primary" href="${escapeHtml(catalogHref(page.ctaLink || "/catalog", "seo", page.slug))}">${escapeHtml(page.ctaLabel || "Đặt thuê ngay")}</a>
            <a class="secondary" href="/hop-dong-thue-chuan">Xem hợp đồng mẫu</a>
            <a class="secondary" href="/blog/">Đọc hướng dẫn Blog</a>
          </div>
        </section>

        ${
          related.length
            ? `<section class="block cross-links">
          <h2>Xem thêm dịch vụ</h2>
          <ul class="link-list cross-grid">
            ${relatedHtml}
            <li><a href="/blog/">Blog kinh nghiệm thuê máy</a></li>
          </ul>
        </section>`
            : ""
        }
      </article>
    </div>
  </main>
  ${renderSiteFooter()}
  ${renderAttributionBootstrapScript("seo", page.slug)}
</body>
</html>`;
}

let count = 0;
for (const page of SEO_PAGES) {
  const outDir = join(PUBLIC_DIR, page.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), renderPage(page), "utf8");
  count++;
  console.log(`  ✓ /${page.slug}/index.html`);
}

console.log(`\nGenerated ${count} static SEO pages → public/<slug>/index.html`);
