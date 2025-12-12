#!/bin/sh
set -e

cat <<EOF > .env.local
DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgrespwd@db:5432/stock?schema=public}
ADMIN_USER=${ADMIN_USER:-admin}
ADMIN_PASS=${ADMIN_PASS:-secret123}
APP_URL=${APP_URL:-http://localhost:3000}
REMOTE_API_URL=${REMOTE_API_URL:-https://mg.go-goal.cn/api/v1/ft_fin_app_etf_plate/indthmbro_stat?type=3%2C4&page=1&rows=1000&order=price_change_rate&order_type=1}
REMOTE_THEME_API_URL=${REMOTE_THEME_API_URL:-https://mg.go-goal.cn/api/v1/ft_fin_app_etf_plate/indthmbro_stat?type=1&page=1&rows=1000&order=price_change_rate&order_type=1}
EOF
