#!/bin/bash

# Cloudflare Turnstile 快速配置脚本

echo "================================================"
echo "  Cloudflare Turnstile 快速配置"
echo "================================================"
echo ""

# 获取 Site Key
echo "请输入你的 Cloudflare Turnstile Site Key:"
read -r SITE_KEY

if [ -z "$SITE_KEY" ]; then
    echo "❌ Site Key 不能为空"
    exit 1
fi

# 获取 Secret Key
echo ""
echo "请输入你的 Cloudflare Turnstile Secret Key:"
read -r SECRET_KEY

if [ -z "$SECRET_KEY" ]; then
    echo "❌ Secret Key 不能为空"
    exit 1
fi

echo ""
echo "🔧 开始配置..."

# 备份原文件
cp views/user.js views/user.js.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ 已备份 user.js"

# 替换 Site Key
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/YOUR_SITE_KEY/$SITE_KEY/g" views/user.js
else
    # Linux
    sed -i "s/YOUR_SITE_KEY/$SITE_KEY/g" views/user.js
fi

echo "✅ 已配置 Site Key"

# 配置 Secret Key 到 docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    # 检查是否已有 TURNSTILE_SECRET_KEY
    if grep -q "TURNSTILE_SECRET_KEY" docker-compose.yml; then
        echo "⚠️  docker-compose.yml 中已存在 TURNSTILE_SECRET_KEY，跳过..."
    else
        # 在 environment 部分添加
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "/environment:/a\\
      - TURNSTILE_SECRET_KEY=$SECRET_KEY
" docker-compose.yml
        else
            sed -i "/environment:/a\      - TURNSTILE_SECRET_KEY=$SECRET_KEY" docker-compose.yml
        fi
        echo "✅ 已添加 Secret Key 到 docker-compose.yml"
    fi
fi

# 或者创建 .env 文件
echo ""
echo "TURNSTILE_SECRET_KEY=$SECRET_KEY" >> .env
echo "✅ 已添加 Secret Key 到 .env 文件"

echo ""
echo "================================================"
echo "  ✨ 配置完成！"
echo "================================================"
echo ""
echo "下一步："
echo "1. 重新启动服务："
echo "   docker-compose down && docker-compose up -d --build"
echo ""
echo "2. 访问注册页面测试人机验证功能"
echo ""
echo "如有问题，请查看: TURNSTILE-SETUP.md"
echo ""
