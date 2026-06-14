/**
 * Sinh trang SEO từng model máy + bảng giá tổng — fetch API lúc build.
 */
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BRANCHES, branchToLocalBusiness } from "../src/data/localBusiness.js";
import {
  escapeHtml,
  renderHead,
  renderSiteHeader,
  renderHeaderNavScript,
  renderSiteFooter,
  renderBreadcrumb,
  renderAiAnswerBox,
  renderLocalBusinessCard,
  renderFaoBranchesUnifiedCard,
  stringifySchemaGraph,
  buildWebPageNode,
  buildBreadcrumbNode,
  buildOrganizationNode,
  buildWebsiteNode,
  SITE_CONFIG,
  catalogHref,
  renderAttributionBootstrapScript,
  absoluteImageUrl,
  buildLocalBusinessNode,
} from "./static-site-layout.mjs";
import {
  BLOG_CSS,
  renderReadingProgress,
  renderTocRail,
  renderTocMobile,
  renderBlogArticleScripts,
  renderThemeToggle,
  renderArticleNav,
} from "./lib/blogUi.mjs";
import { getDeviceSearchKeywords } from "./lib/deviceSeoKeywords.mjs";
import {
  DEVICE_REVIEW_CSS,
  renderReviewHero,
  renderReviewStats,
  renderReviewSectionNav,
  renderWhyFaoGrid,
  renderReviewSections,
  renderFaqAccordion,
  renderReviewSidebar,
  renderSrKeywords,
} from "./lib/deviceReviewUi.mjs";
import {
  TODAY_HOOK_CSS,
  renderTodayHook,
  renderTodayHookScript,
} from "./lib/deviceTodayHook.mjs";
import {
  loadOrFetchDeviceModels,
  buildDeviceAiSummary,
  buildDeviceDisplaySummary,
  buildDeviceFaqs,
  buildDeviceReviewSections,
  buildDevicePageTitle,
  buildDevicePageDescription,
  buildDevicePageH1,
  pickRelatedModels,
  formatVnd,
  applyOnlineWeekdayDiscount,
} from "./lib/deviceCatalogSeo.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "../public");

function loadApiUrl() {
  if (process.env.VITE_API_URL) return process.env.VITE_API_URL;
  try {
    const envPath = join(__dirname, "../.env.product");
    const raw = readFileSync(envPath, "utf8");
    const m = raw.match(/^VITE_API_URL=(.+)$/m);
    if (m) return m[1].trim();
  } catch {
    /* ignore */
  }
  return "https://api.faodigital.vn/api/";
}

const API_URL = loadApiUrl();

function renderShopStrip() {
  const cards = [BRANCHES.PHU_NHUAN, BRANCHES.Q9].map((b) => {
    const lb = branchToLocalBusiness(b);
    return `<div class="shop-mini">
  <h3>${escapeHtml(b.name)}</h3>
  <p>${escapeHtml(b.fullAddress)}</p>
  <p>📞 <a href="tel:${escapeHtml(b.phone)}">${escapeHtml(b.phoneDisplay)}</a> · 9h–22h</p>
  <a href="/${b.slug}/">Chi tiết chi nhánh →</a>
</div>`;
  });
  return `<section class="block">
  <h2 class="accent">Chi nhánh FAO Camera</h2>
  <div class="shop-strip">${cards.join("")}</div>
</section>`;
}

function getReviewHeadings(sections, feedbackPath) {
  const headings = sections.filter((s) => s.type === "h2");
  headings.push({ type: "h2", text: "Câu hỏi thường gặp" });
  headings.push({ type: "external", text: "Feedback ảnh thật", href: feedbackPath });
  return headings;
}

function getAdjacentDevices(allModels, current) {
  const idx = allModels.findIndex((x) => x.modelKey === current.modelKey);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? allModels[idx - 1] : null,
    next: idx < allModels.length - 1 ? allModels[idx + 1] : null,
  };
}

function devicePath(m) {
  return `/${m.slug}`;
}

function deviceBookHref(m, slug) {
  return catalogHref(m.bookPath, "seo", slug);
}

function renderDeviceGeoStrip(m) {
  const branchKeys = [];
  if (m.branches.includes("PHU_NHUAN")) branchKeys.push("PHU_NHUAN");
  if (m.branches.includes("Q9")) branchKeys.push("Q9");
  if (!branchKeys.length) branchKeys.push("PHU_NHUAN");
  return `<div class="review-branches">${renderFaoBranchesUnifiedCard(branchKeys)}</div>`;
}

function buildDeviceSchema(m, pageUrl) {
  const faqs = buildDeviceFaqs(m);
  const aiSummary = buildDeviceAiSummary(m);
  const branchNodes = [];
  if (m.branches.includes("PHU_NHUAN")) {
    branchNodes.push(buildLocalBusinessNode(branchToLocalBusiness(BRANCHES.PHU_NHUAN), `${SITE_CONFIG.url}/thue-may-anh-phu-nhuan/`));
  }
  if (m.branches.includes("Q9")) {
    branchNodes.push(buildLocalBusinessNode(branchToLocalBusiness(BRANCHES.Q9), `${SITE_CONFIG.url}/thue-may-anh-thu-duc/`));
  }

  return stringifySchemaGraph([
    buildWebPageNode({
      pageUrl,
      name: buildDevicePageH1(m),
      description: buildDevicePageDescription(m),
      dateModified: new Date().toISOString().slice(0, 10),
    }),
    buildBreadcrumbNode(
      [
        { label: "Trang chủ", href: "/" },
        { label: "Bảng giá", href: "/bang-gia-thue-may-anh/" },
        { label: m.displayName, href: `/${m.slug}/` },
      ],
      pageUrl
    ),
    {
      "@type": "BlogPosting",
      "@id": `${pageUrl}#article`,
      headline: buildDevicePageH1(m),
      description: buildDevicePageDescription(m),
      datePublished: new Date().toISOString().slice(0, 10),
      dateModified: new Date().toISOString().slice(0, 10),
      inLanguage: "vi-VN",
      url: pageUrl,
      articleSection: "Review",
      keywords: getDeviceSearchKeywords(m).slice(0, 12).join(", "),
      author: { "@id": `${SITE_CONFIG.url}/#organization` },
      publisher: { "@id": `${SITE_CONFIG.url}/#organization` },
      image: m.image ? [m.image] : [absoluteImageUrl("/og-image.png")],
      mainEntityOfPage: { "@id": `${pageUrl}#webpage` },
    },
    {
      "@type": "Product",
      "@id": `${pageUrl}#product`,
      name: m.displayName,
      description: m.useCase,
      brand: { "@type": "Brand", name: m.brandLabel },
      category: "Camera Rental",
      image: m.image ? [m.image] : [absoluteImageUrl("/og-image.png")],
      url: pageUrl,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "VND",
        lowPrice: m.priceSixHours,
        highPrice: m.priceOneDay,
        availability: "https://schema.org/InStock",
        seller: { "@id": `${SITE_CONFIG.url}/#organization` },
        offers: [
          { "@type": "Offer", name: "Thuê 6 tiếng", price: m.priceSixHours, priceCurrency: "VND" },
          { "@type": "Offer", name: "Thuê 1 ngày", price: m.priceOneDay, priceCurrency: "VND" },
          { "@type": "Offer", name: "Thuê 2 ngày", price: m.priceTwoDay, priceCurrency: "VND" },
          { "@type": "Offer", name: "Thuê 3 ngày", price: m.priceThreeDay, priceCurrency: "VND" },
        ].filter((o) => o.price > 0),
      },
    },
    {
      "@type": "Service",
      "@id": `${pageUrl}#service`,
      name: `Cho thuê ${m.displayName}`,
      description: aiSummary,
      provider: { "@id": `${SITE_CONFIG.url}/#organization` },
      areaServed: { "@type": "City", name: "TP.HCM" },
      serviceType: "Camera rental",
      offers: {
        "@type": "Offer",
        price: m.priceOneDay,
        priceCurrency: "VND",
        url: pageUrl,
      },
    },
    ...branchNodes,
    {
      "@type": "FAQPage",
      "@id": `${pageUrl}#faq`,
      mainEntity: faqs.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
    {
      "@type": "QAPage",
      mainEntity: {
        "@type": "Question",
        name: `Thuê ${m.displayName} giá rẻ TP.HCM — giá bao nhiêu?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: aiSummary,
          author: { "@id": `${SITE_CONFIG.url}/#organization` },
        },
      },
    },
  ]);
}

function renderDevicePage(m, allModels) {
  const path = `/${m.slug}`;
  const pageUrl = `${SITE_CONFIG.url}${path}`;
  const title = buildDevicePageTitle(m);
  const description = buildDevicePageDescription(m);
  const displaySummary = buildDeviceDisplaySummary(m);
  const faqs = buildDeviceFaqs(m);
  const bookHref = deviceBookHref(m, m.slug);
  const reviewSections = buildDeviceReviewSections(m);
  const related = pickRelatedModels(allModels, m);
  const branchLabel =
    m.branches.length > 1
      ? "Phú Nhuận & Thủ Đức"
      : m.branches.includes("Q9")
        ? "Thủ Đức Q9"
        : "Phú Nhuận";
  const headings = getReviewHeadings(reviewSections, m.feedbackPath);
  const tocMobile = renderTocMobile(headings);
  const faqSectionId = reviewSections.filter((s) => s.type === "h2").length + 1;
  const { prev, next } = getAdjacentDevices(allModels, m);
  const readMinutes = Math.min(5, Math.max(3, Math.ceil(faqs.length * 0.35 + 2.5)));
  const dateStr = new Date().toISOString().slice(0, 10);
  const keywords = getDeviceSearchKeywords(m);

  const aiBox = renderAiAnswerBox({
    summary: displaySummary,
    highlight: formatVnd(m.priceOneDay) + "/ngày",
    sourcePath: `${path}/`,
    sourceLabel: "FAO Booking",
  });

  const navPrev = prev ? { title: prev.displayName, slug: prev.slug } : null;
  const navNext = next ? { title: next.displayName, slug: next.slug } : null;

  return `${renderHead({
    title,
    description,
    path,
    jsonLd: buildDeviceSchema(m, pageUrl),
    image: m.image,
    ogType: "article",
    geo: true,
    extraCss: BLOG_CSS + DEVICE_REVIEW_CSS + TODAY_HOOK_CSS,
  })}
<body class="blog-page blog-article device-review-page">
  ${renderReadingProgress()}
  ${renderSiteHeader({ active: "catalog", ctaHref: bookHref, ctaLabel: "Đặt lịch ngay" })}
  <main>
    <div class="wrap blog-wrap">
      ${renderBreadcrumb([
        { label: "Trang chủ", href: "/" },
        { label: "Bảng giá", href: "/bang-gia-thue-may-anh/" },
        { label: m.displayName, href: `${path}/` },
      ])}
      <div class="review-toolbar">
        <a class="review-toolbar-back" href="/bang-gia-thue-may-anh/">← Bảng giá thuê máy</a>
        ${renderThemeToggle()}
      </div>
      <div class="blog-article-shell">
        ${renderTocRail(headings)}
        <div class="blog-prose-wrap">
          <article class="blog-prose review-article" itemscope itemtype="https://schema.org/BlogPosting">
            ${renderReviewHero(m, bookHref, branchLabel)}
            ${renderTodayHook(m, bookHref, branchLabel)}
            ${renderReviewStats(m, branchLabel)}
            <header class="review-article-header">
              <div class="article-meta">
                <time datetime="${dateStr}" itemprop="datePublished">${new Date().toLocaleDateString("vi-VN")}</time>
                <span>${readMinutes} phút đọc</span>
                <span>${escapeHtml(branchLabel)}</span>
              </div>
              ${aiBox}
              <p class="article-lead intro" itemprop="description">${escapeHtml(m.useCase)} ${escapeHtml(m.comboNote)}</p>
              ${renderSrKeywords(keywords)}
            </header>
            ${renderWhyFaoGrid()}
            ${renderReviewSectionNav(faqSectionId, m)}
            <div class="review-content-card">
              <div class="blog-prose-body" itemprop="articleBody">
                ${renderReviewSections(reviewSections, m, bookHref)}
                <h2 id="section-${faqSectionId}">Câu hỏi thường gặp</h2>
                ${renderFaqAccordion(faqs)}
                ${renderDeviceGeoStrip(m)}
              </div>
            </div>
            ${renderArticleNav(navPrev, navNext, (p) => devicePath({ slug: p.slug }))}
          </article>
        </div>
        ${renderReviewSidebar(m, related, bookHref, faqSectionId)}
      </div>
    </div>
  </main>
  ${renderSiteFooter()}
  ${renderHeaderNavScript()}
  ${tocMobile.fab}
  ${tocMobile.sheet}
  <div class="mobile-cta-bar" aria-label="Hành động nhanh">
    <a class="secondary" href="${escapeHtml(m.feedbackPath)}">Ảnh thật</a>
    <a class="primary" href="${escapeHtml(bookHref)}" data-catalog-book="1" data-today-book-sync>Đặt ${escapeHtml(m.displayName)}</a>
  </div>
  ${renderBlogArticleScripts()}
  ${renderTodayHookScript(API_URL)}
  ${renderAttributionBootstrapScript("seo", m.slug)}
</body>
</html>`;
}

function groupByBrand(models) {
  const order = ["Fujifilm", "Canon", "Sony", "DJI", "Insta 360", "Ricoh"];
  const groups = new Map();
  for (const m of models) {
    const label = m.brandLabel || m.categoryName;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(m);
  }
  const seen = [...order.filter((b) => groups.has(b)), ...[...groups.keys()].filter((k) => !order.includes(k))];
  return seen.map((brand) => ({ brand, models: groups.get(brand) }));
}

function brandSlug(brand) {
  return String(brand)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function brandAccentClass(brand) {
  const slug = brandSlug(brand);
  const known = ["fujifilm", "canon", "sony", "dji", "insta-360", "ricoh"];
  return known.includes(slug) ? `brand-accent-${slug}` : "";
}

function discountPrice(price) {
  return applyOnlineWeekdayDiscount(price);
}

function renderPriceCell(original) {
  const sale = discountPrice(original);
  if (!original || sale >= original) {
    return `<span class="price-sale">${escapeHtml(formatVnd(original))}</span>`;
  }
  return `<div class="price-cell"><span class="price-sale">${escapeHtml(formatVnd(sale))}</span><span class="price-was">${escapeHtml(formatVnd(original))}</span></div>`;
}

function renderPriceHero(original, unit = "/ngày") {
  const sale = discountPrice(original);
  if (!original || sale >= original) {
    return `<span class="price-sale">${escapeHtml(formatVnd(original))}<small>${unit}</small></span>`;
  }
  return `<span class="price-was">${escapeHtml(formatVnd(original))}</span><span class="price-sale">${escapeHtml(formatVnd(sale))}<small>${unit}</small></span>`;
}

function renderMiniChip(label, original) {
  const sale = discountPrice(original);
  if (!original || sale >= original) {
    return `<div class="price-mini-chip"><em>${escapeHtml(label)}</em><strong>${escapeHtml(formatVnd(original))}</strong></div>`;
  }
  return `<div class="price-mini-chip"><em>${escapeHtml(label)}</em><span class="price-was">${escapeHtml(formatVnd(original))}</span><strong>${escapeHtml(formatVnd(sale))}</strong></div>`;
}

function renderPriceCardImage(m, tilt = 0) {
  if (!m.image) return "";
  return `<div class="price-card-photo" style="--img-tilt:${tilt}deg" aria-hidden="true"><img src="${escapeHtml(m.image)}" alt="" loading="lazy" decoding="async" width="160" height="120" /></div>`;
}

function renderModelThumb(m) {
  if (!m.image) return "";
  return `<img class="model-thumb" src="${escapeHtml(m.image)}" alt="" loading="lazy" decoding="async" width="44" height="44" />`;
}

function renderPricePageScript() {
  return `<script>
(function(){
  var search=document.getElementById("price-search");
  var chips=document.querySelectorAll(".brand-jump [data-brand]");
  var sections=document.querySelectorAll(".brand-section");
  function norm(s){return (s||"").toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"");}
  var activeBrand="all";
  function filter(){
    var q=norm(search?search.value:"");
    sections.forEach(function(sec){
      var secBrand=sec.dataset.brand||"";
      var secMatch=!activeBrand||activeBrand==="all"||secBrand===activeBrand;
      var anyVisible=false;
      sec.querySelectorAll("[data-search]").forEach(function(el){
        var match=!q||norm(el.dataset.search).indexOf(q)>=0;
        var show=secMatch&&match;
        el.style.display=show?"":"none";
        if(show)anyVisible=true;
      });
      sec.style.display=anyVisible?"":"none";
    });
  }
  chips.forEach(function(chip){
    chip.addEventListener("click",function(){
      activeBrand=chip.dataset.brand||"all";
      chips.forEach(function(c){c.classList.toggle("active",c===chip);});
      filter();
      if(activeBrand!=="all"){
        var target=document.getElementById("brand-"+activeBrand);
        if(target)target.scrollIntoView({behavior:"smooth",block:"start"});
      }
    });
  });
  if(search)search.addEventListener("input",filter);
})();
</script>`;
}

function buildPriceIndexSchema(models, pageUrl) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      buildWebsiteNode(),
      buildOrganizationNode(),
      buildWebPageNode({
        pageUrl,
        name: "Bảng giá thuê máy ảnh FAO Camera TP.HCM",
        description: "Bảng giá thuê máy ảnh theo từng model — Fujifilm, Canon, Sony, DJI. Giá 6 tiếng và theo ngày, cập nhật từ catalog FAO.",
      }),
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#pricelist`,
        name: "Bảng giá thuê máy ảnh FAO",
        numberOfItems: models.length,
        itemListElement: models.map((m, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: m.displayName,
          url: `${SITE_CONFIG.url}/${m.slug}/`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Thuê máy ảnh FAO giá bao nhiêu?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Giá thuê máy ảnh tại FAO dao động ${formatVnd(models[0]?.priceOneDay || 80000)} – ${formatVnd(models[models.length - 1]?.priceOneDay || 400000)}/ngày tùy model. Fujifilm X-A3 từ ${formatVnd(150000)}/ngày, Canon G7X từ ${formatVnd(200000)}/ngày, Fujifilm X100V ${formatVnd(400000)}/ngày. Xem bảng chi tiết tại faocamera.vn/bang-gia-thue-may-anh/.`,
            },
          },
        ],
      },
    ],
  });
}

function renderPriceIndexPage(models) {
  const path = "/bang-gia-thue-may-anh";
  const pageUrl = `${SITE_CONFIG.url}${path}`;
  const title = "Bảng giá thuê máy ảnh TP.HCM — FAO Camera theo từng model";
  const description = `Bảng giá thuê máy ảnh FAO ${models.length}+ model: Fujifilm, Canon, Sony, DJI. Giá 6 tiếng & theo ngày minh bạch. Phú Nhuận & Thủ Đức — đặt online faocamera.vn.`;

  const brands = groupByBrand(models);
  const brandSections = brands
    .map(({ brand, models: list }) => {
      const slug = brandSlug(brand);
      const searchKey = (m) =>
        `${m.displayName} ${m.brandLabel || ""} ${m.categoryName || ""}`.toLowerCase();

      const mobileCards = list
        .map((m, i) => {
          const tilt = i % 2 === 0 ? -7 : 5;
          return `<a class="price-card${m.image ? " has-img" : ""}" href="/${escapeHtml(m.slug)}/" data-search="${escapeHtml(searchKey(m))}">
            <div class="price-card-inner">
              ${renderPriceCardImage(m, tilt)}
              <div class="price-card-body">
                <div class="price-card-top">
                  <span class="price-card-name">${escapeHtml(m.displayName)}</span>
                  <span class="price-disc-badge">-20%</span>
                </div>
                <div class="price-card-hero">${renderPriceHero(m.priceOneDay)}</div>
                <div class="price-chip-row">
                  ${renderMiniChip("6 tiếng", m.priceSixHours)}
                  ${renderMiniChip("2 ngày", m.priceTwoDay)}
                  ${renderMiniChip("3 ngày", m.priceThreeDay)}
                </div>
              </div>
            </div>
          </a>`;
        })
        .join("");

      const rows = list
        .map((m) => {
          const bookHref = deviceBookHref(m, "bang-gia-thue-may-anh");
          return `<tr data-search="${escapeHtml(searchKey(m))}">
              <td class="model-cell"><a href="/${escapeHtml(m.slug)}/" class="model-link">${renderModelThumb(m)}<span>${escapeHtml(m.displayName)}</span></a></td>
              <td class="price">${renderPriceCell(m.priceSixHours)}</td>
              <td class="price">${renderPriceCell(m.priceOneDay)}</td>
              <td class="price">${renderPriceCell(m.priceTwoDay)}</td>
              <td class="price">${renderPriceCell(m.priceThreeDay)}</td>
              <td class="book-cell"><a href="${escapeHtml(bookHref)}" data-catalog-book="1">Đặt lịch →</a></td>
            </tr>`;
        })
        .join("");
      const accent = brandAccentClass(brand);
      return `<section class="brand-section ${accent}" id="brand-${escapeHtml(slug)}" data-brand="${escapeHtml(slug)}">
        <h2>${escapeHtml(brand)} <span class="brand-count">${list.length} model</span></h2>
        <div class="price-cards">${mobileCards}</div>
        <div class="price-table-wrap price-table-desktop">
          <table class="price-table">
            <thead><tr><th>Model</th><th>6 tiếng</th><th>1 ngày</th><th>2 ngày</th><th>3 ngày</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
    })
    .join("");

  const brandJump = brands
    .map(({ brand }) => {
      const slug = brandSlug(brand);
      return `<button type="button" data-brand="${escapeHtml(slug)}">${escapeHtml(brand)}</button>`;
    })
    .join("");

  const sortedByPrice = [...models].sort((a, b) => a.priceOneDay - b.priceOneDay);
  const minPrice = sortedByPrice[0]?.priceOneDay;
  const maxPrice = sortedByPrice[sortedByPrice.length - 1]?.priceOneDay;
  const minSale = discountPrice(minPrice);
  const maxSale = discountPrice(maxPrice);

  const aiBox = renderAiAnswerBox({
    summary: `FAO Camera cho thuê ${models.length} dòng máy ảnh tại TP.HCM — giá từ ${formatVnd(minSale)}/ngày (đã giảm 20% T2–T6 đặt online) đến ${formatVnd(maxSale)}/ngày. Bao gồm Fujifilm, Canon, Sony, DJI. Chi nhánh Phú Nhuận & Q9 Thủ Đức.`,
    highlight: formatVnd(minSale) + " – " + formatVnd(maxSale),
    sourcePath: `${path}/`,
  });

  const phuNhuanCard = renderLocalBusinessCard(branchToLocalBusiness(BRANCHES.PHU_NHUAN), [
    "Giá minh bạch trên web — cập nhật theo catalog realtime",
    "Giảm 20% thứ 2–6 khi đặt online",
    "Chương trình CỌC 0Đ cho HSSV có minh chứng lịch học",
  ]);

  return `${renderHead({ title, description, path, jsonLd: buildPriceIndexSchema(models, pageUrl) })}
<body>
  ${renderSiteHeader({ active: "catalog", ctaHref: "/catalog", ctaLabel: "Đặt máy" })}
  <main>
    <div class="wrap">
      ${renderBreadcrumb([
        { label: "Trang chủ", href: "/" },
        { label: "Bảng giá thuê máy ảnh", href: `${path}/` },
      ])}
      <article class="seo-hero price-index">
        <h1>Bảng giá thuê máy ảnh FAO</h1>
        <div class="price-promo-banner">
          <span class="price-promo-badge">-20%</span>
          <span>Giá đặt online T2–T6 · đã áp dụng ưu đãi trên bảng</span>
        </div>
        <p class="price-meta-line">${models.length} model · <strong>${escapeHtml(formatVnd(minSale))} – ${escapeHtml(formatVnd(maxSale))}/ngày</strong> <span style="opacity:.75">(giá gốc ${escapeHtml(formatVnd(minPrice))} – ${escapeHtml(formatVnd(maxPrice))})</span></p>
        <div class="price-toolbar" id="price-toolbar">
          <input type="search" id="price-search" placeholder="Tìm model (VD: G7X, X100V, R50)…" autocomplete="off" enterkeyhint="search" />
          <div class="brand-jump" role="tablist" aria-label="Lọc theo hãng">
            <button type="button" class="active" data-brand="all">Tất cả</button>
            ${brandJump}
          </div>
        </div>
        ${brandSections}
        <details class="price-seo-extra">
          <summary>Thông tin thêm · chi nhánh · chính sách</summary>
          <div class="price-seo-body">
            ${aiBox}
            <p class="intro">Bảng giá tham khảo theo từng model — lấy trực tiếp từ catalog FAO, <strong>đã trừ 20% ưu đãi T2–T6 đặt online</strong>. Bấm tên máy để xem chi tiết và đặt lịch. Giá đã bao gồm combo cơ bản (pin, sạc, thẻ, túi — tùy máy). Cuối tuần & lễ áp dụng giá gốc.</p>
            ${phuNhuanCard}
            ${renderShopStrip()}
            <section class="cta-panel">
              <h2>Chọn máy và đặt lịch</h2>
              <p>Lịch trống realtime trên catalog.</p>
              <div class="cta-btns">
                <a class="primary" href="/catalog">Mở Catalog</a>
                <a class="secondary" href="/thue-may-anh-phu-nhuan/">Chi nhánh Phú Nhuận</a>
              </div>
            </section>
          </div>
        </details>
      </article>
    </div>
  </main>
  ${renderSiteFooter()}
  ${renderHeaderNavScript()}
  ${renderPricePageScript()}
  ${renderAttributionBootstrapScript("seo", "bang-gia-thue-may-anh")}
</body>
</html>`;
}

const models = await loadOrFetchDeviceModels(API_URL);
const priceOnly = process.argv.includes("--price-only");

if (priceOnly) {
  const priceDir = join(PUBLIC_DIR, "bang-gia-thue-may-anh");
  mkdirSync(priceDir, { recursive: true });
  writeFileSync(join(priceDir, "index.html"), renderPriceIndexPage(models), "utf8");
  console.log(`  ✓ /bang-gia-thue-may-anh/index.html`);
  process.exit(0);
}

let count = 0;
for (const m of models) {
  const outDir = join(PUBLIC_DIR, m.slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), renderDevicePage(m, models), "utf8");
  console.log(`  ✓ /${m.slug}/index.html`);
  count++;
}

const priceDir = join(PUBLIC_DIR, "bang-gia-thue-may-anh");
mkdirSync(priceDir, { recursive: true });
writeFileSync(join(priceDir, "index.html"), renderPriceIndexPage(models), "utf8");
console.log(`  ✓ /bang-gia-thue-may-anh/index.html`);

console.log(`\nGenerated ${count} device SEO pages + price index`);
