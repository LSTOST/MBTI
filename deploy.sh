#!/bin/bash
set -e

cd /www/wwwroot/peibupei.kyx123.com

echo "📦 拉取最新代码..."
git pull origin main

echo "🔧 安装依赖..."
npm install --omit=dev

echo "🏗️  构建项目..."
npm run build

echo "🔄 重启服务..."
pm2 restart all

echo "✅ 部署完成！"
