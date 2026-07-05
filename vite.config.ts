import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  build: {
    rollupOptions: {
      input: {
        index:   path.resolve(__dirname, "index.html"),
        auth:    path.resolve(__dirname, "auth.html"),
        post:    path.resolve(__dirname, "post.html"),
        search:  path.resolve(__dirname, "search.html"),
        myRides: path.resolve(__dirname, "my-rides.html"),
      },
    },
  },
});
