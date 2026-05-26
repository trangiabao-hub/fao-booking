/**
 * Device review — senior UI components & styles.
 */
import { escapeHtml } from "../static-site-layout.mjs";
import { renderCategoryPill, renderInlineCta } from "./blogUi.mjs";
import { formatVnd } from "./deviceCatalogSeo.mjs";

export const DEVICE_REVIEW_CSS = `
  /* —— Device review layout overrides —— */
  body.device-review-page .blog-prose{
    background:transparent;border:none;box-shadow:none;padding:0;max-width:none;
  }
  body.device-review-page .blog-prose-body{max-width:52rem}
  body.device-review-page .blog-prose-body h2[id]{scroll-margin-top:96px}
  body.device-review-page .blog-prose .ai-answer{max-width:none;margin-bottom:var(--space-6)}

  /* Hero */
  .review-hero{
    position:relative;border-radius:var(--radius-xl);overflow:hidden;
    min-height:min(420px,58vh);background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);
    margin-bottom:var(--space-6);
  }
  @media(min-width:768px){.review-hero{min-height:460px}}
  .review-hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.72;transition:transform .8s var(--ease)}
  .review-hero:hover .review-hero-bg{transform:scale(1.02)}
  .review-hero-overlay{
    position:absolute;inset:0;
    background:linear-gradient(105deg,rgba(15,23,42,.88) 0%,rgba(15,23,42,.45) 42%,rgba(15,23,42,.15) 100%);
  }
  .review-hero-inner{
    position:relative;z-index:2;display:grid;gap:var(--space-5);
    padding:clamp(24px,5vw,40px);min-height:inherit;align-items:end;
  }
  @media(min-width:900px){
    .review-hero-inner{grid-template-columns:1fr minmax(280px,340px);align-items:center;min-height:460px}
  }
  .review-hero-copy{display:flex;flex-direction:column;gap:var(--space-4)}
  .review-hero-eyebrow{display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center}
  .review-hero-eyebrow .tag-pill{font-size:.6875rem}
  .review-hero h1{
    font-family:var(--font-display);font-size:clamp(1.875rem,4.5vw,3rem);font-weight:800;
    line-height:1.08;letter-spacing:-.035em;color:#fff;margin:0;
  }
  .review-hero-tagline{font-size:clamp(1rem,2vw,1.125rem);color:rgba(255,255,255,.82);line-height:1.6;max-width:36rem;margin:0}
  .review-hero-actions{display:flex;flex-wrap:wrap;gap:var(--space-3);margin-top:var(--space-2)}
  .review-btn-primary,.review-btn-ghost{
    display:inline-flex;align-items:center;justify-content:center;gap:8px;
    min-height:48px;padding:0 22px;border-radius:999px;font-weight:700;font-size:.9375rem;
    text-decoration:none!important;transition:transform .2s var(--ease),box-shadow .2s;
  }
  .review-btn-primary{background:var(--blog-accent);color:#fff!important;box-shadow:0 8px 28px rgba(232,92,156,.4)}
  .review-btn-primary:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(232,92,156,.5)}
  .review-btn-ghost{background:rgba(255,255,255,.12);color:#fff!important;border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(8px)}
  .review-btn-ghost:hover{background:rgba(255,255,255,.2);transform:translateY(-1px)}

  .review-booking-card{
    background:rgba(255,255,255,.97);border:1px solid rgba(255,255,255,.6);
    border-radius:var(--radius-lg);padding:var(--space-5);box-shadow:var(--shadow-lg);
    backdrop-filter:blur(16px);
  }
  [data-theme="dark"] .review-booking-card{background:rgba(21,25,33,.95);border-color:var(--blog-line)}
  .review-booking-card .price-hero{
    font-family:var(--font-display);font-size:2rem;font-weight:800;letter-spacing:-.03em;
    color:var(--blog-ink);line-height:1;margin-bottom:2px;
  }
  .review-booking-card .price-hero small{font-size:.875rem;font-weight:600;color:var(--blog-muted)}
  .review-booking-card .price-sub{font-size:.8125rem;color:var(--blog-muted);margin-bottom:var(--space-4);padding-bottom:var(--space-4);border-bottom:1px solid var(--blog-line)}
  .review-booking-card dl{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)}
  .review-booking-card dt{font-size:.625rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--blog-muted)}
  .review-booking-card dd{font-size:.875rem;font-weight:700;color:var(--blog-ink);margin-top:2px}
  .review-booking-card .btn-full{
    display:flex;align-items:center;justify-content:center;width:100%;min-height:48px;
    background:var(--blog-accent);color:#fff!important;font-weight:700;border-radius:999px;
    text-decoration:none!important;font-size:.9375rem;
  }
  .review-booking-card .btn-full:hover{filter:brightness(1.05)}

  /* Stats strip */
  .review-stats{
    display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-3);
    margin-bottom:var(--space-6);
  }
  @media(min-width:640px){.review-stats{grid-template-columns:repeat(4,1fr)}}
  @media(min-width:900px){.review-stats{display:none}}
  .review-stat{
    background:var(--blog-surface);border:1px solid var(--blog-line);border-radius:var(--radius-md);
    padding:var(--space-4);display:flex;flex-direction:column;gap:6px;transition:border-color .2s,box-shadow .2s;
  }
  .review-stat:hover{border-color:rgba(232,92,156,.35);box-shadow:var(--shadow-sm)}
  .review-stat-icon{
    width:36px;height:36px;border-radius:10px;background:var(--blog-accent-soft);
    display:flex;align-items:center;justify-content:center;font-size:1rem;line-height:1;
  }
  .review-stat-label{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--blog-muted)}
  .review-stat-value{font-size:.9375rem;font-weight:700;color:var(--blog-ink);line-height:1.35}
  .review-stat-hint{font-size:.75rem;color:var(--blog-muted);line-height:1.4}

  /* Content card wrapper */
  .review-content-card{
    background:var(--blog-surface);border:1px solid var(--blog-line);
    border-radius:var(--radius-xl);padding:clamp(var(--space-5),4vw,var(--space-7));
    box-shadow:var(--shadow-sm);margin-bottom:var(--space-6);
  }

  /* Why FAO — compact trust strip */
  .review-trust{
    display:flex;flex-wrap:wrap;gap:8px 12px;margin:var(--space-5) 0;padding:var(--space-4);
    background:var(--blog-bg);border:1px solid var(--blog-line);border-radius:var(--radius-md);
  }
  .review-trust span{
    display:inline-flex;align-items:center;gap:6px;font-size:.8125rem;font-weight:600;color:var(--blog-muted);line-height:1.4;
  }
  .review-trust span::before{content:"✓";color:var(--blog-accent);font-weight:800;font-size:.75rem}

  /* Sticky jump — ảnh thật + Q&A (không lặp nút đặt) */
  .review-jump-bar{
    position:sticky;top:72px;z-index:5;display:flex;flex-wrap:wrap;gap:var(--space-2);
    margin:0 0 var(--space-5);padding:10px 12px;
    background:rgba(255,255,255,.92);border:1px solid var(--blog-line);border-radius:999px;
    box-shadow:var(--shadow-sm);backdrop-filter:blur(10px);
  }
  [data-theme="dark"] .review-jump-bar{background:rgba(21,25,33,.92)}
  @media(max-width:899px){.review-jump-bar{top:64px;border-radius:var(--radius-md)}}
  .review-jump-bar a{
    display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 14px;
    border-radius:999px;font-size:.8125rem;font-weight:700;color:var(--blog-ink);
    text-decoration:none!important;border:1px solid transparent;transition:all .2s;
  }
  .review-jump-bar a:hover{background:var(--blog-accent-soft);color:var(--blog-accent)}
  .review-jump-bar a.is-photos{color:var(--blog-accent);border-color:rgba(232,92,156,.25);background:var(--blog-accent-soft)}
  .review-jump-bar a.is-photos::before{content:"📷";font-size:.875rem;line-height:1}
  .review-jump-bar a.is-faq::before{content:"?";font-size:.75rem;line-height:1;width:18px;height:18px;border-radius:50%;background:var(--blog-bg);border:1px solid var(--blog-line);display:inline-flex;align-items:center;justify-content:center;font-weight:800}

  .review-article-header:has(.ai-answer) .article-lead{display:none}

  .review-promo-note{
    margin:var(--space-3) 0 0;padding:10px 14px;border-radius:var(--radius-md);
    background:var(--blog-accent-soft);border:1px solid rgba(232,92,156,.2);
    font-size:.8125rem;font-weight:600;color:var(--blog-accent);line-height:1.5;
  }

  /* Feature grid (pros) */
  .review-features{display:grid;gap:var(--space-3);margin:var(--space-4) 0 var(--space-6)}
  @media(min-width:640px){.review-features{grid-template-columns:repeat(2,1fr)}}
  .review-feature{
    padding:var(--space-4);background:var(--blog-bg);border:1px solid var(--blog-line);
    border-radius:var(--radius-md);font-size:.9375rem;line-height:1.6;color:var(--blog-ink);
    position:relative;padding-left:calc(var(--space-4) + 20px);
  }
  .review-feature::before{
    content:"✓";position:absolute;left:var(--space-4);top:var(--space-4);
    color:var(--blog-accent);font-weight:800;font-size:.875rem;
  }

  /* Pricing board */
  .review-pricing{
    display:grid;gap:var(--space-3);margin:var(--space-4) 0 var(--space-5);
  }
  @media(min-width:480px){.review-pricing{grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}}
  .review-price-card{
    background:var(--blog-bg);border:1px solid var(--blog-line);border-radius:var(--radius-md);
    padding:var(--space-4);text-align:center;transition:all .2s var(--ease);
  }
  .review-price-card.is-featured{
    border-color:var(--blog-accent);background:var(--blog-accent-soft);
    box-shadow:0 4px 20px rgba(232,92,156,.15);
  }
  .review-price-card .label{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--blog-muted);margin-bottom:6px}
  .review-price-card .amount{font-family:var(--font-display);font-size:1.25rem;font-weight:800;color:var(--blog-ink);letter-spacing:-.02em}
  .review-price-card.is-featured .amount{color:var(--blog-accent)}

  .review-deposit{
    margin-top:var(--space-4);padding:var(--space-4);background:var(--blog-bg);
    border-radius:var(--radius-md);border:1px dashed var(--blog-line);
  }
  .review-deposit h3{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--blog-muted);margin-bottom:var(--space-3)}
  .review-deposit ul{margin:0;padding-left:1.1rem;font-size:.875rem;line-height:1.65;color:var(--blog-muted)}
  .review-deposit li{margin-bottom:var(--space-2)}
  .review-deposit li::marker{color:var(--blog-accent)}

  /* FAQ accordion */
  .review-faq{margin:var(--space-4) 0 var(--space-6)}
  .review-faq details{
    border:1px solid var(--blog-line);border-radius:var(--radius-md);margin-bottom:var(--space-3);
    background:var(--blog-surface);overflow:hidden;transition:border-color .2s;
  }
  .review-faq details[open]{border-color:rgba(232,92,156,.35);box-shadow:var(--shadow-sm)}
  .review-faq summary{
    cursor:pointer;font-weight:600;font-size:.9375rem;color:var(--blog-ink);
    padding:var(--space-4) calc(var(--space-4) + 28px) var(--space-4) var(--space-4);
    list-style:none;position:relative;line-height:1.45;user-select:none;
  }
  .review-faq summary::-webkit-details-marker{display:none}
  .review-faq summary::after{
    content:"+";position:absolute;right:var(--space-4);top:50%;transform:translateY(-50%);
    width:24px;height:24px;border-radius:50%;background:var(--blog-bg);
    display:flex;align-items:center;justify-content:center;font-size:1.125rem;font-weight:400;
    color:var(--blog-muted);transition:transform .2s,background .2s;
  }
  .review-faq details[open] summary::after{content:"−";background:var(--blog-accent-soft);color:var(--blog-accent)}
  .review-faq .faq-answer{
    padding:0 var(--space-4) var(--space-4);font-size:.875rem;line-height:1.7;color:var(--blog-muted);
    border-top:1px solid var(--blog-line);margin-top:0;padding-top:var(--space-3);
  }

  /* Geo / branches — unified card */
  .review-branches{margin:var(--space-6) 0}
  .review-branches .fao-branches-unified{border-radius:var(--radius-lg);border:1px solid var(--blog-line);box-shadow:var(--shadow-sm);background:var(--blog-surface)}
  .review-branches .fao-branches-shared{background:var(--blog-bg);border-color:var(--blog-line)}
  .review-branches .fao-branch-loc{background:var(--blog-bg);border-color:var(--blog-line)}
  .review-branches .fao-branch-loc h3{color:var(--blog-ink)}
  .review-branches .fao-branch-loc address,.review-branches .fao-branch-loc .branch-meta{color:var(--blog-muted)}
  .review-branches .fao-branches-policy{border-color:var(--blog-line);color:var(--blog-muted)}

  /* Sidebar */
  .review-sidebar-thumb{
    width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--radius-md);
    margin-bottom:var(--space-4);background:var(--blog-bg);
  }
  .review-sidebar-price{
    font-family:var(--font-display);font-size:1.75rem;font-weight:800;
    letter-spacing:-.03em;color:var(--blog-ink);margin-bottom:var(--space-1);
  }
  .review-sidebar-price span{font-size:.875rem;font-weight:600;color:var(--blog-muted)}
  .review-sidebar-related{display:flex;flex-direction:column;gap:var(--space-2)}
  .review-sidebar-related a{
    display:grid;grid-template-columns:48px 1fr;gap:var(--space-3);align-items:center;
    padding:var(--space-3);border:1px solid var(--blog-line);border-radius:var(--radius-md);
    text-decoration:none!important;transition:all .2s;
  }
  .review-sidebar-related a:hover{border-color:var(--blog-accent);background:var(--blog-accent-soft)}
  .review-sidebar-related img{width:48px;height:48px;border-radius:8px;object-fit:cover;background:#f1f5f9}
  .review-sidebar-related strong{display:block;font-size:.8125rem;color:var(--blog-ink);line-height:1.3}
  .review-sidebar-related span{font-size:.75rem;color:var(--blog-muted)}

  /* Article header (below hero) */
  .review-article-header{
    margin-bottom:var(--space-6);padding-bottom:var(--space-5);
    border-bottom:1px solid var(--blog-line);
  }
  .review-article-header .article-meta{border-bottom:none;padding-bottom:0;margin-bottom:var(--space-3)}
  .review-article-header .article-lead{margin-bottom:0;font-size:1.0625rem}

  /* Toolbar row */
  .review-toolbar{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-5)}
  .review-toolbar-back{
    font-size:.8125rem;font-weight:600;color:var(--blog-muted);text-decoration:none!important;
    display:inline-flex;align-items:center;gap:6px;padding:8px 0;
  }
  .review-toolbar-back:hover{color:var(--blog-accent)}

  /* SEO keywords — visually hidden, crawlable */
  .sr-keywords{
    position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
    clip:rect(0,0,0,0);white-space:nowrap;border:0;
  }
`;

const WHY_FAO = [
  "Giá & lịch trống realtime",
  "Phú Nhuận & Q9 Thủ Đức",
  "HSSV COC 0D · giảm 20% T2–T6",
  "Hoàn cọc sau khi trả máy",
];

export function renderReviewHero(m, bookHref, branchLabel) {
  const depositText =
    m.deposit && m.deposit > 0 ? formatVnd(m.deposit) : "Theo model";

  const img = m.image
    ? `<img class="review-hero-bg" src="${escapeHtml(m.image)}" alt="Thuê ${escapeHtml(m.displayName)} tại FAO Camera TP.HCM" loading="eager" decoding="async" width="1200" height="800" />`
    : "";

  return `<section class="review-hero" aria-label="Thuê ${escapeHtml(m.displayName)}">
    ${img}
    <div class="review-hero-overlay" aria-hidden="true"></div>
    <div class="review-hero-inner">
      <div class="review-hero-copy">
        <div class="review-hero-eyebrow">
          ${renderCategoryPill("Review")}
          ${renderCategoryPill(m.brandLabel)}
        </div>
        <h1 itemprop="headline">Thuê ${escapeHtml(m.displayName)}</h1>
        <p class="review-hero-tagline">${escapeHtml(m.useCase)}</p>
        <div class="review-hero-actions">
          <a class="review-btn-primary" href="${escapeHtml(bookHref)}" data-catalog-book="1" data-today-book-sync>Đặt lịch ngay</a>
          <a class="review-btn-ghost" href="${escapeHtml(m.feedbackPath)}">Ảnh khách chụp</a>
        </div>
      </div>
      <aside class="review-booking-card" aria-label="Giá thuê nhanh">
        <div class="price-hero">${escapeHtml(formatVnd(m.priceOneDay))} <small>/ngày</small></div>
        <div class="price-sub">${escapeHtml(formatVnd(m.priceSixHours))} · 6 tiếng · ${escapeHtml(branchLabel)}</div>
        <dl>
          <div><dt>Cọc tham khảo</dt><dd>${escapeHtml(depositText)}</dd></div>
          <div><dt>HSSV</dt><dd>CỌC 0Đ</dd></div>
          <div><dt>Giờ mở cửa</dt><dd>9h – 22h</dd></div>
          <div><dt>Đặt lịch</dt><dd>Online realtime</dd></div>
        </dl>
        <a class="btn-full" href="${escapeHtml(bookHref)}" data-catalog-book="1" data-today-book-sync>Chọn ngày thuê →</a>
      </aside>
    </div>
  </section>`;
}

export function renderReviewStats(m, branchLabel) {
  const depositText =
    m.deposit && m.deposit > 0 ? formatVnd(m.deposit) : "Theo model";

  return `<div class="review-stats" aria-label="Thông tin thuê nhanh">
    <div class="review-stat">
      <span class="review-stat-icon" aria-hidden="true">💰</span>
      <span class="review-stat-label">Giá thuê</span>
      <span class="review-stat-value">${escapeHtml(formatVnd(m.priceOneDay))}/ngày</span>
      <span class="review-stat-hint">${escapeHtml(formatVnd(m.priceSixHours))} · 6 tiếng</span>
    </div>
    <div class="review-stat">
      <span class="review-stat-icon" aria-hidden="true">🛡</span>
      <span class="review-stat-label">Cọc</span>
      <span class="review-stat-value">${escapeHtml(depositText)}</span>
      <span class="review-stat-hint">HSSV: CỌC 0Đ</span>
    </div>
    <div class="review-stat">
      <span class="review-stat-icon" aria-hidden="true">📍</span>
      <span class="review-stat-label">Chi nhánh</span>
      <span class="review-stat-value">${escapeHtml(branchLabel)}</span>
      <span class="review-stat-hint">Nhận/trả 9h–22h</span>
    </div>
    <div class="review-stat">
      <span class="review-stat-icon" aria-hidden="true">⚡</span>
      <span class="review-stat-label">Ưu đãi</span>
      <span class="review-stat-value">Giảm 20% T2–T6</span>
      <span class="review-stat-hint">Đặt online trên web</span>
    </div>
  </div>`;
}

export function renderReviewSectionNav(faqSectionId, m) {
  return `<nav class="review-jump-bar" aria-label="Xem thêm">
    <a class="is-photos" href="${escapeHtml(m.feedbackPath)}">Ảnh khách chụp ${escapeHtml(m.displayName)}</a>
    <a class="is-faq" href="#section-${faqSectionId}">Hỏi đáp</a>
  </nav>`;
}

export function renderWhyFaoGrid() {
  return `<div class="review-trust" aria-label="Vì sao chọn FAO">
    ${WHY_FAO.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}
  </div>`;
}

export function renderPricingBoard(m, depositBullets) {
  const rows = [
    { label: "6 tiếng", value: m.priceSixHours },
    { label: "1 ngày", value: m.priceOneDay, featured: true },
    { label: "2 ngày", value: m.priceTwoDay },
    { label: "3 ngày", value: m.priceThreeDay },
    { label: "Ngày thêm", value: m.priceNextDay },
  ].filter((r) => r.value > 0);

  const cards = rows
    .map(
      (r) =>
        `<div class="review-price-card${r.featured ? " is-featured" : ""}">
      <div class="label">${escapeHtml(r.label)}</div>
      <div class="amount">${escapeHtml(formatVnd(r.value))}</div>
    </div>`
    )
    .join("");

  const deposit = depositBullets?.length
    ? `<div class="review-deposit">
    <h3>Chính sách cọc</h3>
    <ul>${depositBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
  </div>`
    : "";

  return `<div class="review-pricing">${cards}</div>${deposit}`;
}

export function renderFaqAccordion(faqs) {
  const items = faqs
    .map(
      ({ q, a }) =>
        `<details itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <summary itemprop="name">${escapeHtml(q)}</summary>
      <div class="faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${escapeHtml(a)}</p>
      </div>
    </details>`
    )
    .join("\n      ");

  return `<div class="review-faq" itemscope itemtype="https://schema.org/FAQPage">${items}</div>`;
}

export function renderReviewSections(sections, m, bookHref) {
  let h2Index = 0;
  let insertedCta = false;
  const h2Total = sections.filter((s) => s.type === "h2").length;
  const ctaAfter = Math.max(1, Math.floor(h2Total / 2));
  const ctaPost = { ctaLink: bookHref, ctaLabel: `Đặt ${m.displayName}` };

  const parts = [];
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    if (s.type === "h2") {
      h2Index += 1;
      parts.push(`<h2 id="section-${h2Index}">${escapeHtml(s.text)}</h2>`);

      if (!insertedCta && h2Index === ctaAfter) {
        insertedCta = true;
        parts.push(renderInlineCta(ctaPost));
      }

      const next = sections[i + 1];
      if (s.text === "Ưu điểm khi thuê tại FAO" && next?.type === "ul") {
        parts.push(
          `<div class="review-features">${next.items.map((item) => `<div class="review-feature">${escapeHtml(item)}</div>`).join("")}</div>`
        );
        i += 1;
        continue;
      }
      if (s.text === "Bảng giá & ưu đãi" && next?.type === "ul") {
        const priceRows = next.items.filter((item) => /^(\d|6 tiếng|1 ngày|2 ngày|3 ngày|Ngày thêm)/i.test(item) && /đ/.test(item));
        const promoRows = next.items.filter((item) => !priceRows.includes(item));
        if (priceRows.length) {
          parts.push(
            `<div class="review-pricing">${priceRows
              .map((item) => {
                const match = item.match(/^(.+?):\s*(.+)$/);
                const label = match ? match[1] : item;
                const amt = match ? match[2] : "";
                const featured = /1 ngày/i.test(label);
                return `<div class="review-price-card${featured ? " is-featured" : ""}"><div class="label">${escapeHtml(label)}</div><div class="amount">${escapeHtml(amt)}</div></div>`;
              })
              .join("")}</div>`
          );
        }
        if (promoRows.length) {
          parts.push(`<p class="review-promo-note">${escapeHtml(promoRows.join(" · "))}</p>`);
        }
        i += 1;
        continue;
      }
      if (s.text === "Chính sách cọc" && next?.type === "ul") {
        parts.push(
          `<div class="review-deposit"><h3>Chi tiết cọc</h3><ul>${next.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
        );
        i += 1;
        continue;
      }
    } else if (s.type === "p") {
      parts.push(`<p>${escapeHtml(s.text)}</p>`);
    } else if (s.type === "ul") {
      parts.push(`<ul>${s.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    }
  }
  return parts.join("\n              ");
}

export function renderReviewSidebar(m, related, bookHref, faqSectionId) {
  const thumb = m.image
    ? `<img class="review-sidebar-thumb" src="${escapeHtml(m.image)}" alt="${escapeHtml(m.displayName)}" loading="lazy" decoding="async" width="320" height="240" />`
    : "";

  const relatedHtml = related
    .map((r) => {
      const img = r.image
        ? `<img src="${escapeHtml(r.image)}" alt="" loading="lazy" width="48" height="48" />`
        : `<span style="width:48px;height:48px;border-radius:8px;background:var(--blog-accent-soft);display:block"></span>`;
      return `<a href="/${escapeHtml(r.slug)}/">${img}<div><strong>${escapeHtml(r.displayName)}</strong><span>${escapeHtml(formatVnd(r.priceOneDay))}/ngày</span></div></a>`;
    })
    .join("");

  return `<aside class="blog-sidebar-rail review-sidebar">
  <div class="sidebar-box sidebar-cta">
    ${thumb}
    <div class="review-sidebar-price">${escapeHtml(formatVnd(m.priceOneDay))} <span>/ngày</span></div>
    <p style="font-size:.875rem;color:var(--blog-muted);margin-bottom:var(--space-4);line-height:1.5"><strong style="color:var(--blog-ink)">${escapeHtml(m.displayName)}</strong><br/>${escapeHtml(formatVnd(m.priceSixHours))} · 6 tiếng${m.deposit ? `<br/>Cọc: ${escapeHtml(formatVnd(m.deposit))}` : ""}</p>
    <a class="btn" href="${escapeHtml(bookHref)}" data-catalog-book="1">Đặt lịch ngay →</a>
  </div>
  <div class="sidebar-box">
    <h3>Giá thuê</h3>
    <ul style="list-style:none;font-size:.875rem;line-height:1.9;padding:0;margin:0">
      <li>6 tiếng: <strong>${escapeHtml(formatVnd(m.priceSixHours))}</strong></li>
      <li>1 ngày: <strong>${escapeHtml(formatVnd(m.priceOneDay))}</strong></li>
      <li>2 ngày: ${escapeHtml(formatVnd(m.priceTwoDay))}</li>
      <li>3 ngày: ${escapeHtml(formatVnd(m.priceThreeDay))}</li>
    </ul>
  </div>
  ${related.length ? `<div class="sidebar-box"><h3>Cùng hãng ${escapeHtml(m.brandLabel)}</h3><div class="review-sidebar-related">${relatedHtml}</div></div>` : ""}
  <div class="sidebar-box">
    <h3>Xem thêm</h3>
    <ul>
      <li><a href="${escapeHtml(m.feedbackPath)}">Ảnh khách chụp</a></li>
      <li><a href="#section-${faqSectionId}">Hỏi đáp</a></li>
    </ul>
  </div>
  <div class="sidebar-box">
    <h3>Khám phá</h3>
    <ul>
      <li><a href="/bang-gia-thue-may-anh/">Bảng giá tất cả máy</a></li>
      <li><a href="/blog/?tag=Review">Review thiết bị</a></li>
      <li><a href="/catalog">Catalog đặt lịch</a></li>
    </ul>
  </div>
</aside>`;
}

export function renderSrKeywords(keywords) {
  if (!keywords?.length) return "";
  return `<p class="sr-keywords" aria-hidden="true">${keywords.map((k) => escapeHtml(k)).join(", ")}</p>`;
}
