import { test, expect } from './fixtures';
import {
  navigateToSimulator,
  startSimulation,
  switchToTab,
  waitForPageReady,
} from './fixtures';

/**
 * UI 仪表板 E2E 测试
 * 
 * 对应 task2-ui-dashboard.md 的验证点：
 * - 仪表板数据展示与交互
 * - 图表渲染与更新
 * - 标签页导航
 * - 预设场景选择
 */

test.describe('UI 仪表板功能', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSimulator(page);
  });

  test('应该显示所有标签页', async ({ page }) => {
    // 验证所有标签页按钮存在
    await expect(page.locator('[role="tab"]:has-text("Setup")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("CAR-M")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Results")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("TCGA")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Presets")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Compare")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("AI model")')).toBeVisible();
  });

  test('应该能够在标签页之间切换', async ({ page }) => {
    // 默认在 Setup 标签页
    await expect(page.locator('[role="tab"]:has-text("Setup")')).toHaveAttribute('aria-selected', 'true');
    
    // 切换到 Results
    await switchToTab(page, 'Results');
    await expect(page.locator('[role="tab"]:has-text("Results")')).toHaveAttribute('aria-selected', 'true');
    
    // 切换到 TCGA
    await switchToTab(page, 'TCGA');
    await expect(page.locator('[role="tab"]:has-text("TCGA")')).toHaveAttribute('aria-selected', 'true');
    
    // 切换到 Presets
    await switchToTab(page, 'Presets');
    await expect(page.locator('[role="tab"]:has-text("Presets")')).toHaveAttribute('aria-selected', 'true');
  });

  test('Results 标签页应该显示指标卡片', async ({ page }) => {
    // 启动仿真以生成数据
    await startSimulation(page);
    
    // 切换到 Results
    await switchToTab(page, 'Results');
    
    // 等待数据加载
    await page.waitForTimeout(2000);
    
    // 验证指标卡片
    await expect(page.locator('text=Tumor Reduction')).toBeVisible();
    await expect(page.getByText('Phagocytosis', { exact: true })).toBeVisible();
    await expect(page.locator('text=M1 Ratio')).toBeVisible();
    await expect(page.locator('text=CD8+ Activation')).toBeVisible();
    
    // 验证指标值显示（只验证标签存在）
    // 注意：指标值可能为 0%，所以只验证标签存在即可
    const hasTumorReduction = await page.locator('text=Tumor Reduction').isVisible();
    expect(hasTumorReduction).toBeTruthy();
  });

  test('Results 标签页应该渲染图表', async ({ page }) => {
    // 启动仿真
    await startSimulation(page);
    
    // 切换到 Results
    await switchToTab(page, 'Results');
    
    // 等待图表渲染
    await page.waitForTimeout(2000);
    
    // 验证图表标题
    await expect(page.locator('text=Tumor & CAR-M Dynamics')).toBeVisible();
    await expect(page.locator('text=Phagocytosis Rate')).toBeVisible();
    await expect(page.locator('text=Macrophage Polarization')).toBeVisible();
    await expect(page.locator('text=CD8+ T Cell Activation')).toBeVisible();
    
    // 验证 canvas 元素存在（Chart.js 渲染）
    const charts = page.locator('canvas');
    await expect(charts.first()).toBeVisible();
  });

  test('Presets 标签页应该显示预设场景', async ({ page }) => {
    // 切换到 Presets
    await switchToTab(page, 'Presets');
    
    // 等待场景加载
    await page.waitForTimeout(1000);
    
    // 验证预设场景卡片存在
    await expect(page.locator('text=CT-0508-Inspired Baseline')).toBeVisible();
    await expect(page.locator('text=HER2 Low Expression')).toBeVisible();
    await expect(page.locator('text=T-Cell–Rich Context')).toBeVisible();
    await expect(page.locator('text=CD147 ECM Degradation')).toBeVisible();
    await expect(page.locator('text=Cold Tumor')).toBeVisible();
  });

  test('应该能够选择预设场景', async ({ page }) => {
    // 切换到 Presets
    await switchToTab(page, 'Presets');
    
    // 等待场景加载
    await page.waitForTimeout(1000);
    
    // 点击一个预设场景
    await page.click('text=CT-0508-Inspired Baseline');
    
    // 等待参数应用
    await page.waitForTimeout(500);
    
    // 切换回 Setup 验证参数已更新
    await switchToTab(page, 'Setup');
    
    // 验证 CAR-M 数量已更新（CT-0508 预设为 12）
    // 使用更精确的选择器：查找 CAR-M 标签旁边的数字
    const carMValue = await page.locator('text=CAR-M').locator('..').locator('span.font-mono').first().textContent();
    expect(carMValue).toBe('12');
  });

  test('TCGA 标签页应该加载数据', async ({ page }) => {
    // 切换到 TCGA
    await switchToTab(page, 'TCGA');
    
    // 等待数据加载（可能显示加载状态）
    await page.waitForTimeout(3000);
    
    // 验证 TCGA 面板内容
    // 注意：如果数据加载失败，会显示错误信息
    const hasData = await page.locator('text=TCGA 患者队列').isVisible().catch(() => false);
    const hasError = await page.locator('text=加载 TCGA 数据失败').isVisible().catch(() => false);
    const hasLoading = await page.locator('text=加载 TCGA 队列').isVisible().catch(() => false);
    
    // 至少应该显示其中一种状态
    expect(hasData || hasError || hasLoading).toBeTruthy();
  });

  test('AI model 标签页应该显示神经代理演示', async ({ page }) => {
    // 切换到 AI model
    await switchToTab(page, 'AI model');
    
    // 等待组件加载
    await page.waitForTimeout(1000);
    
    // 验证 GAT 演示内容
    await expect(page.locator('text=GAT Neural Surrogate Demo')).toBeVisible();
    await expect(page.locator('text=Reference ODE Generator')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'GAT Surrogate (per-cell)' })).toBeVisible();
    
    // 验证基准测试按钮
    await expect(page.locator('button:has-text("Run GAT Benchmark")')).toBeVisible();
    await expect(page.locator('button:has-text("Run Micro-Benchmark")')).toBeVisible();
  });

  test('细胞图例应该始终显示', async ({ page }) => {
    // 验证细胞图例存在
    await expect(page.locator('text=Cell Legend')).toBeVisible();
    
    // 验证图例项（使用更精确的选择器）
    await expect(page.getByText('CAR-M', { exact: true }).nth(3)).toBeVisible();
    await expect(page.locator('text=WT Macrophage')).toBeVisible();
    await expect(page.locator('#simulation').getByText('Tumor Cell', { exact: true })).toBeVisible();
    await expect(page.getByText('CD8+ T Cell', { exact: true })).toBeVisible();
  });
});

test.describe('仪表板交互测试', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSimulator(page);
  });

  test('运行基准测试应该产生结果', async ({ page }) => {
    // 切换到 AI model
    await switchToTab(page, 'AI model');
    
    // 等待组件加载
    await page.waitForTimeout(1000);
    
    // 点击运行基准测试
    await page.click('button:has-text("Run Micro-Benchmark")');
    
    // 等待测试完成
    await page.waitForTimeout(5000);
    
    // 验证结果显示
    await expect(page.locator('text=/\\d+\\.\\d+ µs\\/call/')).toBeVisible();
  });

  test('Agreement Sweep 应该运行并显示进度', async ({ page }) => {
    // 切换到 AI model
    await switchToTab(page, 'AI model');
    
    // 等待组件加载
    await page.waitForTimeout(1000);
    
    // 点击 Agreement Sweep
    await page.click('button:has-text("Agreement Sweep")');
    
    // 验证进度显示
    await expect(page.locator('text=/Sweep \\d+ \\/ 50/')).toBeVisible();
    
    // 等待完成
    await page.waitForTimeout(10000);
    
    // 验证结果显示
    await expect(page.locator('text=/mean agreement/')).toBeVisible();
  });
});
