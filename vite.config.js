import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { existsSync } from "fs";

const DEFAULT_API_URL = "https://api.faodigital.vn/api/";

function resolveApiOrigin(apiUrl) {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return new URL(DEFAULT_API_URL).origin;
  }
}

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
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiOrigin = resolveApiOrigin(env.VITE_API_URL || DEFAULT_API_URL);

  return {
    plugins: [staticSlugHtml(), react(), tailwindcss()],
    define: {
      global: "globalThis",
    },
    server: {
      fs: {
        allow: [path.resolve(__dirname), path.resolve(__dirname, "../fao")],
      },
      proxy: {
        "/api": {
          target: apiOrigin,
          changeOrigin: true,
          secure: true,
        },
        "/ws": {
          target: apiOrigin,
          changeOrigin: true,
          ws: true,
          secure: true,
        },
      },
    },
  };
});
