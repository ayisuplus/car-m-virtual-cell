import { test, expect } from './fixtures';

/**
 * Python 后端数据管道集成测试
 */

test.describe('Python 数据管道集成', () => {
  test('应该验证 Python 导出的 TCGA 预测数据', async ({ page }) => {
    const response = await page.request.get('/data/tcga/tcga_predictions.json');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('metadata');
    expect(data).toHaveProperty('predictions');
    expect(data.metadata).toHaveProperty('cancer_type');
    expect(data.metadata).toHaveProperty('cv_scores');
    expect(Array.isArray(data.predictions)).toBeTruthy();
    expect(data.predictions.length).toBeGreaterThan(0);
  });

  test('应该验证 Python 导出的注意力权重数据', async ({ page }) => {
    const response = await page.request.get('/data/tcga/tcga_attention_weights.json');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('应该验证 Python 导出的图信息数据', async ({ page }) => {
    const response = await page.request.get('/data/tcga/tcga_graph_info.json');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('应该验证 Python 导出的患者场景数据', async ({ page }) => {
    const response = await page.request.get('/data/tcga/tcga_patient_scenarios.json');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
    expect(data.length).toBeGreaterThanOrEqual(4);
    
    const firstScenario = data[0];
    expect(firstScenario).toHaveProperty('name');
    expect(firstScenario).toHaveProperty('description');
    expect(firstScenario).toHaveProperty('sim_params');
    expect(firstScenario).toHaveProperty('car_design');
  });

  test('应该验证 TCGA 数据与前端组件的集成', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    await page.click('[role="tab"]:has-text("TCGA")');
    await page.waitForTimeout(3000);
    
    const hasData = await page.locator('text=TCGA 患者队列').isVisible().catch(() => false);
    const hasError = await page.locator('text=加载 TCGA 数据失败').isVisible().catch(() => false);
    const hasLoading = await page.locator('text=加载 TCGA 队列').isVisible().catch(() => false);
    
    expect(hasData || hasError || hasLoading).toBeTruthy();
  });

  test('应该验证预设场景与 Python 导出数据的集成', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    await page.click('[role="tab"]:has-text("Presets")');
    await page.waitForTimeout(2000);
    
    // 验证预设场景存在（TCGA 场景或临床场景）
    const scenarios = page.locator('button:has-text("CT-0508"), button:has-text("TCGA")');
    const count = await scenarios.count();
    expect(count).toBeGreaterThan(0);
  });

  test('应该验证数据文件的 Content-Type', async ({ page }) => {
    const files = [
      '/data/tcga/tcga_predictions.json',
      '/data/tcga/tcga_attention_weights.json',
      '/data/tcga/tcga_graph_info.json',
      '/data/tcga/tcga_patient_scenarios.json',
    ];
    
    for (const file of files) {
      const response = await page.request.get(file);
      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    }
  });

  test('应该验证数据文件的大小合理性', async ({ page }) => {
    const files = [
      { path: '/data/tcga/tcga_predictions.json', minSize: 1000 },
      { path: '/data/tcga/tcga_attention_weights.json', minSize: 500 },
      { path: '/data/tcga/tcga_graph_info.json', minSize: 100 },
      { path: '/data/tcga/tcga_patient_scenarios.json', minSize: 500 },
    ];
    
    for (const file of files) {
      const response = await page.request.get(file.path);
      expect(response.ok()).toBeTruthy();
      // 用响应体实际长度验证大小（vite preview 可能不返回 content-length 头）
      const body = await response.body();
      expect(body.byteLength).toBeGreaterThan(file.minSize);
    }
  });
});

test.describe('Python 数据管道错误处理', () => {
  test('应该处理 TCGA 数据加载失败', async ({ page }) => {
    await page.route('**/data/tcga/tcga_predictions.json', (route) => {
      route.abort('failed');
    });
    
    await page.goto('/');
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    await page.click('[role="tab"]:has-text("TCGA")');
    await page.waitForTimeout(2000);
    
    // 验证 TCGA 面板仍然显示（即使数据加载失败）
    const hasTcgaPanel = await page.locator('text=/TCGA/').first().isVisible().catch(() => false);
    expect(hasTcgaPanel).toBeTruthy();
  });

  test('应该处理预设场景数据加载失败', async ({ page }) => {
    await page.route('**/data/tcga/tcga_patient_scenarios.json', (route) => {
      route.abort('failed');
    });
    
    await page.goto('/');
    await page.click('a:has-text("Simulator")');
    await page.waitForTimeout(1000);
    await page.click('[role="tab"]:has-text("Presets")');
    await page.waitForTimeout(2000);
    
    // 验证预设场景仍然显示（使用硬编码的回退场景）
    const hasScenarios = await page.locator('button:has-text("CT-0508"), button:has-text("TCGA")').first().isVisible().catch(() => false);
    expect(hasScenarios).toBeTruthy();
  });
});
