import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Starts downloading the landing page's code at the same time as the main bundle, instead of only
// after the main bundle has run, on visits that will show the landing page. The page check below
// copies the rules in src/rootRoute.ts. If the two ever drift apart, a visit only downloads the
// landing page code when it doesn't need it, or a little later than it could; nothing breaks.
function preloadLandingPage(): Plugin {
  let base = "/";
  return {
    name: "iitransit:preload-landing-page",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const chunks = Object.values(ctx.bundle ?? {});
        const entry = chunks.find((c) => c.type === "chunk" && c.isEntry);
        const landing = chunks.find((c) => c.type === "chunk" && c.isDynamicEntry && c.name === "LandingPage");
        if (!entry || !landing || landing.type !== "chunk") {
          throw new Error("preloadLandingPage: the LandingPage chunk was not found in the build");
        }
        const files = {
          js: [landing.fileName, ...landing.imports.filter((f) => f !== entry.fileName)].map((f) => base + f),
          css: [...(landing.viteMetadata?.importedCss ?? [])].map((f) => base + f),
        };
        const script = `(function () {
  try {
    var path = location.pathname.replace(/\\/+$/, "") || "/";
    if (path !== "/" && path !== "/about" && path !== "/intro-preview") return;
    if (path === "/" && !location.hash) {
      var installed = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
      if (installed || localStorage.getItem("iitransit:returning") === "1") return;
    }
    var files = ${JSON.stringify(files)};
    var add = function (rel, href, as) {
      var link = document.createElement("link");
      link.rel = rel;
      link.href = href;
      if (as) link.as = as;
      link.crossOrigin = "";
      document.head.appendChild(link);
    };
    files.js.forEach(function (href) { add("modulepreload", href); });
    files.css.forEach(function (href) { add("preload", href, "style"); });
  } catch (e) {}
})();`;
        return [{ tag: "script", children: script, injectTo: "head" }];
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    preloadLandingPage(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
      manifest: {
        id: "/",
        name: "IITransit",
        short_name: "IITransit",
        description: "Ride sharing for IIT Bhubaneswar students",
        theme_color: "#0B1020",
        background_color: "#0B1020",
        display: "standalone",
        start_url: "/app",
        scope: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});

