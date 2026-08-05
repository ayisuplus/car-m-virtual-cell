# CI/CD 配置指南

## 当前状态

| 工作流 | 文件 | 状态 |
|---|---|---|
| CI（构建验证） | `ci.yml` | ✅ 启用 |
| Cloudflare Pages 部署 | `deploy-cloudflare.yml` | ✅ 启用 |
| ECS 部署（旧方案） | `deploy.yml.disabled` | ⏸️ 弃用回退，保持禁用 |

> **说明**：本项目为纯静态 Vite + React SPA，托管于 Cloudflare Pages。**无需后端数据库**，工作流中没有任何数据库迁移或数据初始化步骤；持久化仅依赖浏览器 `localStorage`。

---

## CI 工作流 (`ci.yml`)

- **触发**：Push 到任意分支 / PR 到 main / 手动
- **执行**：TypeScript 类型检查 → ESLint → Vite 构建 → 产物完整性校验
- **产物**：构建输出上传为 artifact（保留 3 天）
- **无需任何 Secrets 配置**，开箱即用

---

## Cloudflare Pages 部署工作流 (`deploy-cloudflare.yml`)

### 触发条件

| 触发场景 | environment | 部署目标 |
|---|---|---|
| Push 到 `main` | `production` | 生产地址 `https://car-m-virtual-cell.pages.dev`，branch=`main` |
| PR 到 `main` | `preview` | 预览部署，branch=`pr-<编号>` |
| `workflow_dispatch` 手动触发（当前分支为 main） | `production` | 生产部署 |

**PR 预览**：每次 PR 到 main 都会触发一次预览部署，可在 Cloudflare Pages 仪表盘按分支找到对应预览地址，便于在合并前验证改动。

### 所需 Secrets

在仓库 **Settings → Secrets and variables → Actions** 中添加：

| Secret 名称 | 说明 | 权限要求 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | **最小权限**：Account → Cloudflare Pages → Edit |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | 只读，无特殊权限 |

### 创建 Cloudflare API Token

1. 登录 [Cloudflare 仪表盘](https://dash.cloudflare.com/) → 右上角头像 → **My Profile** → **API Tokens**。
2. 点击 **Create Token** → 选择 **Custom token**。
3. 权限配置：
   - **Permissions**: `Account` → `Cloudflare Pages` → `Edit`
4. **Account Resources**: 选择部署目标账户（Include → 你的账户）。
5. 创建后复制 Token，填入 GitHub Secret `CLOUDFLARE_API_TOKEN`。
6. `CLOUDFLARE_ACCOUNT_ID` 在仪表盘首页右侧栏可找到（账户 ID）。

### 工作流执行流程

1. Checkout
2. Setup Node.js（npm 缓存）
3. `npm ci` 安装依赖
4. `npm run build` 生产构建（vite 插件自动同步 `slides/` 到 `dist/slides/`）
5. 校验构建产物完整性（`dist/index.html`、`dist/slides/index.html`）
6. 生产部署（`--branch=main`）或预览部署（`--branch=pr-<编号>`）
7. 生产健康检查（仅生产部署）：`curl` 校验根路径与 `/slides/` 可访问

### 安全守卫

涉及 Secrets 的部署步骤带条件守卫：**fork 分支的 PR 不执行**部署，避免泄露 `CLOUDFLARE_API_TOKEN`。

### 回滚方式

- **Pages 仪表盘**：进入 Pages 项目 → **Deployments** 标签，选择历史部署，点击 `Rollback to this deployment` 即可回滚。
- **工作流手动回滚**：使用 `workflow_dispatch` 手动触发时，可通过 GitHub 的 **"Use workflow from"** 选择旧 SHA 分支来重新部署旧版本。

### 失败处理

- **产物校验失败**：若 `dist/index.html` 或 `dist/slides/index.html` 缺失，工作流直接报错退出，不会部署失效产物。
- **健康检查失败**：生产部署后若根路径或 `/slides/` 返回异常，工作流报错提示，需检查构建或部署配置。

### 缓存策略（`app/public/_headers`）

Cloudflare Pages 通过 `_headers` 文件配置缓存头：

| 路径 | Cache-Control | 说明 |
|---|---|---|
| `/assets/*` | `public, max-age=31536000, immutable` | 带内容哈希的构建产物，长期缓存 |
| `/models/*`、`/images/*` | `public, max-age=2592000` | 无内容哈希，短缓存避免更新后命中旧文件 |
| `/`、`/slides/*` | `no-cache` | 入口 HTML 与幻灯片始终重新校验 |

---

## 弃用回退方案：ECS 部署（`deploy.yml.disabled`）

> 此方案为阿里云 ECS + Nginx 的旧部署方式，当前**保持禁用**作为回退方案。若未来不再使用 Cloudflare Pages，可将 `deploy.yml.disabled` 重命名为 `deploy.yml` 并按以下配置启用。

<details>
<summary>展开查看 ECS 部署配置（保留备用）</summary>

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

- **触发**：Push 到 main / 手动
- **执行**：构建 → 压缩 3D 模型 → 上传服务器 → 备份旧版 → 解压部署 → 重载 Nginx → 健康检查

### 服务器前置要求

```bash
sudo apt install nginx -y           # Ubuntu/Debian
sudo mkdir -p /var/www/car-m-virtual-cell/{dist,backup}
```

</details>