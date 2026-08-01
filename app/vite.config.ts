import path from "path"
import { cpSync, existsSync, mkdirSync } from "node:fs"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

/**
 * 构建后自动把 slides/（网页版演示 deck）同步到 dist/slides/。
 * 原因：vite build 的 emptyOutDir 会清空 dist，而 slides/ 不在 public/ 下，
 * 若不同步，preview 时 /slides/index.html 会被 SPA fallback 成主站首页（展示翻车）。
 */
function copySlidesPlugin(): Plugin {
  return {
    name: "copy-slides-to-dist",
    closeBundle() {
      const src = path.resolve(__dirname, "slides")
      const dest = path.resolve(__dirname, "dist/slides")
      if (!existsSync(src)) {
        console.warn("[copy-slides] slides/ 目录不存在，跳过同步")
        return
      }
      mkdirSync(dest, { recursive: true })
      cpSync(src, dest, { recursive: true })
      console.log("[copy-slides] ✅ slides/ 已同步到 dist/slides/")
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), copySlidesPlugin()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
