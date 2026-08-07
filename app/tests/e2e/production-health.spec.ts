import { test, expect } from './fixtures';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 生产环境健康检查测试
 */

const PROD_URL = process.env.PROD_URL || 'https://car-m-virtual-cell.pages.dev';

test.describe('生产环境健康检查', () => {
  test.skip(() => !process.env.PROD_URL, '需要设置 PROD_URL 环境变量');

  test('根路径应该返回 200', async ({ page }) => {
    const response = await page.request.get(PROD_URL);
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('/slides/ 路径应该返回 200', async ({ page }) => {
    const response = await page.request.get(`${PROD_URL}/slides/`);
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('首页应该包含关键内容', async ({ page }) => {
    await page.goto(PROD_URL);
    await expect(page).toHaveTitle(/CAR-M/);
    await expect(page.locator('text=CAR-M Simulator').first()).toBeVisible();
  });

  test('Slides 页面应该包含演示内容', async ({ page }) => {
    await page.goto(`${PROD_URL}/slides/`);
    const body = page.locator('body');
    await expect(body).toBeVisible();
    await expect(page.locator('text=/CAR-M/')).toBeVisible();
  });

  test('生产环境应该加载 3D 模型', async ({ page }) => {
    const models = [
      '/models/macrophage.glb',
      '/models/tumor-cell.glb',
      '/models/dna-helix.glb',
    ];
    
    for (const model of models) {
      const response = await page.request.get(`${PROD_URL}${model}`);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('model/gltf-binary');
    }
  });

  test('生产环境应该加载 TCGA 数据', async ({ page }) => {
    const dataFiles = [
      '/data/tcga/tcga_predictions.json',
      '/data/tcga/tcga_attention_weights.json',
    ];
    
    for (const file of dataFiles) {
      const response = await page.request.get(`${PROD_URL}${file}`);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('application/json');
    }
  });

  test('生产环境页面加载时间应该合理', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(15000);
    console.log(`Production page load time: ${loadTime}ms`);
  });

  test('生产环境应该没有严重的控制台错误', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto(PROD_URL);
    await page.waitForLoadState('networkidle');
    
    const criticalErrors = errors.filter(e => 
      !e.includes('ResizeObserver') &&
      !e.includes('WebGL') &&
      !e.includes('Deprecation')
    );
    
    if (criticalErrors.length > 0) {
      console.log('Production console errors:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBeLessThan(5);
  });

  test('生产环境应该支持 SPA 路由', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    await expect(page.locator('#simulation')).toBeVisible();
  });

  test('生产环境仿真功能应该工作', async ({ page }) => {
    await page.goto(PROD_URL);
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    
    await expect(page.locator('text=Simulation Control')).toBeVisible();
    await expect(page.locator('button:has-text("Start")')).toBeVisible();
    
    await page.click('button:has-text("Start")');
    await page.waitForSelector('[data-slot="badge"]:has-text("Running")', { 
      state: 'visible',
      timeout: 10000 
    });
  });
});

test.describe('部署流水线验证', () => {
  test('应该验证 CI 工作流文件存在', async () => {
    const ciPath = join(process.cwd(), '..', '.github', 'workflows', 'ci.yml');
    const deployPath = join(process.cwd(), '..', '.github', 'workflows', 'deploy-cloudflare.yml');
    
    expect(existsSync(ciPath)).toBeTruthy();
    expect(existsSync(deployPath)).toBeTruthy();
  });

  test('应该验证 CI 工作流包含 E2E 测试', async () => {
    const ciPath = join(process.cwd(), '..', '.github', 'workflows', 'ci.yml');
    const ciContent = readFileSync(ciPath, 'utf-8');
    
    expect(ciContent).toContain('e2e-tests:');
    expect(ciContent).toContain('Playwright');
    expect(ciContent).toContain('npm run test:e2e:ci');
  });

  test('应该验证部署工作流包含健康检查', async () => {
    const deployPath = join(process.cwd(), '..', '.github', 'workflows', 'deploy-cloudflare.yml');
    const deployContent = readFileSync(deployPath, 'utf-8');
    
    expect(deployContent).toContain('Health check');
    expect(deployContent).toContain('curl -sf');
    expect(deployContent).toContain('car-m-virtual-cell.pages.dev');
  });
});
