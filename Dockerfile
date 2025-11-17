FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
RUN npm install

COPY . .

RUN npm run prisma:generate
RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["sh", "./scripts/start-with-cron.sh"]
