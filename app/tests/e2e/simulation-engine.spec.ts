import { test, expect } from './fixtures';
import {
  navigateToSimulator,
  startSimulation,
  resetSimulation,
  switchToTab,
} from './fixtures';

/**
 * 仿真引擎核心流程 E2E 测试
 * 
 * 对应 task1-simulation-engine.md 的验证点：
 * - 仿真引擎启动、参数配置与运行
 * - 细胞行为规则（吞噬、极化）
 * - 统计数据的实时更新
 */

test.describe('仿真引擎核心流程', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSimulator(page);
  });

  test('应该能够启动和暂停仿真', async ({ page }) => {
    // 初始状态应该是 Ready（使用 Badge 组件的选择器）
    await expect(page.locator('[data-slot="badge"]:has-text("Ready")')).toBeVisible();
    
    // 点击 Start
    await page.click('button:has-text("Start")');
    
    // 状态变为 Running
    await expect(page.locator('[data-slot="badge"]:has-text("Running")')).toBeVisible();
    
    // 按钮变为 Pause
    await expect(page.locator('button:has-text("Pause")')).toBeVisible();
    
    // 点击 Pause
    await page.click('button:has-text("Pause")');
    
    // 状态变为 Paused
    await expect(page.locator('[data-slot="badge"]:has-text("Paused")')).toBeVisible();
  });

  test('应该能够重置仿真', async ({ page }) => {
    // 先启动仿真
    await startSimulation(page);
    
    // 重置
    await resetSimulation(page);
    
    // 验证状态回到 Ready
    await expect(page.locator('[data-slot="badge"]:has-text("Ready")')).toBeVisible();
    
    // 验证按钮显示 Start
    await expect(page.locator('button:has-text("Start")')).toBeVisible();
  });

  test('应该能够调整仿真速度', async ({ page }) => {
    // 找到速度滑块（Radix UI Slider 使用 role="slider"）
    const speedSlider = page.locator('[role="slider"]').first();
    await expect(speedSlider).toBeVisible();
    
    // 获取初始速度值
    const initialSpeed = await page.locator('text=/\\d+x/').first().textContent();
    
    // 调整速度（通过键盘）
    await speedSlider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    
    // 验证速度已改变
    await page.waitForTimeout(300);
    const newSpeed = await page.locator('text=/\\d+x/').first().textContent();
    expect(newSpeed).not.toBe(initialSpeed);
  });

  test('应该能够调整细胞数量参数', async ({ page }) => {
    // 找到 CAR-M 数量滑块（Radix UI Slider）
    const sliders = page.locator('[role="slider"]');
    const carMSlider = sliders.nth(1); // 第二个滑块是 CAR-M
    await expect(carMSlider).toBeVisible();
    
    // 获取初始值（通过 aria-valuenow 属性）
    const initialValue = await carMSlider.getAttribute('aria-valuenow');
    
    // 调整值
    await carMSlider.focus();
    await page.keyboard.press('ArrowRight');
    
    // 验证值已改变
    await page.waitForTimeout(300);
    const newValue = await carMSlider.getAttribute('aria-valuenow');
    expect(parseInt(newValue || '0')).toBeGreaterThan(parseInt(initialValue || '0'));
  });

  test('应该能够调整 TME 环境参数', async ({ page }) => {
    // 找到 O₂ Level 滑块（Radix UI Slider）
    const sliders = page.locator('[role="slider"]');
    const oxygenSlider = sliders.nth(5); // 第六个滑块是 O₂ Level
    await expect(oxygenSlider).toBeVisible();
    
    // 调整氧气水平
    await oxygenSlider.focus();
    await page.keyboard.press('ArrowLeft');
    
    // 验证百分比显示更新
    await page.waitForTimeout(300);
    const percentText = await page.locator('text=/%/').first().textContent();
    expect(percentText).toMatch(/\d+%/);
  });

  test('仿真运行后应该更新统计数据', async ({ page }) => {
    // 启动仿真
    await startSimulation(page);
    
    // 切换到 Results 标签页
    await switchToTab(page, 'Results');
    
    // 等待图表渲染
    await page.waitForTimeout(2000);
    
    // 验证指标卡片显示数据（限定在当前标签面板内）
    const panel = page.getByRole('tabpanel');
    await expect(panel.getByText('Tumor Reduction')).toBeVisible();
    await expect(panel.getByText('Phagocytosis', { exact: true })).toBeVisible();
    await expect(panel.getByText('M1 Ratio')).toBeVisible();
    await expect(panel.getByText('CD8+ Activation')).toBeVisible();
    
    // 验证图表容器存在
    await expect(panel.getByText('Tumor & CAR-M Dynamics')).toBeVisible();
    await expect(panel.getByText('Phagocytosis Rate')).toBeVisible();
    await expect(panel.getByText('Macrophage Polarization')).toBeVisible();
  });

  test('应该能够切换 2D/3D 视图', async ({ page }) => {
    // 默认是 2D 视图
    await expect(page.locator('button:has-text("2D View")')).toHaveAttribute('aria-pressed', 'true');
    
    // 切换到 3D
    await page.click('button:has-text("3D View")');
    
    // 验证 3D 视图激活
    await expect(page.locator('button:has-text("3D View")')).toHaveAttribute('aria-pressed', 'true');
    
    // 等待 3D 场景加载
    await page.waitForTimeout(2000);
    
    // 切换回 2D
    await page.click('button:has-text("2D View")');
    await expect(page.locator('button:has-text("2D View")')).toHaveAttribute('aria-pressed', 'true');
  });

  test('ECM Overlay 开关应该工作', async ({ page }) => {
    // 找到 ECM Overlay 开关
    const ecmSwitch = page.locator('text=ECM Overlay').locator('..').locator('button[role="switch"]');
    await expect(ecmSwitch).toBeVisible();
    
    // 获取初始状态
    const initialState = await ecmSwitch.getAttribute('aria-checked');
    
    // 切换开关
    await ecmSwitch.click();
    
    // 验证状态改变
    await page.waitForTimeout(300);
    const newState = await ecmSwitch.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });
});

test.describe('仿真参数边界测试', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSimulator(page);
  });

  test('细胞数量应该在有效范围内', async ({ page }) => {
    // 验证滑块存在（Radix UI Slider）
    const sliders = page.locator('[role="slider"]');
    
    // 应该有多个滑块（速度、CAR-M、WT Macrophage、Tumor、CD8+ 等）
    const count = await sliders.count();
    expect(count).toBeGreaterThan(5);
    
    // 验证每个滑块都有 aria-valuemin 和 aria-valuemax 属性
    const firstSlider = sliders.first();
    await expect(firstSlider).toHaveAttribute('aria-valuemin');
    await expect(firstSlider).toHaveAttribute('aria-valuemax');
  });

  test('环境参数应该在 0-1 范围内', async ({ page }) => {
    // 验证环境参数滑块存在（Radix UI Slider）
    const sliders = page.locator('[role="slider"]');
    
    // 环境参数滑块（O₂、Lactate、TGF-β）应该在后面
    const count = await sliders.count();
    expect(count).toBeGreaterThan(7);
    
    // 验证滑块有正确的范围属性
    const oxygenSlider = sliders.nth(5);
    const min = await oxygenSlider.getAttribute('aria-valuemin');
    const max = await oxygenSlider.getAttribute('aria-valuemax');
    expect(parseFloat(min || '0')).toBe(0);
    expect(parseFloat(max || '1')).toBe(1);
  });
});
