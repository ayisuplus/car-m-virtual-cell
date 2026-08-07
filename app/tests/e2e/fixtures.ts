import { test as base, expect } from '@playwright/test';

/**
 * CAR-M Simulator E2E 测试 Fixtures
 * 
 * 提供可复用的测试辅助函数和页面对象
 */

// 扩展基础 test
export const test = base.extend<{
  // 可以在这里添加自定义 fixtures
}>({});

export { expect };

/**
 * 等待页面完全加载（包括所有懒加载组件）
 */
export async function waitForPageReady(page: import('@playwright/test').Page) {
  // 等待网络空闲
  await page.waitForLoadState('networkidle');
  
  // 等待 React 应用挂载
  await page.waitForSelector('#root', { state: 'attached' });
  
  // 等待 Suspense fallback 消失（如果有）
  await page.waitForTimeout(500);
}

/**
 * 等待 3D 场景初始化完成
 */
export async function waitFor3DSceneReady(page: import('@playwright/test').Page, timeout = 10000) {
  // 等待 Three.js canvas 元素出现
  await page.waitForSelector('canvas', { state: 'visible', timeout });
  
  // 额外等待确保 WebGL 上下文初始化
  await page.waitForTimeout(1000);
}

/**
 * 检查控制台是否有错误
 */
export async function checkConsoleErrors(page: import('@playwright/test').Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  return errors;
}

/**
 * 检查页面是否有未处理的 Promise 拒绝
 */
export async function checkUnhandledRejections(page: import('@playwright/test').Page): Promise<string[]> {
  const rejections: string[] = [];
  
  page.on('pageerror', (error) => {
    rejections.push(error.message);
  });
  
  return rejections;
}

/**
 * 导航到仿真工作台并等待就绪
 */
export async function navigateToSimulator(page: import('@playwright/test').Page) {
  await page.goto('/');
  await waitForPageReady(page);
  
  // 点击导航到 Simulator（使用更精确的选择器）
  await page.getByRole('link', { name: 'Simulator' }).first().click();
  
  // 等待仿真区域可见
  await page.waitForSelector('#simulation', { state: 'visible' });
  
  // 等待控制面板加载
  await page.waitForSelector('text=Simulation Control', { state: 'visible' });
}

/**
 * 启动仿真并等待运行
 */
export async function startSimulation(page: import('@playwright/test').Page) {
  // 点击 Start 按钮
  await page.click('button:has-text("Start")');
  
  // 等待状态变为 Running
  await page.waitForSelector('[data-slot="badge"]:has-text("Running")', { state: 'visible' });
  
  // 等待一段时间让仿真运行
  await page.waitForTimeout(2000);
}

/**
 * 停止仿真
 */
export async function stopSimulation(page: import('@playwright/test').Page) {
  const pauseButton = page.locator('button:has-text("Pause")');
  if (await pauseButton.isVisible()) {
    await pauseButton.click();
    await page.waitForSelector('[data-slot="badge"]:has-text("Paused")', { state: 'visible' });
  }
}

/**
 * 重置仿真
 */
export async function resetSimulation(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Reset' }).click();
  // 增加超时时间，因为重置可能需要更长时间
  await page.waitForSelector('[data-slot="badge"]:has-text("Ready")', { state: 'visible', timeout: 15000 });
}

/**
 * 切换到指定标签页
 */
export async function switchToTab(page: import('@playwright/test').Page, tabName: string) {
  await page.click(`[role="tab"]:has-text("${tabName}")`);
  await page.waitForTimeout(300); // 等待标签页切换动画
}

/**
 * 验证图表是否渲染
 */
export async function verifyChartRendered(page: import('@playwright/test').Page, chartTitle: string) {
  const chartContainer = page.locator(`text=${chartTitle}`).locator('..').locator('canvas');
  await expect(chartContainer).toBeVisible();
}

/**
 * 获取性能指标
 */
export async function getPerformanceMetrics(page: import('@playwright/test').Page) {
  return await page.evaluate(() => {
    const timing = performance.timing;
    return {
      loadTime: timing.loadEventEnd - timing.navigationStart,
      domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
    };
  });
}

/**
 * 检查资源加载错误
 */
export async function checkResourceErrors(page: import('@playwright/test').Page): Promise<string[]> {
  const failedResources: string[] = [];
  
  page.on('requestfailed', (request) => {
    failedResources.push(`${request.url()} - ${request.failure()?.errorText}`);
  });
  
  page.on('response', (response) => {
    if (!response.ok() && response.status() >= 400) {
      failedResources.push(`${response.url()} - HTTP ${response.status()}`);
    }
  });
  
  return failedResources;
}
