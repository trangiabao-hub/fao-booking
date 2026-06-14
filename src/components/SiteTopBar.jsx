import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { SITE_NAV, GUIDE_LINKS } from "../config/siteNav";

/**
 * Thanh điều hướng — đồng bộ với header trang blog/SEO tĩnh.
 */
export default function SiteTopBar({ ctaTo = "/catalog", ctaLabel = "Đặt máy" }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href, spa) => {
    if (!spa) return false;
    if (href === "/") return location.pathname === "/";
    return location.pathname.startsWith(href);
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const navLinks = SITE_NAV.filter((item) => item.href !== "/catalog");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-pink-100 bg-white/90 backdrop-blur-lg">
      <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-400 to-pink-600 text-xs font-black text-white">
            FAO
          </span>
          <span className="hidden text-sm font-bold text-pink-800 sm:inline">
            FAO Booking
          </span>
        </Link>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to={ctaTo}
            className="rounded-full bg-pink-500 px-3 py-1.5 text-xs font-bold text-white"
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <XMarkIcon className="h-5 w-5" />
            ) : (
              <Bars3Icon className="h-5 w-5" />
            )}
          </button>
        </div>

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
        </nav>

        {menuOpen ? (
          <nav
            className="fixed inset-x-0 top-14 z-40 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-4 shadow-lg sm:top-16 lg:hidden"
            aria-label="Menu di động"
          >
            <div className="mb-3 flex flex-wrap gap-2 border-b border-slate-100 pb-3">
              {GUIDE_LINKS.map((g) => (
                <a
                  key={g.href}
                  href={g.href}
                  className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                >
                  {g.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {navLinks.map((item) =>
                item.spa ? (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`rounded-xl px-3 py-3 text-sm font-semibold ${
                      isActive(item.href, true)
                        ? "bg-pink-50 text-pink-600"
                        : "text-slate-700"
                    }`}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-700"
                  >
                    {item.label}
                  </a>
                )
              )}
              <Link
                to={ctaTo}
                className="mt-2 rounded-full bg-pink-500 px-4 py-3 text-center text-sm font-bold text-white"
              >
                {ctaLabel}
              </Link>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
