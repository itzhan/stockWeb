#!/bin/sh
set -e

./scripts/generate-env.sh

npm run prisma:push

node ./scripts/cron.mjs &
CRON_PID=$!
trap "kill $CRON_PID" EXIT

npm run start
