import path from "path"
import { existsSync, mkdirSync } from "node:fs"
import { cp } from "node:fs/promises"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vitest/config"

/**
 * 构建后自动把 slides/（网页版演示 deck）同步到 dist/slides/。
 * 原因：vite build 的 emptyOutDir 会清空 dist，而 slides/ 不在 public/ 下，
 * 若不同步，preview 时 /slides/index.html 会被 SPA fallback 成主站首页（展示翻车）。
 *
 * 注意：这里用异步 fs/promises.cp 而非同步 cpSync ——
 * 在部分 Windows 环境下同步 cpSync 递归复制会导致进程异常退出（exit 127），
 * 异步版本稳定可靠（本地与 CI 均验证通过）。
 */
function copySlidesPlugin(): Plugin {
  return {
    name: "copy-slides-to-dist",
    apply: "build",
    async closeBundle() {
      // 使用 process.cwd() 而非 __dirname：ESM 配置中 __dirname 可能未定义
      const root = process.cwd()
      const src = path.resolve(root, "slides")
      const dest = path.resolve(root, "dist/slides")
      if (!existsSync(src)) {
        console.warn("[copy-slides] ⚠️ slides/ 目录不存在，跳过同步")
        return
      }
      mkdirSync(dest, { recursive: true })
      await cp(src, dest, { recursive: true })
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
  // Vitest 只跑 src/ 下的单元测试；tests/e2e/ 是 Playwright E2E 套件，
  // 由 `npm run test:e2e` 运行，不能被 vitest 误抓（否则 test.describe 报错）
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**', 'dist/**'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
