import { test, expect } from '@playwright/test';

/**
 * 冒烟测试 — 验证基本功能
 */

test.describe('冒烟测试', () => {
  test('首页应该加载', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CAR-M/);
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('text=CAR-M Simulator').first()).toBeVisible();
  });

  test('应该能够导航到仿真区域', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    await expect(page.locator('#simulation')).toBeVisible();
  });

  test('仿真控制面板应该显示', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Simulation Control')).toBeVisible();
    await expect(page.locator('button:has-text("Start")')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible();
  });

  test('标签页应该存在', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    await expect(page.locator('[role="tab"]:has-text("Setup")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("Results")')).toBeVisible();
    await expect(page.locator('[role="tab"]:has-text("TCGA")')).toBeVisible();
  });

  test('3D 模型文件应该可访问', async ({ page }) => {
    const response = await page.request.get('/models/macrophage.glb');
    expect(response.ok()).toBeTruthy();
  });

  test('TCGA 数据文件应该可访问', async ({ page }) => {
    const response = await page.request.get('/data/tcga/tcga_predictions.json');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
    expect(data).toHaveProperty('metadata');
  });
});
