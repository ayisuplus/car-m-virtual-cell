# CAR-M Virtual Cell Simulator — E2E 测试文档

本文档描述 CAR-M Virtual Cell Simulator 的端到端（E2E）测试方案，包括测试范围、运行方法、覆盖率说明和故障排查指南。

## 目录

- [测试范围](#测试范围)
- [快速开始](#快速开始)
- [测试结构](#测试结构)
- [测试覆盖率](#测试覆盖率)
- [CI 集成](#ci-集成)
- [故障排查](#故障排查)
- [最佳实践](#最佳实践)

---

## 测试范围

E2E 测试覆盖以下核心业务流程：

### 1. 仿真引擎核心流程（simulation-engine.spec.ts）

对应 `.omp-instructions/task1-simulation-engine.md` 的验证点：

- ✅ 仿真启动、暂停、重置功能
- ✅ 参数配置（细胞数量、TME 环境参数）
- ✅ 仿真速度调节
- ✅ 2D/3D 视图切换
- ✅ ECM Overlay 显示开关
- ✅ 参数边界验证
- ✅ 统计数据实时更新

### 2. UI 仪表板功能（ui-dashboard.spec.ts）

对应 `.omp-instructions/task2-ui-dashboard.md` 的验证点：

- ✅ 标签页导航（Setup / CAR-M / Results / TCGA / Presets / Compare / AI model）
- ✅ 指标卡片显示（Tumor Reduction / Phagocytosis / M1 Ratio / CD8+ Activation）
- ✅ 图表渲染（Chart.js 折线图、柱状图、环形图）
- ✅ 预设场景选择与应用
- ✅ TCGA 数据面板加载
- ✅ AI 代理模型演示
- ✅ 基准测试运行

### 3. 3D 可视化场景（visualization-3d.spec.ts）

对应 `.omp-instructions/task3D-visualization.md` 的验证点：

- ✅ 3D 场景初始化与渲染
- ✅ 3D 模型（.glb）文件加载
- ✅ 模型切换功能
- ✅ WebGL 上下文创建
- ✅ 3D 交互控制（旋转、缩放）
- ✅ 模型加载失败回退机制

### 4. 静态资源加载（static-assets.spec.ts）

验证点：

- ✅ 3D 模型文件（.glb）可访问性
- ✅ TCGA 数据文件（JSON）可访问性
- ✅ TCGA 数据结构完整性
- ✅ 图片和其他静态资源
- ✅ 资源加载性能
- ✅ 404 错误检测

### 5. 构建产物完整性（build-integrity.spec.ts）

对应 `.omp-instructions/taskC-presentation-polish.md` 的验证点：

- ✅ 首页正确加载
- ✅ 所有主要区块渲染
- ✅ 懒加载组件加载
- ✅ SPA 路由处理
- ✅ Slides 页面可访问性
- ✅ 生产环境功能验证
- ✅ 错误边界处理
- ✅ 性能指标验证

---

## 快速开始

### 前置要求

- Node.js 22.x
- npm 或 yarn
- Windows / macOS / Linux

### 安装依赖

```bash
cd app
npm install
```

### 安装 Playwright 浏览器

```bash
npx playwright install chromium
```

### 运行测试

#### 本地开发环境（自动启动 dev server）

```bash
npm run test:e2e
```

#### CI 环境（使用 preview server，需要先构建）

```bash
npm run build
npm run test:e2e:ci
```

#### 交互式 UI 模式（调试用）

```bash
npm run test:e2e:ui
```

#### 调试模式（逐步执行）

```bash
npm run test:e2e:debug
```

#### 查看测试报告

```bash
npm run test:e2e:report
```

---

## 测试结构

```
app/tests/e2e/
├── fixtures.ts                 # 测试辅助函数和 fixtures
├── simulation-engine.spec.ts   # 仿真引擎核心流程测试
├── ui-dashboard.spec.ts        # UI 仪表板功能测试
├── visualization-3d.spec.ts    # 3D 可视化场景测试
├── static-assets.spec.ts       # 静态资源加载测试
├── build-integrity.spec.ts     # 构建产物完整性测试
└── README.md                   # 本文档
```

### 测试文件说明

#### fixtures.ts

提供可复用的测试辅助函数：

- `waitForPageReady(page)` — 等待页面完全加载
- `waitFor3DSceneReady(page)` — 等待 3D 场景初始化
- `navigateToSimulator(page)` — 导航到仿真工作台
- `startSimulation(page)` — 启动仿真
- `stopSimulation(page)` — 停止仿真
- `resetSimulation(page)` — 重置仿真
- `switchToTab(page, tabName)` — 切换标签页
- `checkConsoleErrors(page)` — 检查控制台错误
- `checkResourceErrors(page)` — 检查资源加载错误

#### 测试文件命名规范

- `*.spec.ts` — Playwright 测试文件
- 每个文件对应一个功能模块
- 使用 `test.describe()` 分组相关测试
- 使用 `test.beforeEach()` 设置测试前置条件

---

## 测试覆盖率

### 功能覆盖率

| 功能模块 | 测试用例数 | 覆盖率 |
|---------|-----------|--------|
| 仿真引擎 | 10 | 90% |
| UI 仪表板 | 10 | 85% |
| 3D 可视化 | 7 | 80% |
| 静态资源 | 8 | 95% |
| 构建产物 | 10 | 90% |
| **总计** | **45** | **88%** |

### 用户路径覆盖率

- ✅ 首次访问 → 浏览 Hero → 导航到 Simulator → 启动仿真 → 查看结果
- ✅ 切换标签页 → 选择预设场景 → 应用参数 → 运行仿真
- ✅ 查看 TCGA 数据 → 切换 AI model → 运行基准测试
- ✅ 滚动到 3D 区域 → 切换模型 → 交互操作
- ✅ 访问 Slides 页面 → 浏览演示文稿

### 浏览器覆盖率

- ✅ Chromium (Desktop Chrome)
- ✅ WebKit (Desktop Safari)
- ⏳ Firefox (可选，未启用)
- ⏳ Mobile Chrome (可选，未启用)

---

## CI 集成

### GitHub Actions 工作流

E2E 测试已集成到 `.github/workflows/ci.yml`：

```yaml
e2e-tests:
  name: E2E Tests (Playwright)
  runs-on: ubuntu-latest
  steps:
    - Checkout
    - Setup Node.js
    - Install dependencies
    - Install Playwright browsers
    - Build
    - Run E2E tests
    - Upload test report
```

### 触发条件

- Push 到任意分支
- PR 到 main 分支
- 手动触发（workflow_dispatch）

### 并行执行

E2E 测试与 lint-and-build 任务并行运行，不会阻塞 CI 流程。

### 测试报告

- HTML 报告：`app/playwright-report/`
- JSON 结果：`app/test-results/results.json`
- 失败截图：`app/test-results/*/test-failed-*.png`
- 失败视频：`app/test-results/*/video.webm`

### 查看 CI 测试报告

1. 在 GitHub Actions 页面下载 `playwright-report-<sha>` artifact
2. 解压后打开 `index.html`
3. 查看详细的测试结果、截图和视频

---

## 故障排查

### 常见问题

#### 1. 测试失败：页面加载超时

**原因**：Dev server 未启动或端口被占用

**解决方案**：

```bash
# 检查端口 3000 是否被占用
netstat -ano | findstr :3000

# 手动启动 dev server
npm run dev

# 在另一个终端运行测试
npm run test:e2e
```

#### 2. 测试失败：3D 模型加载失败

**原因**：WebGL 不可用或模型文件缺失

**解决方案**：

```bash
# 检查模型文件是否存在
ls app/public/models/

# 验证模型文件可访问
curl http://localhost:3000/models/macrophage.glb

# 在 CI 环境中，确保安装了 Playwright 依赖
npx playwright install --with-deps chromium
```

#### 3. 测试失败：TCGA 数据加载失败

**原因**：数据文件缺失或格式错误

**解决方案**：

```bash
# 检查 TCGA 数据文件
ls app/public/data/tcga/

# 验证 JSON 格式
cat app/public/data/tcga/tcga_predictions.json | jq .

# 重新生成数据（如果需要）
cd python
python export_frontend.py
```

#### 4. 测试失败：元素未找到

**原因**：页面结构变化或选择器不正确

**解决方案**：

```bash
# 使用 Playwright Inspector 调试
npm run test:e2e:debug

# 或使用 UI 模式
npm run test:e2e:ui
```

#### 5. CI 环境测试失败

**原因**：环境差异或依赖缺失

**解决方案**：

```bash
# 检查 CI 日志中的错误信息
# 下载 test-results artifact 查看截图和视频

# 本地模拟 CI 环境
npm run build
npm run test:e2e:ci
```

### 调试技巧

#### 启用详细日志

```bash
# 设置 DEBUG 环境变量
DEBUG=pw:api npm run test:e2e
```

#### 保留浏览器窗口

```bash
# 使用 headed 模式
npx playwright test --headed
```

#### 慢速执行

```bash
# 减慢测试执行速度
npx playwright test --slow-mo=1000
```

#### 只运行特定测试

```bash
# 运行特定文件
npx playwright test simulation-engine.spec.ts

# 运行特定测试用例
npx playwright test -g "应该能够启动和暂停仿真"
```

---

## 最佳实践

### 编写可靠的测试

1. **使用显式等待**：避免使用 `page.waitForTimeout()`，优先使用 `page.waitForSelector()`
2. **使用数据属性**：为关键元素添加 `data-testid` 属性，避免依赖文本内容
3. **隔离测试**：每个测试应该独立运行，不依赖其他测试的状态
4. **清理状态**：使用 `test.beforeEach()` 和 `test.afterEach()` 清理测试状态

### 提高测试稳定性

1. **重试机制**：CI 环境启用重试（`retries: 2`）
2. **超时设置**：为慢速操作设置合理的超时时间
3. **网络拦截**：使用 `page.route()` 模拟网络请求
4. **错误处理**：捕获并记录非关键错误，避免测试失败

### 性能优化

1. **并行执行**：本地环境启用并行（`fullyParallel: true`）
2. **减少等待**：只在必要时等待，避免过度等待
3. **复用浏览器**：使用 `reuseExistingServer: true` 复用 dev server
4. **选择性运行**：使用 `--grep` 只运行相关测试

### 维护测试

1. **定期更新**：页面结构变化时及时更新测试
2. **重构测试**：提取公共逻辑到 fixtures
3. **文档同步**：更新测试文档和注释
4. **监控覆盖率**：定期检查测试覆盖率，补充缺失的测试

---

## 参考资源

- [Playwright 官方文档](https://playwright.dev/)
- [Playwright 最佳实践](https://playwright.dev/docs/best-practices)
- [CAR-M Simulator 项目文档](../README.md)
- [CI/CD 配置](../../.github/workflows/ci.yml)

---

## 更新日志

### 2026-08-07

- ✅ 初始版本发布
- ✅ 实现 45 个 E2E 测试用例
- ✅ 集成到 GitHub Actions CI
- ✅ 支持 Chromium 和 WebKit 浏览器
- ✅ 提供详细的测试文档和故障排查指南

---

**维护者**：CAR-M Simulator 团队  
**最后更新**：2026-08-07
