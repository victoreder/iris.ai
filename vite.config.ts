import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function injectGoBackendMeta() {
  return {
    name: "inject-go-backend",
    transformIndexHtml(html: string) {
      const backend = (process.env.VITE_BACKEND_URL ?? "").trim().replace(/\/+$/, "");
      return html.replace(
        '<meta name="go-backend" content="" />',
        `<meta name="go-backend" content="${backend}" />`
      );
    },
  };
}

export default defineConfig({
  base: "/",
  build: { outDir: "dist", emptyOutDir: true },
  plugins: [react(), injectGoBackendMeta()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: { port: 5175 },
});
