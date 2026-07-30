# CI/CD 配置指南

## 当前状态

| 工作流 | 文件 | 状态 |
|---|---|---|
| CI（构建验证） | `ci.yml` | ✅ 启用 |
| Deploy（自动部署） | `deploy.yml.disabled` | ⏸️ 暂未启用 |

> **说明**：项目现阶段用于出国展示，暂不需要服务器自动部署。需要时，将 `deploy.yml.disabled` 重命名为 `deploy.yml` 并按下方配置 Secrets 即可启用。

---

## CI 工作流 (`ci.yml`)

- **触发**: Push 到任意分支 / PR 到 main / 手动
- **执行**: 类型检查 → ESLint → Vite 构建
- **产物**: 构建输出（保留 3 天）
- **无需任何 Secrets 配置**，开箱即用

---

## 启用自动部署（未来需要时）

### 1. 激活工作流

```bash
mv .github/workflows/deploy.yml.disabled .github/workflows/deploy.yml
```

### 2. 配置 GitHub Secrets

在仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret 名称 | 说明 | 示例 |
|---|---|---|
| `SSH_HOST` | 阿里云 ECS 公网 IP | `47.xx.xx.xx` |
| `SSH_PORT` | SSH 端口（默认 22） | `22` |
| `SSH_USERNAME` | SSH 登录用户名 | `root` |
| `SSH_PRIVATE_KEY` | SSH 私钥（PEM 格式） | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

### 3. 生成 SSH 密钥对（如还没有）

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/car_m_deploy
ssh-copy-id -i ~/.ssh/car_m_deploy.pub root@<服务器IP>
cat ~/.ssh/car_m_deploy   # 复制内容填入 GitHub Secret
```

### 可选 GitHub Variables

| Variable 名称 | 说明 | 默认值 |
|---|---|---|
| `DEPLOY_DIR` | 服务器部署目录 | `/var/www/car-m-virtual-cell` |
| `DOMAIN` | 域名（仅用于显示） | （使用 IP） |

### Deploy 工作流说明

- **触发**: Push 到 main / 手动
- **执行**: 构建 → 压缩 3D 模型 → 上传服务器 → 备份旧版 → 解压部署 → 重载 Nginx → 健康检查

### 服务器前置要求

```bash
sudo apt install nginx -y           # Ubuntu/Debian
sudo mkdir -p /var/www/car-m-virtual-cell/{dist,backup}
```
