# AI虚拟巨噬细胞平台 — 技术规格

## 组件清单

### shadcn/ui 组件
- `Button` — 模拟控制按钮（播放/暂停/重置）
- `Slider` — 参数调节滑块
- `Card` — 数据面板容器
- `Tabs` — 面板切换（Simulation/Designer/Dashboard）
- `Badge` — 细胞类型标签、状态指示
- `Select` — CAR信号域选择等下拉选项
- `Switch` — 检查点阻断开关
- `Tooltip` — 科学术语悬浮提示
- `Separator` — 面板分隔线
- `ScrollArea` — 长面板滚动
- `Table` — 临床数据展示

### 自定义组件

| 组件名 | 用途 | 位置 |
|--------|------|------|
| SimulationCanvas | ABM模拟主Canvas | `src/components/simulation/` |
| Cell | 细胞基类及子类 | `src/lib/simulation/cell.ts` |
| ABMEngine | Agent-Based Modeling引擎 | `src/lib/simulation/engine.ts` |
| CytokineField | 细胞因子扩散场 | `src/lib/simulation/field.ts` |
| PolarizationModel | M1/M2极化状态机 | `src/lib/simulation/polarization.ts` |
| PhagocytosisModel | 吞噬概率模型 | `src/lib/simulation/phagocytosis.ts` |
| ControlPanel | 模拟控制面板 | `src/components/ControlPanel.tsx` |
| CarDesigner | CAR-M设计面板 | `src/components/CarDesigner.tsx` |
| Dashboard | 数据仪表板 | `src/components/Dashboard.tsx` |
| MetricCard | 指标卡片 | `src/components/MetricCard.tsx` |
| CellLegend | 细胞图例 | `src/components/CellLegend.tsx` |
| TimelineChart | 时间序列图表 | `src/components/TimelineChart.tsx` |
| HeroSection | 首屏展示 | `src/sections/HeroSection.tsx` |
| SimSection | 模拟工作台 | `src/sections/SimSection.tsx` |
| ScienceSection | 科学背景 | `src/sections/ScienceSection.tsx` |
| ClinicalSection | 临床数据 | `src/sections/ClinicalSection.tsx` |
| TechSection | 技术栈 | `src/sections/TechSection.tsx` |

## 动画实现方案

| 动画 | 库/方案 | 实现方式 | 复杂度 |
|------|---------|---------|--------|
| 细胞运动 | Canvas 2D | requestAnimationFrame + 速度向量 | Low |
| 吞噬动画 | Canvas 2D | 缩放+透明度渐变过渡 | Medium |
| 极化转换 | Canvas 2D | 颜色渐变过渡（红↔青） | Low |
| 细胞因子扩散 | Canvas 2D | 径向渐变+淡入淡出 | Medium |
| 面板切换 | CSS | opacity + translateX 过渡 | Low |
| 数值计数 | CSS | CSS counter animation | Low |
| 图表绘制 | Chart.js | 实时数据点追加 | Medium |
| 滚动触发 | Intersection Observer | 淡入+translateY | Low |
| 粒子背景 | Canvas 2D | 背景细胞碎片飘动 | Medium |

## 状态管理

```typescript
// 全局状态接口
interface AppState {
  // 模拟状态
  simulation: {
    isRunning: boolean;
    isPaused: boolean;
    speed: number;        // 1x, 2x, 5x
    stepCount: number;
    time: number;         // 模拟时间（分钟）
  };
  
  // CAR-M设计参数
  carDesign: {
    signalingDomain: 'CD3ζ' | 'FcRγ' | 'CD147' | 'MerTK';
    targetAntigen: 'HER2' | 'CD19' | 'EGFR';
    affinity: number;     // 0-10
    checkpointBlockade: {
      CD47_SIRPa: boolean;
      CD24_Siglec10: boolean;
    };
  };
  
  // 模拟参数
  simParams: {
    carMCount: number;
    wildTypeCount: number;
    tumorCount: number;
    cd8Count: number;
    oxygenLevel: number;
    lactateLevel: number;
    tgfBetaLevel: number;
    randomSeed: number;   // 可复现实验随机种子
  };
  
  // 统计数据（用于图表）
  statistics: {
    tumorVolume: number[];
    phagocytosisRate: number[];
    m1Ratio: number[];
    m2Ratio: number[];
    cd8Infiltration: number[];
    carMPersistence: number[];
  };
  
  // 对比实验
  experiments: Experiment[];
}
```

## 模拟引擎架构

### 细胞类型系统
```typescript
abstract class Cell {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  
  abstract update(deltaTime: number, environment: TME): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}

class CarMacrophage extends Cell {
  polarization: 'M1' | 'M2' | 'mixed';  // 极化状态
  carExpression: number;                 // CAR表达水平
  energy: number;                        // 代谢能量
  phagocytosisTargets: TumorCell[];     // 吞噬目标
  
  update(dt: number, env: TME): void {
    // 1. 感知局部微环境（细胞因子浓度、氧水平）
    // 2. 更新极化状态（基于ODE简化模型）
    // 3. 趋化运动（向肿瘤/细胞因子梯度移动）
    // 4. 检测吞噬目标（距离+概率）
    // 5. 执行吞噬（如有目标）
    // 6. 分泌细胞因子
    // 7. 能量代谢
  }
}

class TumorCell extends Cell {
  cd47Expression: number;    // CD47表达（"别吃我"信号）
  cd24Expression: number;    // CD24表达（二级"别吃我"信号）
  her2Expression: number;    // HER2表达
  cd19Expression: number;    // CD19表达
  egfrExpression: number;    // EGFR表达
  viability: number;         // 存活状态
  
  update(dt: number, env: TME): void {
    // 1. 增殖（概率基于营养条件）
    // 2. 分泌免疫抑制因子
    // 3. 检查被吞噬状态
  }
}
```

### 主循环
```
Engine.loop:
  1. 更新扩散场（细胞因子、氧气、乳酸）
  2. 对每个Agent：
     a. 感知环境（采样局部场值）
     b. 决策（极化、运动方向、行为）
     c. 执行（移动、吞噬、分泌）
  3. 碰撞检测与响应
  4. 收集统计数据
  5. 渲染帧
  6. requestAnimationFrame
```

### 极化模型（简化ODE）
基于需求文档中提到的ODE模型，实现简化版本：
- 输入：IFN-γ、IL-4、IL-10、TGF-β、LPS局部浓度
- 输出：M1_score, M2_score ∈ [0, 1]
- 状态更新：ds/dt = f(信号输入) - decay
- 可视化：颜色在红色（M1）和青色（M2）之间插值

### 吞噬模型
- 基础概率：P_base = f(CAR亲和力, 靶抗原密度)
- 检查点修正：P = P_base × (1 - SIRPa_signal) × CD47_blockade_factor
- 距离阈值：d < R_macro + R_tumor + reach
- 执行时间：2-3秒（FcγR-like）或 10-25秒（CR3-like）

## 依赖

```json
{
  "chart.js": "^4.4",
  "react-chartjs-2": "^5.2",
  "lucide-react": "^0.400",
  "uuid": "^9.0"
}
```

## 性能考量

- 目标细胞数量：100-500个（Canvas 2D流畅）
- 使用空间哈希加速邻居查询
- 扩散场使用低分辨率网格（50×50）
- 统计数据每10帧采样一次
- 使用offscreen Canvas预渲染静态背景

## 颜色系统

```css
/* 主题色 */
--bg-primary: #0a0f1a;
--bg-panel: rgba(15, 23, 42, 0.85);
--border-glow: rgba(0, 204, 255, 0.2);

/* 细胞颜色 */
--car-m-cell: #00ff88;
--m1-macrophage: #ff3366;
--m2-macrophage: #00ccff;
--tumor-cell: #cc66ff;
--cd8-t-cell: #ffcc00;
--wildtype-macrophage: #8899aa;

/* 功能色 */
--accent-primary: #00ccff;
--accent-success: #00ff88;
--accent-warning: #ffcc00;
--accent-danger: #ff3366;
```
