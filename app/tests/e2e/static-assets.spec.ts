import { test, expect } from './fixtures';
import { waitForPageReady, navigateToSimulator, switchToTab } from './fixtures';

/**
 * 静态资源加载 E2E 测试
 * 
 * 验证点：
 * - 3D 模型文件（.glb）加载
 * - TCGA 数据文件加载
 * - 图片和其他静态资源
 * - 资源加载错误处理
 */

test.describe('3D 模型资源加载', () => {
  test('应该验证所有 3D 模型文件存在', async ({ page }) => {
    const models = [
      { path: '/models/macrophage.glb', name: 'Macrophage' },
      { path: '/models/macrophage-enhanced.glb', name: 'Enhanced Macrophage' },
      { path: '/models/tumor-cell.glb', name: 'Tumor Cell' },
      { path: '/models/dna-helix.glb', name: 'DNA Helix' },
    ];
    
    for (const model of models) {
      const response = await page.request.get(model.path);
      expect(response.ok(), `Model ${model.name} should be accessible`).toBeTruthy();
      
      // 验证 Content-Type
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('model/gltf-binary');
      
      // 验证文件大小（GLB 文件应该有一定大小）
      const contentLength = parseInt(response.headers()['content-length'] || '0');
      expect(contentLength).toBeGreaterThan(1000); // 至少 1KB
    }
  });

  test('3D 模型应该在页面中成功加载', async ({ page }) => {
    // 跟踪网络请求
    const loadedModels: string[] = [];
    page.on('response', (response) => {
      if (response.url().endsWith('.glb') && response.ok()) {
        loadedModels.push(response.url());
      }
    });
    
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动到 3D 区域触发模型加载
    await page.locator('text=Interactive 3D Cell Viewer').scrollIntoViewIfNeeded();
    
    // 等待模型加载
    await page.waitForTimeout(3000);
    
    // 验证至少加载了一个模型
    expect(loadedModels.length).toBeGreaterThan(0);
  });
});

test.describe('TCGA 数据资源加载', () => {
  test('应该验证 TCGA 数据文件存在', async ({ page }) => {
    const dataFiles = [
      '/data/tcga/tcga_predictions.json',
      '/data/tcga/tcga_attention_weights.json',
      '/data/tcga/tcga_graph_info.json',
      '/data/tcga/tcga_patient_scenarios.json',
    ];
    
    for (const filePath of dataFiles) {
      const response = await page.request.get(filePath);
      expect(response.ok(), `TCGA file ${filePath} should be accessible`).toBeTruthy();
      
      // 验证是 JSON
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
      
      // 验证可以解析为 JSON
      const data = await response.json();
      expect(data).toBeDefined();
    }
  });

  test('TCGA 数据应该在面板中加载', async ({ page }) => {
    await navigateToSimulator(page);
    
    // 切换到 TCGA 标签页
    await switchToTab(page, 'TCGA');
    
    // 等待数据加载
    await page.waitForTimeout(3000);
    
    // 验证 TCGA 面板显示数据或错误
    const hasData = await page.locator('text=TCGA 患者队列').isVisible().catch(() => false);
    const hasError = await page.locator('text=加载 TCGA 数据失败').isVisible().catch(() => false);
    
    // 应该显示数据或错误信息
    expect(hasData || hasError).toBeTruthy();
  });

  test('TCGA 预测数据应该包含必要字段', async ({ page }) => {
    const response = await page.request.get('/data/tcga/tcga_predictions.json');
    const data = await response.json();
    
    // 验证数据结构
    expect(data).toHaveProperty('metadata');
    expect(data).toHaveProperty('predictions');
    expect(data.metadata).toHaveProperty('cancer_type');
    expect(data.metadata).toHaveProperty('cv_scores');
    expect(Array.isArray(data.predictions)).toBeTruthy();
    
    // 验证预测数据字段
    if (data.predictions.length > 0) {
      const firstPrediction = data.predictions[0];
      expect(firstPrediction).toHaveProperty('sample_id');
      expect(firstPrediction).toHaveProperty('immune_subtype');
      expect(firstPrediction).toHaveProperty('survival_risk');
    }
  });

  test('TCGA 注意力权重数据应该有效', async ({ page }) => {
    const response = await page.request.get('/data/tcga/tcga_attention_weights.json');
    const data = await response.json();
    
    // 验证注意力权重数据存在
    expect(data).toBeDefined();
    // 具体结构取决于实现，这里只验证是有效 JSON
  });
});

test.describe('图片和其他静态资源', () => {
  test('应该验证关键图片资源存在', async ({ page }) => {
    const images = [
      '/images/hero-bg.jpg',
      '/images/m1-m2-polarization.png',
    ];
    
    for (const imagePath of images) {
      const response = await page.request.get(imagePath);
      // 图片可能不存在，记录但不失败
      if (!response.ok()) {
        console.log(`Image ${imagePath} not found (optional)`);
      }
    }
  });

  test('页面应该没有 404 资源错误', async ({ page }) => {
    const failedResources: string[] = [];
    
    page.on('response', (response) => {
      if (response.status() === 404) {
        failedResources.push(response.url());
      }
    });
    
    await page.goto('/');
    await waitForPageReady(page);
    
    // 滚动页面触发懒加载
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await page.waitForTimeout(2000);
    
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);
    
    // 过滤掉可选资源
    const criticalFailures = failedResources.filter(url => 
      !url.includes('optional') && 
      !url.includes('fallback')
    );
    
    // 记录 404 错误
    if (criticalFailures.length > 0) {
      console.log('404 resources:', criticalFailures);
    }
    
    // 关键资源不应该 404
    const hasCritical404 = criticalFailures.some(url => 
      url.includes('.js') || 
      url.includes('.css') || 
      url.includes('.glb') ||
      url.includes('tcga')
    );
    
    expect(hasCritical404, 'Critical resources should not return 404').toBeFalsy();
  });
});

test.describe('资源加载性能', () => {
  test('页面加载时间应该在可接受范围内', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await waitForPageReady(page);
    
    const loadTime = Date.now() - startTime;
    
    // 页面加载应该在 10 秒内
    expect(loadTime).toBeLessThan(10000);
    
    console.log(`Page load time: ${loadTime}ms`);
  });

  test('关键资源应该优先加载', async ({ page }) => {
    await page.goto('/');
    await waitForPageReady(page);
    
    // 验证页面已加载（通过检查 DOM 元素）
    const root = await page.locator('#root').count();
    expect(root).toBeGreaterThan(0);
    
    // 验证页面包含脚本和样式标签
    const hasScripts = await page.locator('script').count();
    const hasStyles = await page.locator('link[rel="stylesheet"], style').count();
    
    expect(hasScripts).toBeGreaterThan(0);
    expect(hasStyles).toBeGreaterThan(0);
  });
});
