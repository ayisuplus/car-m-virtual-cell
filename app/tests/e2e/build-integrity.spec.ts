import { test, expect } from './fixtures';
import { waitForPageReady } from './fixtures';

/**
 * 构建产物完整性 E2E 测试
 * 
 * 验证点：
 * - 构建产物（dist/）的完整性
 * - 生产环境页面功能
 * - 静态资源正确打包
 * - SPA 路由 fallback
 */

test.describe('构建产物完整性', () => {
  test('首页应该正确加载', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 验证页面标题
    await expect(page).toHaveTitle(/CAR-M/);
    
    // 验证关键元素存在（PR #2 后品牌文案为 CAR-M / Virtual Cell Lab，用稳定的 aria-label 验证）
    await expect(page.getByRole('link', { name: 'CAR-M Simulator home' })).toBeVisible();
    await expect(page.getByText('Virtual Cell Lab')).toBeVisible();
  });

  test('所有主要区块应该渲染', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 验证 Hero/导航区域（PR #2 后品牌文案为 CAR-M / Virtual Cell Lab，用稳定的 aria-label 验证）
    await expect(page.getByRole('link', { name: 'CAR-M Simulator home' })).toBeVisible();
    
    // 验证导航链接（使用更精确的选择器）
    await expect(page.getByRole('link', { name: 'Simulator', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Science', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Clinical', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Data', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Technology', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Team', exact: true })).toBeVisible();
  });

  test('懒加载组件应该正确加载', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到页面底部触发懒加载
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // 等待懒加载组件（CI 上惰性 chunk 加载可能超过 3s，加长断言超时）
    await page.waitForTimeout(3000);
    
    // 验证页脚存在（使用更灵活的选择器）
    await expect(page.locator('footer')).toBeVisible({ timeout: 30000 });
  });

  test('SPA 路由应该正确处理', async ({ page }) => {
    // 访问根路径
    await page.goto('/');
    await waitForPageReady(page);
    
    // 验证 URL 正确
    expect(page.url()).toContain('/');
    
    // 点击导航链接
    await page.click('a:has-text("Simulator")');
    
    // 等待滚动到仿真区域
    await page.waitForTimeout(1000);
    
    // 验证仿真区域可见
    await expect(page.locator('#simulation')).toBeVisible();
  });

  test('构建产物应该包含必要的静态文件', async ({ page }) => {
    // 检查关键资源文件
    const criticalResources = [
      '/index.html',
      // CSS 和 JS 文件由 Vite 动态生成，这里检查它们是否被正确引用
    ];
    
    for (const resource of criticalResources) {
      const response = await page.request.get(resource);
      expect(response.ok()).toBeTruthy();
    }
    
    // 验证 HTML 中引用了 JS 和 CSS（检查 script 和 link 标签）
    const html = await page.request.get('/').then(r => r.text());
    expect(html).toContain('<script');
    expect(html).toContain('src=');
  });

  test('Slides 页面应该可访问', async ({ page }) => {
    // 访问 slides 页面
    const response = await page.goto('/slides/');
    
    // 验证页面加载成功
    expect(response?.ok()).toBeTruthy();
    
    // 验证 slides 内容（使用更精确的选择器）
    await expect(page.getByRole('heading', { name: 'CAR-M Simulator' })).toBeVisible();
  });
});

test.describe('生产环境功能验证', () => {
  test('仿真功能在生产构建中应该工作', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 导航到仿真区域
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    
    // 验证仿真控制面板
    await expect(page.locator('text=Simulation Control')).toBeVisible();
    await expect(page.locator('button:has-text("Start")')).toBeVisible();
    
    // 启动仿真（用状态徽章选择器，避免匹配到资产区 "RunningHub API" 等同名文案）
    await page.click('button:has-text("Start")');
    await expect(page.locator('[data-slot="badge"]:has-text("Running")')).toBeVisible();
    
    // 暂停仿真
    await page.click('button:has-text("Pause")');
    await expect(page.locator('text=Paused')).toBeVisible();
  });

  test('3D 可视化在生产构建中应该工作', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到 3D 区域
    await page.locator('text=Interactive 3D Cell Viewer').scrollIntoViewIfNeeded();
    
    // 等待 3D 场景加载
    await page.waitForTimeout(3000);
    
    // 验证 canvas 元素
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('图表在生产构建中应该渲染', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 导航到仿真区域
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    
    // 启动仿真
    await page.click('button:has-text("Start")');
    await page.waitForTimeout(2000);
    
    // 切换到 Results
    await page.click('[role="tab"]:has-text("Results")');
    await page.waitForTimeout(2000);
    
    // 验证图表 canvas
    const charts = page.locator('canvas');
    await expect(charts.first()).toBeVisible();
  });
});

test.describe('错误边界处理', () => {
  test('应该处理 JavaScript 错误', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动页面
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(3000);
    
    // 过滤掉已知的非关键错误
    const criticalErrors = errors.filter(e => 
      !e.includes('ResizeObserver') && // 常见的非关键错误
      !e.includes('WebGL') // WebGL 在某些环境可能不可用
    );
    
    // 记录错误
    if (criticalErrors.length > 0) {
      console.log('Critical errors:', criticalErrors);
    }
    
    // 不应该有关键错误
    expect(criticalErrors.length).toBe(0);
  });

  test('应该处理网络错误', async ({ page }) => {
    // 模拟网络离线
    await page.context().setOffline(true);
    
    // 尝试访问页面（预期会失败）
    try {
      await page.goto('/', { timeout: 5000 });
    } catch (error) {
      // 预期会抛出错误
      expect(error).toBeDefined();
    }
    
    // 恢复网络
    await page.context().setOffline(false);
  });
});

test.describe('性能指标', () => {
  test('页面性能应该在可接受范围内', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 获取性能指标
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
      };
    });
    
    // 页面加载应该在 10 秒内
    expect(metrics.loadTime).toBeLessThan(10000);
    
    // DOM 就绪应该在 5 秒内
    expect(metrics.domReady).toBeLessThan(5000);
    
    console.log('Performance metrics:', metrics);
  });

  test('资源大小应该合理', async ({ page }) => {
    const responses: Array<{ url: string; size: number }> = [];
    
    page.on('response', async (response) => {
      const buffer = await response.body().catch(() => null);
      if (buffer) {
        responses.push({
          url: response.url(),
          size: buffer.length,
        });
      }
    });
    
    await page.goto('/');
    await waitForPageReady(page);
    
    // 计算总大小
    const totalSize = responses.reduce((sum, r) => sum + r.size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    
    console.log(`Total page size: ${totalSizeMB.toFixed(2)} MB`);
    
    // 页面总大小应该在 60MB 以内（包含 3D 模型和其他资源）
    // 注：webkit 对部分资源不启用压缩，实测约 49MB，上限留有余量
    expect(totalSizeMB).toBeLessThan(60);
  });
});
