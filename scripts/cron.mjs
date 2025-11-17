import cron from "node-cron";

const APP_URL =
  (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const REFRESH_ENDPOINT = `${APP_URL}/api/records/refresh`;

const runRefresh = async () => {
  try {
    const response = await fetch(REFRESH_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[cron] 拉取失败 (${response.status}): ${errorText || "未知错误"}`
      );
      return;
    }
    const payload = await response.json();
    console.log(
      `[cron] 数据刷新完成，新增/更新条数：${payload.count ?? 0}，时间：${payload.timestamp}`
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error("[cron] 请求失败:", error.message);
    } else {
      console.error("[cron] 请求失败:", error);
    }
  }
};

const job = cron.schedule(
  "32 8 * * *",
  () => {
    console.log(`[cron] 触发定时刷新 ${new Date().toISOString()}`);
    runRefresh();
  },
  {
    timezone: "Asia/Shanghai",
  }
);

job.start();

const shutdown = () => {
  job.stop();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
