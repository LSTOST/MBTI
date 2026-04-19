#!/bin/bash
set -e

# 始终在仓库根目录（本脚本所在目录）执行，与当前工作目录无关
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Next/Prisma 与 deploy 共用 DATABASE_URL。
# Shell 脚本默认不会读取 PM2 内的环境变量：若仅用 ecosystem 注入、磁盘上无 .env，
# 请先执行： export DATABASE_URL='postgresql://…' ; ./deploy.sh
load_apps_web_env() {
  local f
  for f in apps/web/.env.production.local apps/web/.env.production apps/web/.env.local apps/web/.env; do
    if [ -f "$f" ]; then
      echo "📎 载入数据库连接等环境变量: $f"
      set -a
      # shellcheck disable=SC1090
      . "$f"
      set +a
      return 0
    fi
  done
  return 1
}

echo "📦 拉取最新代码..."
git pull origin main

load_apps_web_env || true

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ DATABASE_URL 未设置：db push 会退回 prisma.config 里的本地默认地址，极易改错库且线上仍缺列。"
  echo "   任选其一：在 apps/web 放置 .env / .env.production（含 DATABASE_URL），或在执行本脚本前 export DATABASE_URL。"
  exit 1
fi

echo "🔧 安装依赖（含 devDependencies：Next 构建需要 Tailwind / TS / ESLint 等）..."
npm --prefix apps/web install

echo "🗄️  同步数据库结构（与 prisma/schema.prisma 对齐）..."
npm --prefix apps/web run db:push

echo "🗄️  补齐 Report.testId 列（幂等；防止历史库缺列）..."
npm --prefix apps/web run db:sql:report-testid

echo "🏗️  构建项目..."
npm run build

echo "🧹 移除 devDependencies（运行时不需要，缩小 node_modules）..."
npm --prefix apps/web prune --omit=dev

echo "🔄 重启服务..."
pm2 restart all

echo "✅ 部署完成！"
