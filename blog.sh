#!/usr/bin/env bash
# Sinh HTML tĩnh cho blog + trang SEO từ src/data/*.js
# Usage:
#   ./blog.sh          # tất cả (mặc định)
#   ./blog.sh all
#   ./blog.sh seo
#   ./blog.sh blog
#   ./blog.sh sitemap
#   ./blog.sh help

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Cần cài Node.js để chạy script generate." >&2
  exit 1
fi

run_seo() {
  echo ""
  echo "▶ SEO landing (src/data/seoPages.js → public/<slug>/index.html)"
  node scripts/generate-seo-html.mjs
}

run_blog() {
  echo ""
  echo "▶ Blog (src/data/blogPosts.js → public/<slug>/ + public/blog/index.html)"
  echo "  (auto cleanup bài đã xóa khỏi blogPosts.js)"
  node scripts/generate-blog-html.mjs
}

run_sitemap() {
  echo ""
  echo "▶ Sitemap (seoPages + blogPosts → public/sitemap.xml)"
  node scripts/generate-sitemap.mjs
}

run_all() {
  echo "═══ Generate static HTML ═══"
  run_seo
  run_blog
  run_sitemap
  echo ""
  echo "✓ Xong. Output: public/"
}

show_help() {
  cat <<'EOF'
blog.sh — Generate HTML tĩnh cho FAO Booking

Lệnh:
  ./blog.sh              Sinh SEO + blog + sitemap (giống npm run generate-static)
  ./blog.sh all          Như trên
  ./blog.sh seo          Chỉ trang SEO (8 landing)
  ./blog.sh blog         Chỉ blog (index + bài viết, có cleanup)
  ./blog.sh sitemap      Chỉ cập nhật sitemap.xml
  ./blog.sh help         Hiện trợ giúp

Nguồn dữ liệu:
  src/data/seoPages.js   → public/thue-may-anh-*/index.html
  src/data/blogPosts.js  → public/<slug>/index.html, public/blog/index.html

npm tương đương:
  npm run generate-static
  npm run generate-seo | generate-blog | generate-sitemap
EOF
}

main() {
  case "${1:-all}" in
    all | static) run_all ;;
    seo) run_seo ;;
    blog) run_blog ;;
    sitemap) run_sitemap ;;
    help | -h | --help) show_help ;;
    *)
      echo "❌ Lệnh không hợp lệ: $1" >&2
      echo "   Chạy: ./blog.sh help" >&2
      exit 1
      ;;
  esac
}

main "$@"
