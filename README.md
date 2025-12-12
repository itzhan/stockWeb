## 股票学习 - ETF 行业/主题洞察

本项目展示 ETF **行业/主题** 两类指数的资金流向与估值。

### 关键功能

- 顶部可切换 `行业 / 主题`
- 数据按 `tradeDate` 归档，可按日期筛选
- 管理员可触发入库刷新（会写入数据库）

### 环境变量

在 `.env.local` 中配置：

- `DATABASE_URL`: Postgres 连接串
- `REMOTE_API_URL`: 行业接口（默认 `type=3,4`）
- `REMOTE_THEME_API_URL`: 主题接口（默认 `type=1`）

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 数据库迁移/同步

本次新增了 `IndexData.category`（区分 `industry/theme`），并将唯一键调整为 `(indexCode, tradeDate, category)`。

- 如果你用 `prisma db push`：直接执行 `pnpm prisma:push`
- 如果你用 migrations：请执行 `pnpm prisma:migrate`（按你现有流程）

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
