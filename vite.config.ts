import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { VitePWA } from "vite-plugin-pwa";
import { apiDevServer } from "./apiDevServer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    apiDevServer(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "prompt", // nunca ativa sozinho no meio do uso — precisa confirmar pelo toast de atualizacao
      manifest: false, // public/manifest.json ja existe, e mantido a mao e ja esta linkado corretamente em index.html — nao deixa o plugin gerar um segundo
      injectManifest: { globPatterns: ["**/*.{js,css,html,png,svg,ico,json}"] },
      devOptions: { enabled: true, type: "module" },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
