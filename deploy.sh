#!/bin/bash
set -e

# 始终在仓库根目录（本脚本所在目录）执行，与当前工作目录无关
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📦 拉取最新代码..."
git pull origin main

echo "🔧 安装依赖..."
npm --prefix apps/web install --omit=dev

echo "🗄️  同步数据库结构（与 prisma/schema.prisma 对齐）..."
npm --prefix apps/web run db:push

echo "🏗️  构建项目..."
npm run build

echo "🔄 重启服务..."
pm2 restart all

echo "✅ 部署完成！"
