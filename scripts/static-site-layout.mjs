/**
 * Layout + schema dùng chung cho trang SEO & blog tĩnh.
 * Tối ưu Google AI Overview: câu trả lời trực tiếp, Speakable, Breadcrumb, Organization.
 */
import { BRANCHES, branchToLocalBusiness } from "../src/data/localBusiness.js";

export const SITE_CONFIG = {
  url: (process.env.VITE_SITE_URL || "https://faocamera.vn").replace(/\/+$/, ""),
  name: "FAO Booking",
  brand: "FAO Camera Sài Gòn",
  phone: "0901355198",
  zalo: "https://zalo.me/0901355198",
  messenger: "https://m.me/Faodigitalcamera",
  logo: "/og-image.png",
};

export const NAV_LINKS = [
  { href: "/", label: "Trang chủ", id: "home" },
  { href: "/catalog", label: "Đặt máy", id: "catalog" },
  { href: "/blog/", label: "Blog", id: "blog" },
  { href: "/feedback", label: "Feedback", id: "feedback" },
];

export const GUIDE_LINKS = [
  { href: "/bang-gia-thue-may-anh/", label: "Bảng giá" },
  { href: "/thue-may-anh-tphcm/", label: "Thuê máy TP.HCM" },
  { href: "/thue-may-anh-phu-nhuan/", label: "Phú Nhuận" },
  { href: "/thue-may-anh-fujifilm/", label: "Fujifilm" },
];

export const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const STATIC_CSS = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --ink:#0f172a;--muted:#64748b;--line:#e2e8f0;--brand:#E85C9C;--brand-soft:#FFF1F8;
    --bg:#f8fafc;--card:#fff;--radius:14px;--shadow:0 4px 24px rgba(15,23,42,.06);
    --content:42rem;--wide:94rem;--article-wide:110rem;
  }
  html{scroll-behavior:smooth}
  body{font-family:"Segoe UI",system-ui,-apple-system,Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.65;-webkit-font-smoothing:antialiased}
  a{color:var(--brand);text-decoration:none}a:hover{text-decoration:underline}
  .wrap{max-width:var(--wide);margin:0 auto;padding:0 clamp(16px,3vw,40px)}
  .content-narrow{max-width:var(--content);margin:0 auto}
  .device-wrap{max-width:var(--article-wide)}

  /* —— Site chrome —— */
  .site-header{position:sticky;top:0;z-index:50;border-bottom:1px solid var(--line);background:rgba(255,255,255,.92);backdrop-filter:blur(12px)}
  .site-header .bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0}
  .logo{display:flex;align-items:center;gap:8px;font-weight:800;font-size:1.05rem;color:var(--brand);text-decoration:none!important}
  .logo-mark{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#f472b6,var(--brand));display:flex;align-items:center;justify-content:center;color:#fff;font-size:.75rem;font-weight:900}
  .nav-main{display:flex;align-items:center;gap:4px;flex-wrap:wrap;justify-content:flex-end}
  .nav-main a{padding:8px 12px;font-size:.875rem;font-weight:600;color:var(--muted);border-radius:999px;text-decoration:none!important;transition:background .15s,color .15s}
  .nav-main a:hover{background:var(--brand-soft);color:var(--brand)}
  .nav-main a.active{background:var(--brand-soft);color:var(--brand)}
  .nav-main .cta{background:var(--brand);color:#fff!important;margin-left:4px}
  .nav-main .cta:hover{background:#d94d8a;filter:brightness(1.02)}
  .nav-guides{display:none}
  @media(min-width:900px){
    .nav-guides{display:flex;gap:2px;margin-right:8px;padding-right:12px;border-right:1px solid var(--line)}
    .nav-guides a{font-size:.8125rem;padding:6px 10px}
  }

  main{padding:36px 0 56px}
  .breadcrumb{font-size:.8125rem;color:var(--muted);margin-bottom:20px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .breadcrumb a{color:var(--brand)}
  .breadcrumb [aria-hidden]{opacity:.5}

  /* —— AI Overview block (câu trả lời trực tiếp) —— */
  .ai-answer{
    background:linear-gradient(135deg,#eff6ff 0%,#fdf2f8 100%);
    border:1px solid #bfdbfe;border-left:4px solid var(--brand);
    border-radius:var(--radius);padding:20px 22px;margin-bottom:28px;
  }
  .ai-answer-label{display:flex;align-items:center;gap:8px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#3b82f6;margin-bottom:10px}
  .ai-answer-label svg{flex-shrink:0}
  .ai-answer p{font-size:1.0625rem;color:var(--ink);line-height:1.55;margin:0}
  .ai-answer strong{color:var(--brand);font-weight:700}
  .ai-answer cite{display:block;margin-top:10px;font-size:.8125rem;color:var(--muted);font-style:normal}
  .ai-answer cite a{color:var(--brand);font-weight:600}

  /* —— SEO landing —— */
  .seo-hero h1{font-size:clamp(1.6rem,4vw,2.35rem);font-weight:900;line-height:1.15;margin-bottom:14px;letter-spacing:-.02em}
  .seo-hero .intro{font-size:1.0625rem;color:var(--muted);margin-bottom:8px}
  .seo-hero .byline{font-size:.8125rem;color:var(--muted);margin-bottom:24px}
  section.block{margin-bottom:36px}
  section.block h2{font-size:1.125rem;font-weight:700;margin-bottom:14px;color:var(--ink)}
  section.block h2.accent{color:var(--brand)}
  ul.check{list-style:none}
  ul.check li{padding:6px 0 6px 26px;position:relative;color:#334155}
  ul.check li::before{content:"";position:absolute;left:0;top:11px;width:14px;height:14px;border-radius:50%;background:var(--brand-soft);border:2px solid var(--brand)}
  .grid{display:grid;gap:14px}
  @media(min-width:560px){.grid.cols-2{grid-template-columns:1fr 1fr}}
  .card{display:block;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px;color:inherit;text-decoration:none!important;transition:box-shadow .2s,border-color .2s}
  .card:hover{border-color:#fbcfe8;box-shadow:var(--shadow)}
  .card strong{display:block;font-size:1rem;color:var(--ink);margin-bottom:4px}
  .card span{font-size:.875rem;color:var(--muted)}
  .faq details{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px;margin-bottom:10px}
  .faq summary{font-weight:600;cursor:pointer;list-style:none;color:var(--ink)}
  .faq summary::-webkit-details-marker{display:none}
  .faq p{margin-top:12px;font-size:.9375rem;color:var(--muted);line-height:1.6}
  .cta-panel{background:linear-gradient(135deg,var(--brand),#f472b6);color:#fff;border-radius:18px;padding:32px 28px;text-align:center;margin:36px 0}
  .cta-panel h2{color:#fff;font-size:1.2rem;margin-bottom:8px}
  .cta-panel p{opacity:.92;font-size:.9rem;margin-bottom:20px}
  .cta-btns{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
  .cta-panel .primary{background:#fff;color:var(--brand);font-weight:700;padding:11px 24px;border-radius:999px;text-decoration:none!important}
  .cta-panel .secondary{border:1px solid rgba(255,255,255,.55);color:#fff;font-weight:600;padding:11px 24px;border-radius:999px;text-decoration:none!important}
  .link-list{list-style:none}
  .link-list li{margin-bottom:8px}
  .link-list a{font-weight:500}

  /* —— Blog index (magazine) —— */
  .blog-hero{padding:40px 0 32px;text-align:center}
  .blog-hero h1{font-size:clamp(2rem,5vw,2.75rem);font-weight:900;letter-spacing:-.03em;margin-bottom:12px}
  .blog-hero p{font-size:1.125rem;color:var(--muted);max-width:36rem;margin:0 auto}
  .blog-featured{display:grid;gap:20px;margin-bottom:40px}
  @media(min-width:768px){.blog-featured{grid-template-columns:1.2fr 1fr}}
  .featured-main{position:relative;border-radius:20px;overflow:hidden;background:var(--ink);color:#fff;min-height:300px;display:flex;flex-direction:column;justify-content:flex-end;padding:28px;text-decoration:none!important}
  .featured-main .thumb-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
  .featured-main::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,rgba(15,23,42,.88) 0%,rgba(15,23,42,.2) 50%,transparent 100%)}
  .featured-main .card-content{position:relative;z-index:2}
  .featured-main>*:not(.thumb-bg){position:relative;z-index:2}
  .featured-main .tag{display:inline-block;background:rgba(232,92,156,.9);color:#fff;font-size:.7rem;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:12px;width:fit-content}
  .featured-main h2{font-size:clamp(1.35rem,3vw,1.75rem);font-weight:800;line-height:1.25;margin-bottom:8px;color:#fff}
  .featured-main p{font-size:.9375rem;opacity:.88;line-height:1.5;color:#e2e8f0}
  .featured-side{display:flex;flex-direction:column;gap:14px}
  .mini-card{flex:1;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;text-decoration:none!important;display:grid;grid-template-columns:108px 1fr;min-height:108px;transition:box-shadow .2s}
  .mini-card:hover{box-shadow:var(--shadow)}
  .mini-card .mini-thumb{width:108px;height:100%;min-height:108px;object-fit:cover;background:#f1f5f9}
  .mini-card .mini-body{padding:14px 16px;display:flex;flex-direction:column;justify-content:center}
  .mini-card .tag{font-size:.7rem;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:.03em}
  .mini-card h3{font-size:.95rem;font-weight:700;color:var(--ink);margin:6px 0 4px;line-height:1.35}
  .mini-card p{font-size:.8125rem;color:var(--muted);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .post-grid{display:grid;gap:20px}
  @media(min-width:640px){.post-grid{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:1024px){.post-grid{grid-template-columns:repeat(3,1fr)}}
  .post-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;text-decoration:none!important;display:flex;flex-direction:column;transition:transform .2s,box-shadow .2s}
  .post-card:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
  .post-card-thumb{aspect-ratio:16/10;overflow:hidden;background:linear-gradient(135deg,#fce7f3,#f1f5f9);position:relative}
  .post-card-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .35s ease}
  .post-card:hover .post-card-thumb img{transform:scale(1.04)}
  .post-card-body{padding:20px;flex:1;display:flex;flex-direction:column}
  .post-card .meta{font-size:.75rem;color:var(--muted);margin-bottom:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .post-card .tag-pill{background:var(--brand-soft);color:var(--brand);padding:2px 10px;border-radius:999px;font-weight:600}
  .post-card h2{font-size:1.05rem;font-weight:700;color:var(--ink);line-height:1.35;margin-bottom:8px;flex:1}
  .post-card p{font-size:.875rem;color:var(--muted);line-height:1.5}
  .post-card .read-more{margin-top:14px;font-size:.8125rem;font-weight:700;color:var(--brand)}
  .blog-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;align-items:center}
  .blog-filters-label{font-size:.8125rem;font-weight:700;color:var(--muted);margin-right:4px}
  .filter-chip{border:1px solid var(--line);background:var(--card);color:var(--muted);font-size:.8125rem;font-weight:600;padding:8px 14px;border-radius:999px;cursor:pointer;transition:all .15s}
  .filter-chip:hover{border-color:var(--brand);color:var(--brand)}
  .filter-chip.active{background:var(--brand);border-color:var(--brand);color:#fff}
  .post-card.is-hidden{display:none!important}
  .blog-section-title{font-size:1.25rem;font-weight:800;margin:32px 0 16px;color:var(--ink)}

  /* —— Blog article —— */
  .article-layout{display:grid;gap:28px}
  @media(min-width:960px){.article-layout{grid-template-columns:minmax(0,1fr) 280px;align-items:start;gap:32px}}
  @media(min-width:1200px){.article-layout{grid-template-columns:minmax(0,1fr) 320px;gap:36px}}
  .article-main{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:clamp(24px,4vw,40px);box-shadow:var(--shadow)}
  .article-hero{margin:0 0 24px;border-radius:16px;overflow:hidden;aspect-ratio:2/1;max-height:360px;background:#f1f5f9;box-shadow:var(--shadow)}
  .article-hero img{width:100%;height:100%;object-fit:cover;display:block}
  .article-main h1{font-size:clamp(1.75rem,4vw,2.25rem);font-weight:900;line-height:1.2;letter-spacing:-.02em;margin-bottom:16px}
  .article-meta{display:flex;flex-wrap:wrap;gap:10px 18px;font-size:.8125rem;color:var(--muted);padding-bottom:20px;margin-bottom:24px;border-bottom:1px solid var(--line)}
  .article-meta .tag{background:var(--brand-soft);color:var(--brand);padding:3px 12px;border-radius:999px;font-weight:700}
  .article-lead{font-size:1.125rem;color:#475569;line-height:1.7;margin-bottom:28px}
  .article-main h2{font-size:1.2rem;font-weight:700;margin:32px 0 12px;color:var(--ink);padding-top:8px}
  .article-main h2:first-of-type{margin-top:0;padding-top:0}
  .article-main p{margin-bottom:18px;font-size:1.0625rem;color:#334155;line-height:1.75}
  .article-main ul{margin:0 0 20px 24px;color:#334155}
  .article-main li{margin-bottom:8px;font-size:1.02rem;line-height:1.65}
  .article-sidebar{position:sticky;top:88px}
  .sidebar-box{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:18px;margin-bottom:16px}
  .sidebar-box h3{font-size:.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:12px}
  .sidebar-box ul{list-style:none}
  .sidebar-box li{margin-bottom:8px}
  .sidebar-box a{font-size:.875rem;font-weight:500;line-height:1.4;display:block}
  .sidebar-cta{background:linear-gradient(160deg,var(--brand-soft),#fff);border-color:#fbcfe8}
  .sidebar-cta p{font-size:.875rem;color:var(--muted);margin-bottom:12px;line-height:1.5}
  .sidebar-cta .btn{display:inline-block;background:var(--brand);color:#fff!important;font-weight:700;padding:10px 18px;border-radius:999px;font-size:.875rem;text-decoration:none!important}
  .toc a{display:block;font-size:.875rem;color:var(--muted);padding:4px 0;border-left:2px solid transparent;padding-left:10px}
  .toc a:hover{color:var(--brand);border-left-color:var(--brand)}

  .cross-links{margin-top:40px;padding-top:28px;border-top:1px dashed var(--line)}
  .cross-links h2{font-size:.9375rem;font-weight:700;color:var(--muted);margin-bottom:14px}
  .cross-grid{display:grid;gap:8px}
  @media(min-width:520px){.cross-grid{grid-template-columns:1fr 1fr}}

  .site-footer{border-top:1px solid var(--line);background:var(--card);padding:32px 0 40px;margin-top:20px}
  .footer-grid{display:grid;gap:24px}
  @media(min-width:640px){.footer-grid{grid-template-columns:1.4fr 1fr 1fr}}
  .footer-brand p{font-size:.875rem;color:var(--muted);margin-top:8px;line-height:1.5;max-width:280px}
  .footer-col h4{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:12px}
  .footer-col ul{list-style:none}
  .footer-col li{margin-bottom:8px}
  .footer-col a{font-size:.875rem;font-weight:500;color:#475569;text-decoration:none}
  .footer-col a:hover{color:var(--brand)}
  .footer-bottom{margin-top:28px;padding-top:20px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:12px 20px;justify-content:space-between;align-items:center;font-size:.8125rem;color:var(--muted)}
  .footer-contact{display:flex;flex-wrap:wrap;gap:12px}
  .footer-contact a{font-weight:600;color:var(--brand);text-decoration:none}

  /* —— Local business card (GEO / AI Overview) —— */
  .local-card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:22px 24px;margin-bottom:28px;box-shadow:var(--shadow)}
  .local-card h2{font-size:1.125rem;font-weight:800;margin-bottom:14px;color:var(--ink)}
  .local-card dl{display:grid;gap:10px;margin:0}
  .local-card dt{font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
  .local-card dd{margin:0;font-size:.9375rem;color:#334155;line-height:1.5}
  .local-card dd a{font-weight:600}
  .local-card .pros{margin-top:16px;padding-top:16px;border-top:1px dashed var(--line)}
  .local-card .pros h3{font-size:.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--brand);margin-bottom:10px}
  .local-card .pros ul{list-style:none;margin:0}
  .local-card .pros li{padding:4px 0 4px 20px;position:relative;font-size:.9375rem;color:#334155}
  .local-card .pros li::before{content:"✓";position:absolute;left:0;color:var(--brand);font-weight:700}
  .local-card .map-link{display:inline-block;margin-top:14px;font-size:.875rem;font-weight:700}

  /* Chi nhánh FAO — một card, nhiều địa điểm */
  .fao-branches-unified{margin-bottom:0}
  .fao-branches-unified > h2{font-size:1.125rem;font-weight:800;margin-bottom:16px;color:var(--ink)}
  .fao-branches-shared{display:flex;flex-wrap:wrap;gap:12px 28px;padding:14px 16px;margin-bottom:18px;background:var(--bg);border-radius:12px;border:1px solid var(--line);font-size:.875rem}
  .fao-branches-shared span{color:var(--muted)}
  .fao-branches-shared strong{color:var(--ink);font-weight:700}
  .fao-branches-grid{display:grid;gap:14px}
  @media(min-width:640px){.fao-branches-grid{grid-template-columns:repeat(2,1fr)}}
  .fao-branch-loc{padding:16px 18px;border:1px solid var(--line);border-radius:14px;background:var(--card);display:flex;flex-direction:column;gap:10px}
  .fao-branch-loc h3{font-size:.9375rem;font-weight:800;color:var(--ink);margin:0;line-height:1.3}
  .fao-branch-loc .branch-tag{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--brand);margin-bottom:2px}
  .fao-branch-loc address{font-style:normal;font-size:.875rem;color:#334155;line-height:1.55;margin:0}
  .fao-branch-loc .branch-meta{font-size:.8125rem;color:var(--muted);line-height:1.5}
  .fao-branch-loc .branch-meta a{color:var(--brand);font-weight:700;text-decoration:none}
  .fao-branch-loc .branch-meta a:hover{text-decoration:underline}
  .fao-branch-loc .map-link{margin-top:auto;padding-top:8px;font-size:.8125rem;font-weight:700}
  .fao-branches-policy{margin-top:16px;padding-top:14px;border-top:1px dashed var(--line);font-size:.8125rem;color:var(--muted);line-height:1.6}
  .fao-branches-policy ul{margin:6px 0 0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:6px 16px}
  .fao-branches-policy li{padding-left:16px;position:relative}
  .fao-branches-policy li::before{content:"✓";position:absolute;left:0;color:var(--brand);font-weight:700}

  /* —— Bảng giá thuê máy (GEO) —— */
  .price-table-wrap{overflow-x:auto;margin-bottom:28px;border:1px solid var(--line);border-radius:var(--radius);background:var(--card)}
  table.price-table{width:100%;border-collapse:collapse;font-size:.875rem}
  table.price-table th,table.price-table td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--line)}
  table.price-table th{font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);background:#f8fafc}
  table.price-table tr:last-child td{border-bottom:none}
  table.price-table a{font-weight:600;color:var(--ink)}
  table.price-table a:hover{color:var(--brand)}
  table.price-table .price{font-weight:700;color:var(--brand);white-space:nowrap}
  .brand-section{margin-bottom:36px}
  .brand-section h2{font-size:1rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--brand-soft)}
  .price-grid{display:grid;gap:10px}
  @media(min-width:640px){.price-grid.cols-3{grid-template-columns:repeat(3,1fr)}}
  .price-chip{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
  .price-chip strong{display:block;font-size:.9375rem;margin-bottom:4px}
  .price-chip .amt{font-size:1.125rem;font-weight:800;color:var(--brand)}
  .price-chip span{font-size:.8125rem;color:var(--muted)}
  .shop-strip{display:grid;gap:14px;margin:28px 0}
  @media(min-width:560px){.shop-strip{grid-template-columns:1fr 1fr}}
  .shop-mini{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px 18px}
  .shop-mini h3{font-size:.9375rem;font-weight:800;margin-bottom:8px}
  .shop-mini p{font-size:.8125rem;color:var(--muted);margin:4px 0;line-height:1.5}
  .shop-mini a{font-weight:600;font-size:.8125rem}

  /* —— Device review (blog-style) —— */
  .device-head{display:grid;gap:20px;margin-bottom:24px}
  @media(min-width:900px){.device-head{grid-template-columns:1.15fr 0.85fr;gap:24px;align-items:stretch}}
  @media(min-width:1200px){.device-head{grid-template-columns:1.2fr 0.8fr;gap:28px}}
  .device-hero{margin:0;border-radius:16px;overflow:hidden;aspect-ratio:4/3;max-height:none;background:#f1f5f9;box-shadow:var(--shadow)}
  @media(min-width:900px){.device-hero{aspect-ratio:auto;height:100%;min-height:280px;max-height:420px}}
  .device-hero img{width:100%;height:100%;object-fit:cover;display:block}
  .device-quick-facts{background:linear-gradient(160deg,var(--brand-soft) 0%,#fff 55%);border:1px solid #fbcfe8;border-radius:18px;padding:22px 24px;display:flex;flex-direction:column;gap:14px;box-shadow:var(--shadow)}
  .device-quick-facts h2{font-size:1rem;font-weight:800;color:var(--ink);margin:0;line-height:1.3}
  .device-quick-facts .fact-grid{display:grid;gap:10px}
  @media(min-width:520px){.device-quick-facts .fact-grid{grid-template-columns:1fr 1fr}}
  @media(min-width:900px){.device-quick-facts .fact-grid{grid-template-columns:1fr}}
  .device-fact{background:rgba(255,255,255,.85);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
  .device-fact dt{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:4px}
  .device-fact dd{margin:0;font-size:1rem;font-weight:800;color:var(--ink);line-height:1.3}
  .device-fact dd small{display:block;font-size:.75rem;font-weight:600;color:var(--muted);margin-top:2px}
  .device-quick-facts .cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:auto;padding-top:4px}
  .device-quick-facts .btn-primary{flex:1;min-width:140px;text-align:center;background:var(--brand);color:#fff!important;font-weight:800;padding:12px 18px;border-radius:999px;text-decoration:none!important;font-size:.9375rem}
  .device-quick-facts .btn-secondary{background:#fff;border:1px solid var(--line);color:var(--ink)!important;font-weight:700;padding:12px 16px;border-radius:999px;text-decoration:none!important;font-size:.8125rem}
  .device-trust{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
  .device-trust span{font-size:.6875rem;font-weight:700;background:#fff;border:1px solid var(--line);color:#475569;padding:4px 10px;border-radius:999px}
  .device-bottom-grid{display:grid;gap:24px;margin-top:8px}
  @media(min-width:1100px){.device-bottom-grid{grid-template-columns:1fr 1fr;gap:28px;align-items:start}}
  .seo-compare{background:#f8fafc;border:1px solid var(--line);border-radius:var(--radius);padding:20px 22px;margin:24px 0}
  .seo-compare h2{font-size:1.05rem;margin:0 0 12px}
  .seo-compare ul{list-style:none;margin:0;display:grid;gap:8px}
  @media(min-width:640px){.seo-compare ul{grid-template-columns:1fr 1fr}}
  .seo-compare li{padding:8px 0 8px 22px;position:relative;font-size:.9375rem;color:#334155;line-height:1.5}
  .seo-compare li::before{content:"✓";position:absolute;left:0;color:var(--brand);font-weight:800}
  .device-geo-strip{display:grid;gap:14px;margin:28px 0}
  @media(min-width:720px){.device-geo-strip{grid-template-columns:1fr 1fr}}
  .book-inline{display:inline-flex;align-items:center;gap:6px;background:var(--brand);color:#fff!important;font-weight:700;padding:10px 20px;border-radius:999px;text-decoration:none!important;font-size:.9375rem;margin-top:12px}
  .book-inline:hover{filter:brightness(1.05)}
  .price-table .book-cell a{display:inline-block;background:var(--brand-soft);color:var(--brand)!important;padding:6px 12px;border-radius:999px;font-size:.8125rem;font-weight:700;white-space:nowrap}
  .price-table .book-cell a:hover{background:var(--brand);color:#fff!important}
  .related-devices{display:grid;gap:10px}
  .related-devices a{display:block;padding:12px 14px;border:1px solid var(--line);border-radius:12px;text-decoration:none!important;background:var(--card)}
  .related-devices a strong{display:block;color:var(--ink);font-size:.9375rem;margin-bottom:2px}
  .related-devices a span{font-size:.8125rem;color:var(--brand);font-weight:700}
`;

const AI_STAR_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="#3b82f6"/></svg>`;

export function renderSiteHeader({ active = "home", ctaHref = "/catalog", ctaLabel = "Đặt máy" } = {}) {
  const nav = NAV_LINKS.map(
    (l) =>
      `<a href="${l.href}" class="${active === l.id ? "active" : ""}">${escapeHtml(l.label)}</a>`
  ).join("");
  const guides = GUIDE_LINKS.map(
    (g) => `<a href="${g.href}">${escapeHtml(g.label)}</a>`
  ).join("");

  return `<header class="site-header">
  <div class="wrap">
    <div class="bar">
      <a class="logo" href="/">
        <span class="logo-mark">FAO</span>
        <span>${escapeHtml(SITE_CONFIG.name)}</span>
      </a>
      <nav class="nav-main" aria-label="Điều hướng chính">
        <div class="nav-guides" aria-label="Hướng dẫn thuê">${guides}</div>
        ${nav}
        <a class="cta" href="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</a>
      </nav>
    </div>
  </div>
</header>`;
}

export function renderSiteFooter() {
  const { url, name, brand, phone, zalo, messenger } = SITE_CONFIG;
  const guideItems = GUIDE_LINKS.map(
    (g) => `<li><a href="${g.href}">${escapeHtml(g.label)}</a></li>`
  ).join("");
  const navItems = NAV_LINKS.map(
    (l) => `<li><a href="${l.href}">${escapeHtml(l.label)}</a></li>`
  ).join("");

  return `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="logo" href="/"><span class="logo-mark">FAO</span><span>${escapeHtml(name)}</span></a>
        <p>${escapeHtml(brand)} — thuê máy ảnh, ống kính tại TP.HCM. Đặt lịch online, lịch trống realtime.</p>
      </div>
      <div class="footer-col">
        <h4>Điều hướng</h4>
        <ul>${navItems}</ul>
      </div>
      <div class="footer-col">
        <h4>Hướng dẫn thuê</h4>
        <ul>${guideItems}</ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-contact">
        <a href="tel:${phone}">📞 ${phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3")}</a>
        <a href="${zalo}" rel="noopener">Zalo</a>
        <a href="${messenger}" rel="noopener">Messenger</a>
      </div>
      <span>© ${new Date().getFullYear()} ${escapeHtml(brand)}</span>
    </div>
  </div>
</footer>`;
}

export function renderBreadcrumb(items) {
  const parts = items.map((item, i) => {
    if (i === items.length - 1) {
      return `<span aria-current="page">${escapeHtml(item.label)}</span>`;
    }
    return `<a href="${item.href}">${escapeHtml(item.label)}</a>`;
  });
  return `<nav class="breadcrumb" aria-label="Breadcrumb">${parts.join(' <span aria-hidden="true">/</span> ')}</nav>`;
}

/** Khối tóm tắt trực tiếp — mô phỏng AI Overview của Google */
export function renderAiAnswerBox({ summary, highlight, sourcePath, sourceLabel }) {
  let safeText = escapeHtml(summary);
  if (highlight) {
    const escapedHighlight = escapeHtml(highlight);
    safeText = safeText.replace(
      escapedHighlight,
      `<strong>${escapedHighlight}</strong>`
    );
  }

  return `<aside class="ai-answer" itemscope itemtype="https://schema.org/Answer" data-speakable="ai-summary">
  <div class="ai-answer-label">${AI_STAR_SVG} Tóm tắt nhanh</div>
  <p itemprop="text" id="ai-summary">${safeText}</p>
  <cite>Nguồn: <a href="${escapeHtml(sourcePath)}" itemprop="url">${escapeHtml(sourceLabel || SITE_CONFIG.brand)}</a> — cập nhật ${new Date().getFullYear()}</cite>
</aside>`;
}

export function buildOrganizationNode() {
  const { url, name, brand, phone, logo } = SITE_CONFIG;
  return {
    "@type": "Organization",
    "@id": `${url}/#organization`,
    name: brand,
    alternateName: [name, "FAO Camera", "faocamera.vn"],
    url,
    logo: `${url}${logo}`,
    description:
      "Dịch vụ cho thuê máy ảnh, ống kính và phụ kiện tại TP.HCM — đặt lịch online, giá sinh viên từ 150.000đ/ngày.",
    telephone: `+84-${phone.replace(/^0/, "")}`,
    sameAs: [
      "https://www.facebook.com/Faodigitalcamera",
      "https://www.instagram.com/faodigitalcamera",
      "https://zalo.me/0901355198",
    ],
    knowsAbout: [
      "Cho thuê máy ảnh",
      "Thuê máy ảnh Fujifilm",
      "Thuê máy quay vlog",
      "Thuê máy ảnh sinh viên",
    ],
  };
}

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** Schema LocalBusiness đầy đủ — tối ưu Google AI Overview & Local Pack */
export function buildLocalBusinessNode(lb, pageUrl) {
  const phoneE164 = lb.phone.startsWith("+") ? lb.phone : `+84-${lb.phone.replace(/^0/, "")}`;
  return {
    "@type": ["LocalBusiness", "Store"],
    "@id": `${pageUrl}#localbusiness`,
    name: lb.name,
    description: lb.description,
    telephone: phoneE164,
    url: pageUrl,
    image: absoluteImageUrl("/og-image.png"),
    priceRange: lb.priceRange || "₫₫",
    currenciesAccepted: "VND",
    paymentAccepted: "Cash, Credit Card, Bank Transfer",
    openingHours: lb.openingHours || `Mo-Su ${lb.opens || "09:00"}-${lb.closes || "22:00"}`,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: WEEKDAYS,
        opens: lb.opens || "09:00",
        closes: lb.closes || "22:00",
      },
    ],
    address: {
      "@type": "PostalAddress",
      streetAddress: lb.address,
      addressLocality: lb.locality || "TP.HCM",
      addressRegion: lb.district || lb.locality || "TP.HCM",
      addressCountry: "VN",
    },
    ...(lb.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: lb.geo.lat,
            longitude: lb.geo.lng,
          },
        }
      : {}),
    ...(lb.mapUrl ? { hasMap: lb.mapUrl } : {}),
    parentOrganization: { "@id": `${SITE_CONFIG.url}/#organization` },
    ...(lb.areaServed?.length
      ? {
          areaServed: lb.areaServed.map((name) => ({
            "@type": "AdministrativeArea",
            name,
          })),
        }
      : {}),
    makesOffer: {
      "@type": "Offer",
      priceCurrency: "VND",
      description: lb.priceFrom || "Từ 150.000đ/ngày",
      itemOffered: {
        "@type": "Service",
        name: "Cho thuê máy ảnh",
        serviceType: "Camera rental",
        provider: { "@id": `${pageUrl}#localbusiness` },
      },
    },
  };
}

/** Khối HTML địa chỉ + ưu điểm — cấu trúc Google AI hay trích dẫn */
export function renderLocalBusinessCard(lb, pros = []) {
  const phoneFmt = lb.phone.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  const hours = lb.opens && lb.closes ? `${lb.opens} – ${lb.closes} hàng ngày` : "9h00 – 22h00 hàng ngày";
  const prosHtml =
    pros.length > 0
      ? `<div class="pros">
          <h3>Ưu điểm</h3>
          <ul>${pros.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
        </div>`
      : "";

  return `<section class="local-card" itemscope itemtype="https://schema.org/LocalBusiness">
  <h2 itemprop="name">${escapeHtml(lb.name)}</h2>
  <dl>
    <div><dt>Địa chỉ</dt><dd itemprop="address" itemscope itemtype="https://schema.org/PostalAddress"><span itemprop="streetAddress">${escapeHtml(lb.fullAddress || lb.address)}</span></dd></div>
    <div><dt>Giá thuê</dt><dd>Từ <strong>${escapeHtml(lb.priceFrom || "150.000đ/ngày")}</strong></dd></div>
    <div><dt>Giờ mở cửa</dt><dd>${escapeHtml(hours)}</dd></div>
    <div><dt>Hotline</dt><dd><a href="tel:${escapeHtml(lb.phone)}" itemprop="telephone">${escapeHtml(phoneFmt)}</a></dd></div>
    ${lb.areaServed?.length ? `<div><dt>Khu vực phục vụ</dt><dd>${escapeHtml(lb.areaServed.slice(0, 5).join(", "))}</dd></div>` : ""}
  </dl>
  ${prosHtml}
  ${lb.mapUrl ? `<a class="map-link" href="${escapeHtml(lb.mapUrl)}" rel="noopener" target="_blank">Xem trên Google Maps →</a>` : ""}
</section>`;
}

const BRANCH_HIGHLIGHTS = {
  PHU_NHUAN: "Gần trung tâm Sài Gòn · Fujifilm, Canon, Sony đầy đủ",
  Q9: "Tiện sinh viên Làng Đại Học · Đông Sài Gòn",
};

/** Một card chi nhánh — chính sách chung, khác địa chỉ/hotline */
export function renderFaoBranchesUnifiedCard(branchKeys = ["PHU_NHUAN", "Q9"]) {
  const keys = [...new Set(branchKeys.filter((k) => BRANCHES[k]))];
  if (!keys.length) keys.push("PHU_NHUAN");

  const branches = keys.map((k) => ({ key: k, raw: BRANCHES[k], lb: branchToLocalBusiness(BRANCHES[k]) }));
  const ref = branches[0].lb;
  const hours =
    ref.opens && ref.closes ? `${ref.opens} – ${ref.closes} hàng ngày` : "9h00 – 22h00 hàng ngày";

  const locations = branches
    .map(({ key, raw, lb }) => {
      const phoneFmt = raw.phoneDisplay || lb.phone;
      return `<article class="fao-branch-loc" itemscope itemtype="https://schema.org/LocalBusiness">
        <div class="branch-tag">Chi nhánh</div>
        <h3 itemprop="name">${escapeHtml(lb.name)}</h3>
        <address itemprop="address" itemscope itemtype="https://schema.org/PostalAddress">
          <span itemprop="streetAddress">${escapeHtml(lb.fullAddress || lb.address)}</span>
        </address>
        <p class="branch-meta">${escapeHtml(BRANCH_HIGHLIGHTS[key] || "")}</p>
        <p class="branch-meta">
          Hotline: <a href="tel:${escapeHtml(lb.phone)}" itemprop="telephone">${escapeHtml(phoneFmt)}</a>
          · ${escapeHtml((lb.areaServed || []).slice(0, 4).join(", "))}
        </p>
        ${lb.mapUrl ? `<a class="map-link" href="${escapeHtml(lb.mapUrl)}" rel="noopener" target="_blank">Google Maps →</a>` : ""}
      </article>`;
    })
    .join("");

  return `<section class="local-card fao-branches-unified" aria-label="Chi nhánh FAO Camera">
    <h2>Chi nhánh FAO Camera TP.HCM</h2>
    <div class="fao-branches-shared">
      <span>Giá thuê: <strong>Từ ${escapeHtml(ref.priceFrom || "150.000đ/ngày")}</strong></span>
      <span>Giờ mở cửa: <strong>${escapeHtml(hours)}</strong></span>
      <span>Nhận/trả: <strong>Online · lịch trống realtime</strong></span>
    </div>
    <div class="fao-branches-grid">${locations}</div>
    <div class="fao-branches-policy">
      Chính sách đồng bộ 2 chi nhánh:
      <ul>
        <li>HSSV CỌC 0Đ (minh chứng lịch học)</li>
        <li>Giảm 20% T2–T6 đặt online</li>
        <li>Hoàn cọc sau khi trả máy</li>
      </ul>
    </div>
  </section>`;
}

export function buildBreadcrumbNode(items, pageUrl) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: item.href.startsWith("http") ? item.href : `${SITE_CONFIG.url}${item.href}`,
    })),
  };
}

export function buildWebPageNode({
  pageUrl,
  name,
  description,
  dateModified,
  speakable = true,
}) {
  return {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name,
    description,
    inLanguage: "vi-VN",
    isPartOf: { "@id": `${SITE_CONFIG.url}/#website` },
    about: { "@id": `${SITE_CONFIG.url}/#organization` },
    ...(dateModified ? { dateModified } : {}),
    ...(speakable
      ? {
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: ["#ai-summary", "h1", ".article-lead", ".intro"],
          },
        }
      : {}),
  };
}

export function buildWebsiteNode() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_CONFIG.url}/#website`,
    url: SITE_CONFIG.url,
    name: SITE_CONFIG.name,
    publisher: { "@id": `${SITE_CONFIG.url}/#organization` },
    inLanguage: "vi-VN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/catalog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function stringifySchemaGraph(graph) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [buildWebsiteNode(), buildOrganizationNode(), ...graph],
  });
}

/** Link catalog kèm UTM — SPA đọc và lưu attribution. */
export function catalogHref(href, channel, slug) {
  const pathOnly = (href || "/catalog").split("?")[0];
  const q = new URLSearchParams((href || "").includes("?") ? href.split("?")[1] : "");
  if (channel === "seo") {
    q.set("utm_source", "fao_seo");
    q.set("utm_medium", "landing");
    if (slug) q.set("utm_campaign", slug);
  } else if (channel === "blog") {
    q.set("utm_source", "fao_blog");
    q.set("utm_medium", "article");
    if (slug) q.set("utm_campaign", slug);
  }
  const qs = q.toString();
  return qs ? `${pathOnly}?${qs}` : pathOnly;
}

/** Script nhẹ trên trang SEO/blog tĩnh: lưu first-touch + gắn UTM link catalog. */
export function renderAttributionBootstrapScript(contentType, slug) {
  return `<script>
(function(){
  var KEY="fao_traffic_attribution",TTL=30*24*60*60*1000;
  var type=${JSON.stringify(contentType)},slug=${JSON.stringify(slug || "")};
  function snap(){return{channel:type,medium:type==="seo"?"landing":"article",campaign:slug,landingPath:location.pathname,referrer:document.referrer||null,capturedAt:new Date().toISOString()};}
  try{
    var raw=localStorage.getItem(KEY),use=true;
    if(raw){var o=JSON.parse(raw);if(o&&o.capturedAt&&(Date.now()-new Date(o.capturedAt).getTime())<TTL)use=false;}
    if(use)localStorage.setItem(KEY,JSON.stringify(snap()));
  }catch(e){}
  function decorate(a){
    var h=a.getAttribute("href");if(!h||h.indexOf("/catalog")!==0)return;
    var u=new URL(h,location.origin);
    if(type==="seo"){u.searchParams.set("utm_source","fao_seo");u.searchParams.set("utm_medium","landing");if(slug)u.searchParams.set("utm_campaign",slug);}
    if(type==="blog"){u.searchParams.set("utm_source","fao_blog");u.searchParams.set("utm_medium","article");if(slug)u.searchParams.set("utm_campaign",slug);}
    a.setAttribute("href",u.pathname+u.search);
  }
  document.querySelectorAll('a[href^="/catalog"]').forEach(decorate);
  document.querySelectorAll('a[data-catalog-book="1"]').forEach(decorate);
})();
</script>`;
}

export function absoluteImageUrl(imagePath) {
  if (!imagePath) return `${SITE_CONFIG.url}/og-image.png`;
  if (imagePath.startsWith("http")) return imagePath;
  return `${SITE_CONFIG.url}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
}

export function renderHead({
  title,
  description,
  path,
  jsonLd,
  ogType = "website",
  image,
  geo = false,
  extraCss = "",
}) {
  const pageUrl = `${SITE_CONFIG.url}${path}`;
  const fullTitle = `${title} | ${SITE_CONFIG.name}`;
  const ogImage = absoluteImageUrl(image);
  const geoMeta = geo
    ? `<meta name="geo.region" content="VN-SG" />
  <meta name="geo.placename" content="TP.HCM" />
  <meta name="ICBM" content="10.7997, 106.6878" />`
    : "";
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
  <meta name="theme-color" content="#E85C9C" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${escapeHtml(pageUrl)}" />
  ${geoMeta}
  <meta property="og:type" content="${ogType}" />
  <meta property="og:locale" content="vi_VN" />
  <meta property="og:site_name" content="${escapeHtml(SITE_CONFIG.name)}" />
  <meta property="og:title" content="${escapeHtml(fullTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(fullTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  ${jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : ""}
  <style>${STATIC_CSS}${extraCss}</style>
</head>`;
}
