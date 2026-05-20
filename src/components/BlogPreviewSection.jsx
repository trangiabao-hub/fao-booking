import { BLOG_PREVIEW } from "../config/siteNav";

/** Khối giới thiệu blog trên trang chủ — nối SPA với nội dung tĩnh */
export default function BlogPreviewSection() {
  return (
    <section className="border-t border-pink-100 bg-slate-50 px-4 py-10 sm:px-6">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-pink-500">
              Blog &amp; hướng dẫn
            </p>
            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              Mẹo thuê máy từ FAO
            </h2>
            <p className="mt-1 max-w-lg text-sm text-slate-600">
              Kinh nghiệm thực tế, review thiết bị và checklist trước khi nhận máy.
            </p>
          </div>
          <a
            href="/blog/"
            className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-white px-4 py-2 text-sm font-bold text-pink-600 shadow-sm transition hover:border-pink-300"
          >
            Xem tất cả bài viết
            <span aria-hidden>→</span>
          </a>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {BLOG_PREVIEW.map((post) => (
            <a
              key={post.href}
              href={post.href}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md"
            >
              <span className="mb-2 w-fit rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-bold text-pink-600">
                {post.tag}
              </span>
              <h3 className="mb-2 text-base font-bold leading-snug text-slate-900 group-hover:text-pink-700">
                {post.title}
              </h3>
              <p className="flex-1 text-sm leading-relaxed text-slate-600">
                {post.excerpt}
              </p>
              <span className="mt-4 text-xs font-bold text-pink-500">
                Đọc tiếp →
              </span>
            </a>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs">
          <span className="font-semibold text-slate-500">Dịch vụ:</span>
          <a href="/thue-may-anh-tphcm/" className="font-medium text-pink-600 hover:underline">
            Thuê TP.HCM
          </a>
          <span className="text-slate-300">·</span>
          <a href="/thue-may-anh-quay-vlog/" className="font-medium text-pink-600 hover:underline">
            Vlog
          </a>
          <span className="text-slate-300">·</span>
          <a href="/thue-may-anh-fujifilm/" className="font-medium text-pink-600 hover:underline">
            Fujifilm
          </a>
        </div>
      </div>
    </section>
  );
}
