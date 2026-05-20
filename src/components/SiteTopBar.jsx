import { Link, useLocation } from "react-router-dom";
import { CameraIcon } from "@heroicons/react/24/solid";
import { SITE_NAV, GUIDE_LINKS } from "../config/siteNav";

/**
 * Thanh điều hướng desktop — đồng bộ với header trang blog/SEO tĩnh.
 */
export default function SiteTopBar({ ctaTo = "/catalog", ctaLabel = "Đặt máy" }) {
  const location = useLocation();

  const isActive = (href, spa) => {
    if (!spa) return false;
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-pink-100 bg-white/90 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 text-xs font-black text-white">
            FAO
          </span>
          <span className="hidden text-sm font-bold text-pink-800 sm:inline">
            FAO Booking
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Điều hướng chính"
        >
          <div className="mr-2 flex items-center gap-0.5 border-r border-slate-200 pr-3">
            {GUIDE_LINKS.map((g) => (
              <a
                key={g.href}
                href={g.href}
                className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-pink-50 hover:text-pink-600"
              >
                {g.label}
              </a>
            ))}
          </div>
          {SITE_NAV.map((item) =>
            item.spa ? (
              <Link
                key={item.href}
                to={item.href}
                className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                  isActive(item.href, true)
                    ? "bg-pink-50 text-pink-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-pink-600"
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-pink-50 hover:text-pink-600"
              >
                {item.label}
              </a>
            )
          )}
          <Link
            to={ctaTo}
            className="ml-1 rounded-full bg-pink-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-pink-500/25 transition hover:bg-pink-600"
          >
            {ctaLabel}
          </Link>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <a
            href="/blog/"
            className="rounded-full px-3 py-1.5 text-xs font-bold text-pink-600 ring-1 ring-pink-200"
          >
            Blog
          </a>
          <Link
            to={ctaTo}
            className="rounded-full bg-pink-500 px-3 py-1.5 text-xs font-bold text-white"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteLogoCompact() {
  return (
    <Link to="/" className="inline-flex items-center gap-2">
      <CameraIcon className="h-7 w-7 text-pink-500" />
      <span className="font-bold text-pink-800">Fao Sài Gòn</span>
    </Link>
  );
}
