/**
 * Blog UI — design system, components & client scripts (static HTML).
 */
import { escapeHtml } from "../static-site-layout.mjs";

export const BLOG_CSS = `
  :root{
    --blog-prose:44rem;--blog-shell:min(104rem,calc(100vw - 48px));--blog-article-shell:min(108rem,calc(100vw - 40px));
    --font-display:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    --font-body:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:24px;--space-6:32px;--space-7:48px;--space-8:64px;
    --radius-sm:10px;--radius-md:16px;--radius-lg:22px;--radius-xl:28px;
    --shadow-sm:0 1px 2px rgba(15,23,42,.04),0 4px 16px rgba(15,23,42,.04);
    --shadow-md:0 4px 24px rgba(15,23,42,.08);
    --shadow-lg:0 12px 48px rgba(15,23,42,.12);
    --ease:cubic-bezier(.4,0,.2,1);
    --blog-bg:#fafbfc;--blog-surface:#fff;--blog-ink:#0f172a;--blog-muted:#64748b;--blog-line:#e8edf3;
    --blog-accent:#E85C9C;--blog-accent-soft:#FFF1F8;
  }
  [data-theme="dark"]{
    --blog-bg:#0c0f14;--blog-surface:#151921;--blog-ink:#f1f5f9;--blog-muted:#94a3b8;--blog-line:#1e293b;
    --blog-accent-soft:rgba(232,92,156,.12);--shadow-sm:0 1px 2px rgba(0,0,0,.2);--shadow-md:0 4px 24px rgba(0,0,0,.35);
    --bg:var(--blog-bg);--card:var(--blog-surface);--ink:var(--blog-ink);--muted:var(--blog-muted);--line:var(--blog-line);
  }
  body.blog-page{background:var(--blog-bg);font-family:var(--font-body)}
  body.blog-page .site-header{background:rgba(250,251,252,.88)}
  [data-theme="dark"] body.blog-page .site-header{background:rgba(12,15,20,.88);border-color:var(--blog-line)}
  .reading-progress{position:fixed;top:0;left:0;height:3px;width:0;background:linear-gradient(90deg,var(--blog-accent),#f472b6);z-index:100;transition:width .08s linear;pointer-events:none}

  /* —— Blog index —— */
  .blog-wrap{max-width:var(--blog-shell);width:100%;margin:0 auto}
  body.blog-article .blog-wrap{max-width:var(--blog-article-shell)}
  .blog-index-hero{padding:var(--space-7) 0 var(--space-6);text-align:center}
  .blog-index-hero .eyebrow{font-size:.75rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--blog-accent);margin-bottom:var(--space-3)}
  .blog-index-hero h1{font-family:var(--font-display);font-size:clamp(2.25rem,5vw,3.25rem);font-weight:800;letter-spacing:-.04em;line-height:1.08;margin-bottom:var(--space-4);color:var(--blog-ink)}
  .blog-index-hero p{font-size:clamp(1rem,2vw,1.125rem);color:var(--blog-muted);max-width:34rem;margin:0 auto;line-height:1.65}
  .blog-toolbar{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;margin-bottom:var(--space-5)}
  .blog-search{flex:1;min-width:200px;position:relative}
  .blog-search input{width:100%;padding:12px 16px 12px 42px;border:1px solid var(--blog-line);border-radius:999px;background:var(--blog-surface);font-size:.9375rem;color:var(--blog-ink);transition:border-color .2s,box-shadow .2s}
  .blog-search input:focus{outline:none;border-color:var(--blog-accent);box-shadow:0 0 0 3px var(--blog-accent-soft)}
  .blog-search svg{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--blog-muted);pointer-events:none}
  .theme-toggle{border:1px solid var(--blog-line);background:var(--blog-surface);color:var(--blog-muted);width:44px;height:44px;border-radius:999px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s var(--ease);flex-shrink:0}
  .theme-toggle:hover{border-color:var(--blog-accent);color:var(--blog-accent)}
  .blog-filters-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;margin:0 -4px var(--space-5);padding:4px}
  .blog-filters-scroll::-webkit-scrollbar{display:none}
  .blog-filters{display:flex;gap:var(--space-2);min-width:min-content;padding-bottom:2px}
  .filter-chip{border:1px solid var(--blog-line);background:var(--blog-surface);color:var(--blog-muted);font-size:.8125rem;font-weight:600;padding:10px 18px;border-radius:999px;cursor:pointer;transition:all .2s var(--ease);white-space:nowrap;min-height:44px}
  .filter-chip:hover{border-color:var(--blog-accent);color:var(--blog-accent);transform:translateY(-1px)}
  .filter-chip.active{background:var(--blog-ink);border-color:var(--blog-ink);color:#fff;box-shadow:var(--shadow-sm)}
  [data-theme="dark"] .filter-chip.active{background:var(--blog-accent);border-color:var(--blog-accent)}

  .blog-featured{display:grid;gap:var(--space-4);margin-bottom:var(--space-7)}
  @media(min-width:768px){.blog-featured{grid-template-columns:1.35fr 1fr;min-height:420px}}
  .featured-main{position:relative;border-radius:var(--radius-xl);overflow:hidden;background:var(--blog-ink);min-height:320px;display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(24px,4vw,36px);text-decoration:none!important;box-shadow:var(--shadow-lg);transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
  .featured-main:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg)}
  .featured-main .thumb-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;transition:transform .6s var(--ease)}
  .featured-main:hover .thumb-bg{transform:scale(1.03)}
  .featured-main::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(0deg,rgba(15,23,42,.92) 0%,rgba(15,23,42,.35) 45%,rgba(15,23,42,.05) 100%)}
  .featured-main .card-content{position:relative;z-index:2}
  .featured-main .tag{display:inline-flex;align-items:center;gap:6px;background:rgba(232,92,156,.95);color:#fff;font-size:.6875rem;font-weight:700;padding:6px 14px;border-radius:999px;margin-bottom:var(--space-3);letter-spacing:.04em;text-transform:uppercase}
  .featured-main h2{font-family:var(--font-display);font-size:clamp(1.4rem,3vw,2rem);font-weight:800;line-height:1.2;margin-bottom:var(--space-3);color:#fff;letter-spacing:-.02em}
  .featured-main p{font-size:.9375rem;opacity:.9;line-height:1.6;color:#e2e8f0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:var(--space-3)}
  .featured-main .meta-row{display:flex;flex-wrap:wrap;gap:var(--space-3);font-size:.8125rem;color:rgba(255,255,255,.75)}
  .featured-side{display:flex;flex-direction:column;gap:var(--space-4)}
  .mini-card{flex:1;background:var(--blog-surface);border:1px solid var(--blog-line);border-radius:var(--radius-lg);overflow:hidden;text-decoration:none!important;display:grid;grid-template-columns:120px 1fr;min-height:120px;transition:all .25s var(--ease);box-shadow:var(--shadow-sm)}
  .mini-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md);border-color:transparent}
  .mini-card .mini-thumb{width:120px;height:100%;min-height:120px;object-fit:cover;background:#f1f5f9}
  .mini-card .mini-body{padding:var(--space-4);display:flex;flex-direction:column;justify-content:center;align-items:flex-start}
  .mini-card .tag{font-size:.6875rem;font-weight:700;color:var(--blog-accent);text-transform:uppercase;letter-spacing:.05em}
  .mini-card .tag-pill{align-self:flex-start;display:inline-flex;align-items:center;font-size:.6875rem;font-weight:700;padding:4px 10px;border-radius:999px;letter-spacing:.03em;text-transform:uppercase;margin-bottom:2px}
  .mini-card h3{font-size:.9375rem;font-weight:700;color:var(--blog-ink);margin:6px 0;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .mini-card p{font-size:.8125rem;color:var(--blog-muted);line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

  .post-grid{display:grid;gap:var(--space-5)}
  @media(min-width:640px){.post-grid{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:1024px){.post-grid{grid-template-columns:repeat(3,1fr)}}
  .post-card{background:var(--blog-surface);border:1px solid var(--blog-line);border-radius:var(--radius-lg);overflow:hidden;text-decoration:none!important;display:flex;flex-direction:column;transition:all .3s var(--ease);box-shadow:var(--shadow-sm);animation:blogFadeIn .5s var(--ease) both}
  .post-card:nth-child(2){animation-delay:.05s}.post-card:nth-child(3){animation-delay:.1s}.post-card:nth-child(4){animation-delay:.15s}
  @keyframes blogFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .post-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-md);border-color:transparent}
  .post-card.is-hidden{display:none!important}
  .post-card-thumb{aspect-ratio:16/10;overflow:hidden;background:linear-gradient(135deg,var(--blog-accent-soft),#f1f5f9);position:relative}
  .post-card-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .5s var(--ease)}
  .post-card:hover .post-card-thumb img{transform:scale(1.05)}
  .post-card-body{padding:var(--space-5);flex:1;display:flex;flex-direction:column;gap:var(--space-2)}
  .post-card .meta{font-size:.75rem;color:var(--blog-muted);display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center}
  .post-card .meta .tag-pill{flex:0 0 auto;width:fit-content;line-height:1.25}
  .post-card .meta .tag-pill.tag-pill--review{background:#eff6ff;color:#2563eb}
  .post-card .meta .tag-pill.tag-pill--rent{background:#ecfdf5;color:#059669}
  .post-card .meta .tag-pill.tag-pill--ky-yeu,.post-card .meta .tag-pill.tag-pill--kỷ-yếu{background:var(--blog-accent-soft);color:var(--blog-accent)}
  .post-card .meta .tag-pill.tag-pill--du-lich,.post-card .meta .tag-pill.tag-pill--du-lịch{background:#ecfdf5;color:#059669}
  .post-card .meta .tag-pill.tag-pill--vlog{background:#fef3c7;color:#d97706}
  .post-card .meta .tag-pill.tag-pill--tips{background:#f3e8ff;color:#7c3aed}
  .post-card .meta .tag-pill.tag-pill--default{background:var(--blog-accent-soft);color:var(--blog-accent)}
  .tag-pill{display:inline-flex;align-items:center;width:fit-content;font-size:.6875rem;font-weight:700;padding:4px 10px;border-radius:999px;letter-spacing:.03em;text-transform:uppercase}
  .tag-pill--review{background:#eff6ff;color:#2563eb}
  .tag-pill--ky-yeu,.tag-pill--kỷ-yếu{background:var(--blog-accent-soft);color:var(--blog-accent)}
  .tag-pill--du-lich,.tag-pill--du-lịch{background:#ecfdf5;color:#059669}
  .tag-pill--vlog{background:#fef3c7;color:#d97706}
  .tag-pill--tips{background:#f3e8ff;color:#7c3aed}
  .tag-pill--rent{background:#ecfdf5;color:#059669}
  .tag-pill--canon{background:#fef2f2;color:#dc2626}
  .tag-pill--fujifilm{background:#fff7ed;color:#ea580c}
  .tag-pill--sony{background:#eff6ff;color:#2563eb}
  .tag-pill--dji{background:#f0fdf4;color:#16a34a}
  .tag-pill--default{background:var(--blog-accent-soft);color:var(--blog-accent)}
  .post-card h2{font-family:var(--font-display);font-size:1.0625rem;font-weight:700;color:var(--blog-ink);line-height:1.4;letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;flex:1}
  .post-card p{font-size:.875rem;color:var(--blog-muted);line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .post-card .read-more{margin-top:auto;font-size:.8125rem;font-weight:700;color:var(--blog-accent);display:inline-flex;align-items:center;gap:4px}
  .blog-empty{text-align:center;padding:var(--space-8) var(--space-5);background:var(--blog-surface);border:1px dashed var(--blog-line);border-radius:var(--radius-lg);color:var(--blog-muted)}
  .blog-empty h3{font-size:1.125rem;color:var(--blog-ink);margin-bottom:var(--space-2)}

  .blog-services{margin-top:var(--space-8);padding:var(--space-6);background:var(--blog-surface);border:1px solid var(--blog-line);border-radius:var(--radius-xl)}
  .blog-services h2{font-size:.8125rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--blog-muted);margin-bottom:var(--space-4)}
  .cross-grid{display:grid;gap:var(--space-2)}
  @media(min-width:640px){.cross-grid{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:1024px){.cross-grid{grid-template-columns:repeat(4,1fr)}}
  .cross-grid a{display:block;padding:var(--space-3) var(--space-4);border-radius:var(--radius-sm);font-size:.875rem;font-weight:600;color:var(--blog-ink);background:var(--blog-bg);text-decoration:none!important;transition:all .2s}
  .cross-grid a:hover{background:var(--blog-accent-soft);color:var(--blog-accent)}

  /* —— Article reading —— */
  .blog-article-shell{display:grid;gap:var(--space-6);width:100%}
  @media(min-width:1100px){
    .blog-article-shell{
      grid-template-columns:minmax(200px,240px) minmax(0,1fr) minmax(280px,320px);
      gap:clamp(20px,2.5vw,40px);
      align-items:start;
    }
  }
  @media(min-width:1400px){
    .blog-article-shell{grid-template-columns:260px minmax(0,1fr) 340px;gap:40px}
  }
  .blog-toc-rail{display:none}
  @media(min-width:1100px){.blog-toc-rail{display:block;position:sticky;top:96px;max-height:calc(100vh - 120px);overflow-y:auto}}
  .blog-toc-rail nav{background:var(--blog-surface);border:1px solid var(--blog-line);border-radius:var(--radius-md);padding:var(--space-4);min-width:0}
  .blog-toc-rail h2{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--blog-muted);margin-bottom:var(--space-3)}
  .blog-toc-rail a{display:block;font-size:.8125rem;color:var(--blog-muted);padding:6px 0 6px 12px;border-left:2px solid transparent;line-height:1.4;text-decoration:none!important;transition:all .15s}
  .blog-toc-rail a:hover,.blog-toc-rail a.is-active{color:var(--blog-accent);border-left-color:var(--blog-accent);font-weight:600}
  .blog-toc-rail a.toc-external{border-left-color:transparent;color:var(--blog-ink);font-weight:600}
  .blog-toc-rail a.toc-external:hover{color:var(--blog-accent);border-left-color:var(--blog-accent)}
  .blog-prose-wrap{min-width:0;width:100%}
  .blog-prose{background:var(--blog-surface);border:1px solid var(--blog-line);border-radius:var(--radius-xl);padding:clamp(var(--space-5),4vw,var(--space-7));box-shadow:var(--shadow-sm);width:100%;max-width:var(--blog-prose);margin:0 auto}
  @media(min-width:1100px){.blog-prose{max-width:none;margin:0}}
  .blog-prose .article-hero{margin:calc(-1 * clamp(24px,4vw,40px)) calc(-1 * clamp(24px,4vw,40px)) var(--space-6);border-radius:var(--radius-xl) var(--radius-xl) 0 0;overflow:hidden;aspect-ratio:21/9;max-height:min(480px,42vh);background:#f1f5f9}
  .blog-prose .article-hero img{width:100%;height:100%;object-fit:cover;display:block}
  .blog-prose h1{font-family:var(--font-display);font-size:clamp(1.75rem,3.5vw,2.75rem);font-weight:800;line-height:1.12;letter-spacing:-.03em;margin-bottom:var(--space-4);color:var(--blog-ink);max-width:52rem}
  .blog-prose .article-meta{display:flex;flex-wrap:wrap;gap:var(--space-2) var(--space-4);font-size:.8125rem;color:var(--blog-muted);padding-bottom:var(--space-5);margin-bottom:var(--space-5);border-bottom:1px solid var(--blog-line);align-items:center}
  .blog-prose .article-meta .tag{font-size:.6875rem;font-weight:700;padding:5px 12px;border-radius:999px;text-transform:uppercase;letter-spacing:.04em}
  .blog-prose .article-lead{font-size:clamp(1.0625rem,2vw,1.25rem);color:var(--blog-muted);line-height:1.75;margin-bottom:var(--space-6);font-weight:400;max-width:var(--blog-prose)}
  .blog-prose .ai-answer{max-width:var(--blog-prose)}
  .blog-prose-body{font-size:1.0625rem;line-height:1.8;color:var(--blog-ink);max-width:var(--blog-prose)}
  .blog-prose-body h2{font-family:var(--font-display);font-size:1.375rem;font-weight:700;margin:var(--space-7) 0 var(--space-4);letter-spacing:-.02em;line-height:1.3;color:var(--blog-ink);scroll-margin-top:96px}
  .blog-prose-body h2:first-child{margin-top:0}
  .blog-prose-body p{margin-bottom:var(--space-5);color:#334155}
  [data-theme="dark"] .blog-prose-body p{color:#cbd5e1}
  .blog-prose-body ul{margin:0 0 var(--space-5) var(--space-5);color:#334155}
  [data-theme="dark"] .blog-prose-body ul{color:#cbd5e1}
  .blog-prose-body li{margin-bottom:var(--space-3);padding-left:var(--space-2);line-height:1.7}
  .blog-prose-body li::marker{color:var(--blog-accent)}
  .blog-prose-body blockquote{margin:var(--space-6) 0;padding:var(--space-4) var(--space-5);border-left:4px solid var(--blog-accent);background:var(--blog-accent-soft);border-radius:0 var(--radius-sm) var(--radius-sm) 0;font-style:italic;color:var(--blog-muted)}
  .insight-box{margin:var(--space-6) 0;padding:var(--space-5);background:linear-gradient(135deg,#eff6ff,#fdf2f8);border:1px solid #bfdbfe;border-radius:var(--radius-md);font-size:.9375rem;line-height:1.65}
  [data-theme="dark"] .insight-box{background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(232,92,156,.08));border-color:var(--blog-line)}
  .insight-box strong{display:block;font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--blog-accent);margin-bottom:var(--space-2)}
  .inline-cta{margin:var(--space-7) 0;padding:var(--space-6);background:var(--blog-bg);border:1px solid var(--blog-line);border-radius:var(--radius-lg);display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-4);justify-content:space-between;max-width:none}
  @media(min-width:1100px){.inline-cta,.related-section,.article-nav{max-width:none}}
  .inline-cta-text h3{font-size:1rem;font-weight:700;color:var(--blog-ink);margin-bottom:4px}
  .inline-cta-text p{font-size:.875rem;color:var(--blog-muted);margin:0;line-height:1.5}
  .inline-cta .btn-cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 var(--space-5);background:var(--blog-accent);color:#fff!important;font-weight:700;font-size:.9375rem;border-radius:999px;text-decoration:none!important;transition:transform .2s,box-shadow .2s;white-space:nowrap}
  .inline-cta .btn-cta:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(232,92,156,.35);text-decoration:none!important}

  .blog-sidebar-rail{position:sticky;top:96px;display:flex;flex-direction:column;gap:var(--space-4)}
  @media(max-width:1099px){.blog-sidebar-rail{position:static}}
  .sidebar-box{background:var(--blog-surface);border:1px solid var(--blog-line);border-radius:var(--radius-md);padding:var(--space-5)}
  .sidebar-box h3{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--blog-muted);margin-bottom:var(--space-3)}
  .sidebar-box ul{list-style:none}
  .sidebar-box li{margin-bottom:var(--space-2)}
  .sidebar-box a{font-size:.875rem;font-weight:500;line-height:1.45;color:var(--blog-ink);text-decoration:none!important;display:block;padding:4px 0}
  .sidebar-box a:hover{color:var(--blog-accent)}
  .sidebar-cta{background:linear-gradient(160deg,var(--blog-accent-soft),var(--blog-surface));border-color:rgba(232,92,156,.25)}
  .sidebar-cta p{font-size:.875rem;color:var(--blog-muted);margin-bottom:var(--space-3);line-height:1.55}
  .sidebar-cta .btn{display:flex;align-items:center;justify-content:center;min-height:48px;background:var(--blog-accent);color:#fff!important;font-weight:700;padding:12px 20px;border-radius:999px;font-size:.875rem;text-decoration:none!important;width:100%}

  .related-grid{display:grid;gap:var(--space-4);margin-top:var(--space-5)}
  @media(min-width:640px){.related-grid{grid-template-columns:repeat(2,1fr)}}
  @media(min-width:1100px){.related-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .related-card{display:flex;flex-direction:column;background:var(--blog-surface);border:1px solid var(--blog-line);border-radius:var(--radius-lg);overflow:hidden;text-decoration:none!important;transition:all .25s var(--ease);box-shadow:var(--shadow-sm)}
  .related-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-md)}
  .related-card img{width:100%;aspect-ratio:16/10;object-fit:cover}
  .related-card-body{padding:var(--space-4);display:flex;flex-direction:column;align-items:flex-start;gap:var(--space-2)}
  .related-card h3{font-size:.9375rem;font-weight:700;color:var(--blog-ink);line-height:1.35;margin-bottom:var(--space-2);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .related-card span{font-size:.75rem;color:var(--blog-muted)}

  .article-nav{display:grid;gap:var(--space-3);margin-top:var(--space-7);padding-top:var(--space-6);border-top:1px solid var(--blog-line)}
  @media(min-width:640px){.article-nav{grid-template-columns:1fr 1fr}}
  .article-nav a{display:block;padding:var(--space-4);border:1px solid var(--blog-line);border-radius:var(--radius-md);text-decoration:none!important;transition:all .2s}
  .article-nav a:hover{border-color:var(--blog-accent);background:var(--blog-accent-soft)}
  .article-nav .label{font-size:.6875rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--blog-muted);margin-bottom:4px}
  .article-nav .title{font-size:.875rem;font-weight:600;color:var(--blog-ink);line-height:1.4}
  .article-nav .next{text-align:right}

  .toc-mobile-fab{position:fixed;bottom:80px;right:16px;z-index:40;width:52px;height:52px;border-radius:999px;background:var(--blog-ink);color:#fff;border:none;box-shadow:var(--shadow-lg);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.25rem}
  @media(min-width:1100px){.toc-mobile-fab{display:none}}
  .toc-sheet{position:fixed;inset:0;z-index:60;pointer-events:none;opacity:0;transition:opacity .25s}
  .toc-sheet.is-open{pointer-events:auto;opacity:1}
  .toc-sheet-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.5);backdrop-filter:blur(4px)}
  .toc-sheet-panel{position:absolute;bottom:0;left:0;right:0;background:var(--blog-surface);border-radius:var(--radius-xl) var(--radius-xl) 0 0;padding:var(--space-5) var(--space-5) var(--space-7);max-height:70vh;overflow-y:auto;transform:translateY(100%);transition:transform .3s var(--ease)}
  .toc-sheet.is-open .toc-sheet-panel{transform:translateY(0)}
  .toc-sheet h2{font-size:1rem;font-weight:700;margin-bottom:var(--space-4)}
  .toc-sheet a{display:block;padding:var(--space-3) 0;border-bottom:1px solid var(--blog-line);color:var(--blog-ink);text-decoration:none!important;font-size:.9375rem}
  .toc-sheet a.toc-external{color:var(--blog-accent);font-weight:600}
  .mobile-cta-bar{position:fixed;bottom:0;left:0;right:0;z-index:45;padding:var(--space-3) var(--space-4);background:rgba(250,251,252,.95);backdrop-filter:blur(12px);border-top:1px solid var(--blog-line);display:flex;gap:var(--space-3)}
  [data-theme="dark"] .mobile-cta-bar{background:rgba(12,15,20,.95)}
  @media(min-width:1100px){.mobile-cta-bar{display:none}}
  .mobile-cta-bar a{flex:1;display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:999px;font-weight:700;font-size:.9375rem;text-decoration:none!important}
  .mobile-cta-bar .primary{background:var(--blog-accent);color:#fff!important}
  .mobile-cta-bar .secondary{background:var(--blog-surface);border:1px solid var(--blog-line);color:var(--blog-ink)!important}
  body.blog-article{padding-bottom:72px}
  @media(min-width:1100px){body.blog-article{padding-bottom:0}}
`;

const SEARCH_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>`;

export function categoryPillClass(category) {
  const key = String(category || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
  const map = {
    review: "tag-pill--review",
    "ky-yeu": "tag-pill--ky-yeu",
    "du-lich": "tag-pill--du-lich",
    vlog: "tag-pill--vlog",
    tips: "tag-pill--tips",
    "cho-thue": "tag-pill--rent",
    canon: "tag-pill--canon",
    fujifilm: "tag-pill--fujifilm",
    sony: "tag-pill--sony",
    dji: "tag-pill--dji",
  };
  return map[key] || "tag-pill--default";
}

export function renderCategoryPill(category) {
  return `<span class="tag-pill ${categoryPillClass(category)}">${escapeHtml(category)}</span>`;
}

export function renderReadingProgress() {
  return `<div class="reading-progress" id="reading-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Tiến độ đọc"></div>`;
}

export function renderBlogSearch() {
  return `<div class="blog-search" role="search">
    ${SEARCH_SVG}
    <input type="search" id="blog-search" placeholder="Tìm bài viết, review máy…" autocomplete="off" aria-label="Tìm kiếm blog" />
  </div>`;
}

export function renderThemeToggle() {
  return `<button type="button" class="theme-toggle" id="theme-toggle" aria-label="Đổi giao diện sáng/tối">◐</button>`;
}

export function renderInlineCta(post) {
  const href = post.ctaLink || "/catalog";
  const label = post.ctaLabel || "Xem catalog FAO";
  return `<aside class="inline-cta" aria-label="Đặt thuê máy">
    <div class="inline-cta-text">
      <h3>Sẵn sàng thuê máy?</h3>
      <p>Lịch trống realtime — Phú Nhuận &amp; Q9 Thủ Đức. Đặt online giảm 20% T2–T6.</p>
    </div>
    <a class="btn-cta" href="${escapeHtml(href)}">${escapeHtml(label)} →</a>
  </aside>`;
}

export function renderRelatedCards(posts, getPath, getImage, formatDate) {
  if (!posts.length) return "";
  const cards = posts
    .map(
      (p) => `<a class="related-card" href="${getPath(p)}/">
      <img src="${escapeHtml(getImage(p))}" alt="" loading="lazy" decoding="async" width="400" height="250" />
      <div class="related-card-body">
        ${renderCategoryPill(p.category)}
        <h3>${escapeHtml(p.title)}</h3>
        <span>${formatDate(p.date)} · ${p.readMinutes} phút</span>
      </div>
    </a>`
    )
    .join("");
  return `<section class="related-section" aria-label="Bài liên quan">
    <h2 style="font-size:1.125rem;font-weight:800;margin-bottom:var(--space-4);color:var(--blog-ink)">Bài liên quan</h2>
    <div class="related-grid">${cards}</div>
  </section>`;
}

export function renderArticleNav(prev, next, getPath) {
  if (!prev && !next) return "";
  const prevHtml = prev
    ? `<a href="${getPath(prev)}/"><div class="label">← Bài trước</div><div class="title">${escapeHtml(prev.title)}</div></a>`
    : "<span></span>";
  const nextHtml = next
    ? `<a class="next" href="${getPath(next)}/"><div class="label">Bài tiếp →</div><div class="title">${escapeHtml(next.title)}</div></a>`
    : "";
  return `<nav class="article-nav" aria-label="Điều hướng bài viết">${prevHtml}${nextHtml}</nav>`;
}

function buildTocLinkItems(headings) {
  let sectionIdx = 0;
  return headings.map((h) => {
    const text = typeof h === "string" ? h : h.text;
    if (h?.type === "external" || (h?.href && h?.type !== "h2")) {
      return { href: h.href, text, external: true, sectionIdx: null };
    }
    sectionIdx += 1;
    return { href: `#section-${sectionIdx}`, text, external: false, sectionIdx };
  });
}

export function renderTocRail(headings) {
  if (headings.length < 2) return "";
  const links = buildTocLinkItems(headings)
    .map((item) =>
      item.external
        ? `<a href="${escapeHtml(item.href)}" class="toc-external">${escapeHtml(item.text)}</a>`
        : `<a href="${escapeHtml(item.href)}" data-toc-link="${item.sectionIdx}">${escapeHtml(item.text)}</a>`
    )
    .join("");
  return `<aside class="blog-toc-rail" aria-label="Mục lục">
    <nav><h2>Mục lục</h2>${links}</nav>
  </aside>`;
}

export function renderTocMobile(headings) {
  if (headings.length < 2) return { fab: "", sheet: "" };
  const links = buildTocLinkItems(headings)
    .map((item) =>
      item.external
        ? `<a href="${escapeHtml(item.href)}" data-toc-close="1" class="toc-external">${escapeHtml(item.text)}</a>`
        : `<a href="${escapeHtml(item.href)}" data-toc-close="1">${escapeHtml(item.text)}</a>`
    )
    .join("");
  return {
    fab: `<button type="button" class="toc-mobile-fab" id="toc-fab" aria-label="Mục lục">☰</button>`,
    sheet: `<div class="toc-sheet" id="toc-sheet" aria-hidden="true">
      <div class="toc-sheet-backdrop" data-toc-close="1"></div>
      <div class="toc-sheet-panel" role="dialog" aria-label="Mục lục bài viết">
        <h2>Mục lục</h2>${links}
      </div>
    </div>`,
  };
}

export function renderBlogIndexScripts(validTags) {
  return `<script>
(function(){
  var validTags=${JSON.stringify(validTags)};
  var chips=document.querySelectorAll(".filter-chip");
  var cards=document.querySelectorAll(".post-card[data-category]");
  var searchInput=document.getElementById("blog-search");
  var emptyEl=document.getElementById("blog-empty");
  var params=new URLSearchParams(location.search);
  var activeCat=params.get("tag")||"all";
  if(validTags.indexOf(activeCat)<0) activeCat="all";
  var searchQ="";

  function applyFilters(){
    var q=searchQ.trim().toLowerCase();
    var visible=0;
    chips.forEach(function(c){c.classList.toggle("active",c.dataset.filter===activeCat);});
    cards.forEach(function(card){
      var catOk=activeCat==="all"||card.dataset.category===activeCat;
      var text=(card.dataset.search||"").toLowerCase();
      var searchOk=!q||text.indexOf(q)>=0;
      var show=catOk&&searchOk;
      card.classList.toggle("is-hidden",!show);
      if(show) visible++;
    });
    if(emptyEl) emptyEl.hidden=visible>0;
  }

  chips.forEach(function(chip){
    chip.addEventListener("click",function(){
      activeCat=chip.dataset.filter;
      applyFilters();
      if(activeCat==="all") history.replaceState(null,"","/blog/");
      else history.replaceState(null,"","/blog/?tag="+encodeURIComponent(activeCat));
    });
  });

  if(searchInput){
    searchInput.addEventListener("input",function(){
      searchQ=searchInput.value;
      applyFilters();
    });
  }

  var themeBtn=document.getElementById("theme-toggle");
  if(themeBtn){
    var saved=localStorage.getItem("fao_blog_theme");
    if(saved==="dark") document.documentElement.setAttribute("data-theme","dark");
    themeBtn.addEventListener("click",function(){
      var dark=document.documentElement.getAttribute("data-theme")==="dark";
      if(dark){document.documentElement.removeAttribute("data-theme");localStorage.setItem("fao_blog_theme","light");}
      else{document.documentElement.setAttribute("data-theme","dark");localStorage.setItem("fao_blog_theme","dark");}
    });
  }

  applyFilters();
})();
</script>`;
}

export function renderBlogArticleScripts() {
  return `<script>
(function(){
  var bar=document.getElementById("reading-progress");
  var article=document.querySelector(".blog-prose-body");
  function onScroll(){
    if(!bar||!article) return;
    var rect=article.getBoundingClientRect();
    var total=article.offsetHeight-window.innerHeight;
    var scrolled=Math.min(Math.max(-rect.top,0),total);
    var pct=total>0?(scrolled/total)*100:0;
    bar.style.width=pct+"%";
    bar.setAttribute("aria-valuenow",Math.round(pct));
  }
  window.addEventListener("scroll",onScroll,{passive:true});
  onScroll();

  var tocLinks=document.querySelectorAll("[data-toc-link]");
  var headings=document.querySelectorAll(".blog-prose-body h2[id]");
  if(tocLinks.length&&headings.length){
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          var id=e.target.id.replace("section-","");
          tocLinks.forEach(function(a){a.classList.toggle("is-active",a.dataset.tocLink===id);});
        }
      });
    },{rootMargin:"-20% 0px -60% 0px"});
    headings.forEach(function(h){obs.observe(h);});
  }

  var fab=document.getElementById("toc-fab");
  var sheet=document.getElementById("toc-sheet");
  if(fab&&sheet){
    fab.addEventListener("click",function(){sheet.classList.add("is-open");sheet.setAttribute("aria-hidden","false");});
    sheet.querySelectorAll("[data-toc-close]").forEach(function(el){
      el.addEventListener("click",function(){sheet.classList.remove("is-open");sheet.setAttribute("aria-hidden","true");});
    });
  }

  document.querySelectorAll('a[href^="#section-"]').forEach(function(a){
    a.addEventListener("click",function(){
      if(sheet){sheet.classList.remove("is-open");sheet.setAttribute("aria-hidden","true");}
    });
  });

  var themeBtn=document.getElementById("theme-toggle");
  if(themeBtn){
    if(localStorage.getItem("fao_blog_theme")==="dark") document.documentElement.setAttribute("data-theme","dark");
    themeBtn.addEventListener("click",function(){
      var dark=document.documentElement.getAttribute("data-theme")==="dark";
      if(dark){document.documentElement.removeAttribute("data-theme");localStorage.setItem("fao_blog_theme","light");}
      else{document.documentElement.setAttribute("data-theme","dark");localStorage.setItem("fao_blog_theme","dark");}
    });
  }
})();
</script>`;
}
