import { defineConfig, devices } from '@playwright/test';

/**
 * CAR-M Virtual Cell Simulator — Playwright E2E 测试配置
 * 
 * 测试范围：
 * - 前端核心用户路径（仿真引擎、UI 仪表板、3D 可视化）
 * - 静态资源加载（3D 模型、TCGA 数据）
 * - 构建产物完整性验证
 * 
 * 运行方式：
 *   npm run test:e2e          # 本地运行（自动启动 dev server）
 *   npm run test:e2e:ci       # CI 环境运行（使用 preview server）
 *   npm run test:e2e:report   # 查看 HTML 报告
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  /* 串行运行测试（避免端口冲突） */
  fullyParallel: false,
  
  /* CI 环境失败时重试 */
  retries: process.env.CI ? 2 : 0,
  
  /* 限制并行数为 1（避免 dev server 端口冲突） */
  workers: 1,
  
  /* 测试报告 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],
  
  /* 全局超时设置 */
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  
  /* 输出目录 */
  outputDir: 'test-results/',
  
  use: {
    /* 基础 URL — 本地 dev server 或 CI preview */
    baseURL: process.env.CI ? 'http://localhost:4173' : 'http://localhost:3000',
    
    /* 收集失败时的 trace */
    trace: 'on-first-retry',
    
    /* 截图 */
    screenshot: 'only-on-failure',
    
    /* 视频 */
    video: 'on-first-retry',
    
    /* 浏览器上下文 */
    viewport: { width: 1280, height: 800 },
    
    /* 忽略 HTTPS 错误 */
    ignoreHTTPSErrors: true,
    
    /* 权限 */
    permissions: ['clipboard-read', 'clipboard-write'],
  },

  /* 配置测试项目 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    /* 移动端测试（可选） */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  /* 本地开发服务器配置 */
  webServer: process.env.CI
    ? {
        /* CI 环境：使用 preview server（需要先构建） */
        command: 'npm run preview',
        url: 'http://localhost:4173',
        reuseExistingServer: false,
        timeout: 120000,
      }
    : {
        /* 本地环境：使用 dev server */
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120000,
      },
});
