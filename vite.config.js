import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { existsSync } from "fs";

/** Dev: phục vụ public/<slug>/index.html tại /<slug>/ (giống Vercel/production) */
function staticSlugHtml() {
  return {
    name: "static-slug-html",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url?.split("?")[0] ?? "";
        if (req.method !== "GET" || raw.includes(".")) return next();
        const slug = raw.replace(/^\/|\/$/g, "");
        if (!slug) return next();
        const file = path.join(__dirname, "public", slug, "index.html");
        if (existsSync(file)) req.url = `/${slug}/index.html`;
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [staticSlugHtml(), react(), tailwindcss()],
  define: {
    global: "globalThis",
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname), path.resolve(__dirname, "../fao")],
    },
  },
});
