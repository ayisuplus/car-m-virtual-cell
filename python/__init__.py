# -*- coding: utf-8 -*-
"""
CAR-M 虚拟细胞模拟器 —— Python TCGA 数据管线与 GNN 训练模块。

本包提供从 TCGA 数据构建 PPI 图、训练 GNN 模型并导出前端可消费 JSON
产物的完整管线。由于运行环境无法访问真实 TCGA 公共端点，数据管线默认
使用带生物学意义的合成数据模拟 TCGA 多组学格式；所有公共函数签名与
真实 TCGA 数据替换兼容（见各模块 docstring）。

模块清单：
- tcga_data_pipeline : 多组学数据获取与预处理（合成 / 真实 TCGA 兼容接口）
- graph_construction  : PPI 图构建（合成 STRING 高置信子网）
- gnn_train           : 两层多头 GAT 模型定义与 5 折 CV 训练
                        （纯 numpy 手写实现，含手动反向传播；
                        提供 torch_available() 探测与 torch 扩展点）
- export_frontend     : 导出前端可 fetch 的 JSON 产物
"""

__version__ = "1.0.0"