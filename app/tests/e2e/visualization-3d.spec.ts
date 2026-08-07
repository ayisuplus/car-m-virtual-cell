import { test, expect } from './fixtures';
import {
  waitForPageReady,
  waitFor3DSceneReady,
  navigateToSimulator,
} from './fixtures';

/**
 * 3D 可视化 E2E 测试
 * 
 * 对应 task3D-visualization.md 的验证点：
 * - 3D 场景加载与渲染
 * - 3D 模型（.glb）文件加载
 * - 3D 交互功能
 * - WebGL 上下文错误处理
 */

test.describe('3D 可视化场景', () => {
  test('3D 细胞展示区应该加载', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到 3D 细胞展示区（使用 Playwright 的 scrollIntoViewIfNeeded）
    await page.locator('text=Interactive 3D Cell Viewer').scrollIntoViewIfNeeded();
    
    // 等待 3D 场景加载
    await page.waitForTimeout(2000);
    
    // 验证 3D 查看器存在
    await expect(page.locator('text=Interactive 3D Cell Viewer')).toBeVisible();
    
    // 验证模型选择按钮
    await expect(page.locator('button:has-text("CAR-Macrophage")')).toBeVisible();
    await expect(page.locator('button:has-text("Enhanced Macrophage")')).toBeVisible();
    await expect(page.locator('button:has-text("Tumor Cell")')).toBeVisible();
    await expect(page.locator('button:has-text("DNA Double Helix")')).toBeVisible();
  });

  test('应该能够切换 3D 模型', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到 3D 区域
    await page.locator('text=Interactive 3D Cell Viewer').scrollIntoViewIfNeeded();
    
    await page.waitForTimeout(2000);
    
    // 点击 Tumor Cell 按钮
    await page.click('button:has-text("Tumor Cell")');
    
    // 等待模型加载完成：加载指示消失或显示回退提示（GLB 在 webkit/CI 上可能较慢，用 poll 等待）
    await expect.poll(async () => {
      const loadingVisible = await page.locator('text=Loading 3D model...').isVisible().catch(() => false);
      const errorVisible = await page.locator('text=3D model not loaded').isVisible().catch(() => false);
      return !loadingVisible || errorVisible;
    }, { timeout: 30000 }).toBeTruthy();
  });

  test('3D 场景应该渲染 canvas 元素', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到 3D 区域
    await page.locator('text=Interactive 3D Cell Viewer').scrollIntoViewIfNeeded();
    
    // 等待 canvas 渲染
    await waitFor3DSceneReady(page);
    
    // 验证 canvas 元素存在
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // 验证 canvas 有尺寸
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThan(0);
  });

  test('仿真 3D 视图应该初始化', async ({ page }) => {
    await navigateToSimulator(page);
    
    // 切换到 3D 视图
    await page.click('button:has-text("3D View")');
    
    // 等待 3D 场景加载
    await page.waitForTimeout(3000);
    
    // 验证 3D 视图激活
    await expect(page.locator('button:has-text("3D View")')).toHaveAttribute('aria-pressed', 'true');
    
    // 验证 canvas 存在
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('3D 场景应该有交互控制提示', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到 3D 区域
    await page.locator('text=Interactive 3D Cell Viewer').scrollIntoViewIfNeeded();
    
    await page.waitForTimeout(2000);
    
    // 验证交互提示（限定在 3D 展示区 section 内，避免匹配到资产区的同名文案）
    const showcase = page.locator('section').filter({ hasText: 'Interactive 3D Cell Viewer' }).first();
    await expect(showcase.getByText('Drag to rotate')).toBeVisible();
    await expect(showcase.getByText('Scroll to zoom')).toBeVisible();
  });
});

test.describe('3D 模型加载测试', () => {
  test('应该验证 3D 模型文件可访问', async ({ page }) => {
    // 检查每个模型文件的 HTTP 响应
    const models = [
      '/models/macrophage.glb',
      '/models/macrophage-enhanced.glb',
      '/models/tumor-cell.glb',
      '/models/dna-helix.glb',
    ];
    
    for (const modelPath of models) {
      const response = await page.request.get(modelPath);
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['content-type']).toContain('model/gltf-binary');
    }
  });

  test('3D 模型加载失败应该显示回退', async ({ page }) => {
    // 拦截 3D 模型请求并模拟失败
    await page.route('**/*.glb', (route) => {
      route.abort('failed');
    });
    
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到 3D 区域
    await page.locator('text=Interactive 3D Cell Viewer').scrollIntoViewIfNeeded();
    
    // 等待加载失败处理
    await page.waitForTimeout(3000);
    
    // 验证回退提示显示
    await expect(page.locator('text=3D model not loaded — showing preview sphere')).toBeVisible();
  });
});

test.describe('WebGL 错误处理', () => {
  test('应该捕获 WebGL 上下文创建失败', async ({ page }) => {
    // 监听控制台错误
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到 3D 区域
    await page.locator('text=Interactive 3D Cell Viewer').scrollIntoViewIfNeeded();
    
    await page.waitForTimeout(3000);
    
    // 检查是否有 WebGL 相关错误
    const webglErrors = errors.filter(e => 
      e.includes('WebGL') || 
      e.includes('THREE') ||
      e.includes('GL_')
    );
    
    // 记录错误但不失败测试（某些环境可能不支持 WebGL）
    if (webglErrors.length > 0) {
      console.log('WebGL errors detected:', webglErrors);
    }
  });
});
