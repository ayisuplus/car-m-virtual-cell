#!/bin/bash
# ============================================================
# CAR-M Simulator - 阿里云 ECS 一键部署脚本
# 服务器要求：2核2G，CentOS/Ubuntu
# ============================================================

set -e

# 配置区（请修改为你的服务器信息）
SERVER_IP="${1:-your-server-ip}"  # 服务器IP
SERVER_USER="${2:-root}"          # SSH用户名
SSH_KEY="${3:-~/.ssh/id_rsa}"     # SSH密钥路径
DEPLOY_DIR="/var/www/car-m-virtual-cell"  # 部署目录

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================================
# 步骤1：检查本地环境
# ============================================================
echo_info "检查本地环境..."

if [ ! -d "app/dist" ]; then
    echo_error "app/dist 目录不存在，请先运行 npm run build"
    exit 1
fi

if [ ! -f "app/dist/index.html" ]; then
    echo_error "app/dist/index.html 不存在，构建可能失败"
    exit 1
fi

echo_info "✅ 本地环境检查通过"

# ============================================================
# 步骤2：压缩3D模型（如果未压缩）
# ============================================================
echo_info "压缩3D模型文件..."

cd app/public/models
for f in *.glb; do
    if [ ! -f "${f}.gz" ]; then
        echo_info "  压缩 $f..."
        gzip -k -9 "$f"
    fi
done
cd ../../..
echo_info "✅ 3D模型压缩完成"

# ============================================================
# 步骤3：准备部署包
# ============================================================
echo_info "准备部署包..."

DEPLOY_PACKAGE="car-m-virtual-cell-deploy.tar.gz"
tar -czf "$DEPLOY_PACKAGE" \
    -C app/dist \
    --exclude='*.map' \
    .

# 添加压缩后的3D模型
tar -rf "${DEPLOY_PACKAGE%.tar.gz}.tar" \
    -C app/public/models \
    $(ls app/public/models/*.glb.gz 2>/dev/null | xargs -n1 basename | tr '\n' ' ') \
    2>/dev/null || true

# 重新压缩
gzip -f "${DEPLOY_PACKAGE%.tar.gz}.tar"

echo_info "✅ 部署包已创建: $(ls -lh "$DEPLOY_PACKAGE" | awk '{print $5}')"

# ============================================================
# 步骤4：上传到服务器
# ============================================================
echo_info "上传到服务器 ${SERVER_IP}..."

# 创建远程目录
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_IP}" \
    "mkdir -p ${DEPLOY_DIR}/dist ${DEPLOY_DIR}/backup" 2>/dev/null || {
    echo_error "无法连接到服务器，请检查SSH配置"
    echo_warn "手动连接命令: ssh ${SERVER_USER}@${SERVER_IP}"
    echo_warn "然后运行此脚本"
    exit 1
}

# 备份旧版本
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_IP}" \
    "cd ${DEPLOY_DIR}/dist && tar -czf ../backup/backup-\$(date +%Y%m%d-%H%M%S).tar.gz . 2>/dev/null || true"

# 上传新版本
scp -i "$SSH_KEY" "$DEPLOY_PACKAGE" "${SERVER_USER}@${SERVER_IP}:${DEPLOY_DIR}/"

echo_info "✅ 文件上传完成"

# ============================================================
# 步骤5：解压并配置
# ============================================================
echo_info "在服务器上解压并配置..."

ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_IP}" << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

DEPLOY_DIR="/var/www/car-m-virtual-cell"
cd "$DEPLOY_DIR"

# 解压新版本
echo "解压部署包..."
tar -xzf car-m-virtual-cell-deploy.tar.gz -C dist
rm -f car-m-virtual-cell-deploy.tar.gz

# 移动压缩的3D模型到正确位置
if ls *.glb.gz 1> /dev/null 2>&1; then
    mkdir -p dist/models
    mv *.glb.gz dist/models/
    echo "3D模型已部署"
fi

# 设置权限
chmod -R 755 dist/
chown -R nginx:nginx dist/ 2>/dev/null || chown -R www-data:www-data dist/ 2>/dev/null || true

echo "✅ 文件解压完成"
REMOTE_SCRIPT

echo_info "✅ 服务器配置完成"

# ============================================================
# 步骤6：配置Nginx
# ============================================================
echo_info "配置Nginx..."

# 生成Nginx配置
cat > /tmp/car-m-virtual-cell-nginx.conf << 'NGINX_CONFIG'
server {
    listen 80;
    server_name _;  # 替换为你的域名
    
    root /var/www/car-m-virtual-cell/dist;
    index index.html;
    
    # 启用gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/xml+rss
        image/svg+xml;
    
    # 3D模型文件配置
    location ~* \.glb$ {
        # 优先服务压缩版本
        gzip_static on;
        
        # 缓存7天
        expires 7d;
        add_header Cache-Control "public, immutable";
        
        # CORS headers（Three.js需要）
        add_header Access-Control-Allow-Origin "*";
        add_header Access-Control-Allow-Methods "GET, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type";
        
        # 正确的MIME类型
        default_type model/gltf-binary;
    }
    
    # 静态资源配置
    location /assets/ {
        # 缓存1年（带hash）
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 图片配置
    location ~* \.(jpg|jpeg|png|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # HTML文件（不缓存）
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
    
    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}
NGINX_CONFIG

# 上传Nginx配置
scp -i "$SSH_KEY" /tmp/car-m-virtual-cell-nginx.conf \
    "${SERVER_USER}@${SERVER_IP}:/etc/nginx/sites-available/car-m-virtual-cell" 2>/dev/null \
|| scp -i "$SSH_KEY" /tmp/car-m-virtual-cell-nginx.conf \
    "${SERVER_USER}@${SERVER_IP}:/etc/nginx/conf.d/car-m-virtual-cell.conf"

# 创建符号链接（Ubuntu）
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_IP}" \
    "ln -sf /etc/nginx/sites-available/car-m-virtual-cell /etc/nginx/sites-enabled/ 2>/dev/null || true"

# 测试并重载Nginx
ssh -i "$SSH_KEY" "${SERVER_USER}@${SERVER_IP}" \
    "nginx -t && systemctl reload nginx"

echo_info "✅ Nginx配置完成"

# ============================================================
# 步骤7：验证部署
# ============================================================
echo_info "验证部署..."

# 等待Nginx重载
sleep 2

# 测试HTTP访问
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_IP}/" 2>/dev/null || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo_info "✅ 部署成功！"
    echo ""
    echo_info "访问地址: http://${SERVER_IP}"
    echo_info "3D模型加载测试: http://${SERVER_IP}/models/dna-helix.glb.gz"
    echo ""
    echo_warn "如果3D模型无法加载，请检查防火墙规则："
    echo_warn "  - 开放80端口"
    echo_warn "  - 如果使用阿里云安全组，确保80端口已开放"
else
    echo_warn "HTTP状态码: $HTTP_STATUS"
    echo_warn "可能需要等待几秒钟，或检查服务器防火墙"
fi

# ============================================================
# 完成
# ============================================================
echo ""
echo_info "=========================================="
echo_info "  部署完成！"
echo_info "=========================================="
echo_info ""
echo_info "下一步："
echo_info "1. 访问 http://${SERVER_IP} 验证网站"
echo_info "2. 测试3D模型加载"
echo_info "3. 配置域名（可选）"
echo_info "4. 配置HTTPS（推荐）"
echo_info ""
echo_info "常用命令："
echo_info "  查看日志: ssh ${SERVER_USER}@${SERVER_IP} 'tail -f /var/log/nginx/error.log'"
echo_info "  重启Nginx: ssh ${SERVER_USER}@${SERVER_IP} 'systemctl restart nginx'"
echo_info ""
