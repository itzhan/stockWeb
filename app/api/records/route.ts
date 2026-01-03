import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  formatDateKey,
  mapIndexData,
  normalizeTradeDate,
  type IndexDataView,
} from "./service";
import { requireMembership } from "@/lib/userSession";
import { requireAdminAuth } from "@/lib/auth";
import type { RecordCategory } from "./service";

const normalizeCategory = (value: string | null): RecordCategory => {
  if (value === "theme") {
    return "theme";
  }
  if (value === "etf_index") {
    return "etf_index";
  }
  return "industry";
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeekMonday = (date: Date) => {
  const day = date.getDay(); // 0=Sun, 1=Mon...
  const diff = (day + 6) % 7; // Monday -> 0, Sunday -> 6
  return startOfDay(addDays(date, -diff));
};

const startOfMonth = (date: Date) =>
  startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));

const buildCumulativeSumsForSingleIndex = (
  records: { tradeDate: Date; etfNetPurRedeem: number | null }[],
) => {
  const resultById = new Map<number, { week: number | null; month: number | null }>();
  let runningWeek: number | null = null;
  let runningMonth: number | null = null;
  let currentWeekKey: string | null = null;
  let currentMonthKey: string | null = null;

  records.forEach((record, index) => {
    const date = startOfDay(record.tradeDate);
    const weekStart = startOfWeekMonday(date);
    const monthStart = startOfMonth(date);
    const weekKey = weekStart.toISOString();
    const monthKey = monthStart.toISOString();

    if (currentWeekKey !== weekKey) {
      currentWeekKey = weekKey;
      runningWeek = 0;
    }
    if (currentMonthKey !== monthKey) {
      currentMonthKey = monthKey;
      runningMonth = 0;
    }

    const daily = record.etfNetPurRedeem;
    if (daily === null || Number.isNaN(daily)) {
      resultById.set(index, { week: runningWeek, month: runningMonth });
      return;
    }

    runningWeek = (runningWeek ?? 0) + daily;
    runningMonth = (runningMonth ?? 0) + daily;
    resultById.set(index, { week: runningWeek, month: runningMonth });
  });

  return resultById;
};

export async function GET(request: NextRequest) {
  try {
    await requireMembership(request);
  } catch {
    try {
      requireAdminAuth(request);
    } catch (error) {
      return NextResponse.json(
        { message: (error as Error).message || "未授权" },
        { status: 401 }
      );
    }
  }

  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");
  const nameParamRaw = searchParams.get("name");
  const category = normalizeCategory(searchParams.get("category"));
  const normalizedDate =
    dateParam && !Number.isNaN(Date.parse(dateParam))
      ? normalizeTradeDate(dateParam)
      : null;

  const groupedDates = (await prisma.indexData.groupBy({
    by: ["tradeDate"],
    where: { category },
    orderBy: { tradeDate: "desc" },
  })) as { tradeDate: Date }[];

  const availableDates = groupedDates.map(({ tradeDate }) =>
    formatDateKey(tradeDate)
  );

  const effectiveDate =
    normalizedDate ??
    (groupedDates[0]?.tradeDate
      ? normalizeTradeDate(groupedDates[0].tradeDate.toISOString())
      : null);

  const nameParam = nameParamRaw?.trim() ?? "";

  // 搜索模式：根据名称（或代码）返回该指数所有历史数据
  if (nameParam) {
    const exactMatches = await prisma.indexData.findMany({
      where: {
        category,
        OR: [
          { indexName: { equals: nameParam } },
          { indexCode: { equals: nameParam } },
        ],
      },
      select: { indexCode: true, indexName: true },
      distinct: ["indexCode"],
      orderBy: { indexName: "asc" },
      take: 20,
    });

    const fallbackMatches =
      exactMatches.length > 0
        ? exactMatches
        : await prisma.indexData.findMany({
            where: {
              category,
              indexName: { contains: nameParam, mode: "insensitive" },
            },
            select: { indexCode: true, indexName: true },
            distinct: ["indexCode"],
            orderBy: { indexName: "asc" },
            take: 20,
          });

    if (fallbackMatches.length === 0) {
      return NextResponse.json(
        { message: "未找到匹配的名称，请确认输入是否正确" },
        { status: 400 },
      );
    }
    if (fallbackMatches.length > 1) {
      return NextResponse.json(
        {
          message:
            "匹配到多个名称，请输入更精确的名称（或直接输入指数代码）",
          candidates: fallbackMatches,
        },
        { status: 400 },
      );
    }

    const target = fallbackMatches[0];
    const allRecordsAsc = (await prisma.indexData.findMany({
      where: { category, indexCode: target.indexCode },
      orderBy: { tradeDate: "asc" },
      select: {
        id: true,
        category: true,
        indexCode: true,
        indexName: true,
        source: true,
        tradeDate: true,
        priceChangeRate: true,
        etfLatestScales: true,
        turnover: true,
        etfNetPurRedeem: true,
        etfNetPurRedeem1m: true,
        chgRateD5: true,
        chgRateM1: true,
        chgRateYear: true,
        peTtm: true,
        peTtmPercentY3: true,
        pb: true,
        pbPercentY3: true,
        dividendYieldRatio: true,
        capitalFlowW8: true,
      },
    })) as IndexDataView[];

    const cumByIndex = buildCumulativeSumsForSingleIndex(
      allRecordsAsc.map((r) => ({
        tradeDate: r.tradeDate,
        etfNetPurRedeem: r.etfNetPurRedeem,
      })),
    );

    const mapped = allRecordsAsc.map((record, idx) => {
      const base = mapIndexData(record);
      const cum = cumByIndex.get(idx) ?? { week: null, month: null };
      return {
        ...base,
        etf_net_pur_redeem1w: cum.week,
        etf_net_pur_redeem1m: cum.month,
      };
    });

    const latestUpdate = await prisma.indexData.findFirst({
      where: { category },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    return NextResponse.json({
      mode: "search",
      searchName: target.indexName,
      searchCode: target.indexCode,
      data: mapped.reverse(), // 默认按最新在前
      availableDates,
      currentDate: effectiveDate ? formatDateKey(effectiveDate) : null,
      lastFetchAt: latestUpdate?.updatedAt?.toISOString() ?? null,
      category,
    });
  }

  const records =
    effectiveDate
      ? ((await prisma.indexData.findMany({
          where: {
            category,
            tradeDate: {
              gte: effectiveDate,
              lt: new Date(effectiveDate.getTime() + 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { indexName: "asc" },
        })) as IndexDataView[])
      : [];

  // 计算：本周（周一~当日）与本月（1号~当日）的累计净申赎
  const effectiveDateEndExclusive = effectiveDate
    ? addDays(startOfDay(effectiveDate), 1)
    : null;
  const weekStart = effectiveDate ? startOfWeekMonday(effectiveDate) : null;
  const monthStart = effectiveDate ? startOfMonth(effectiveDate) : null;
  const indexCodes = records.map((r) => r.indexCode);

  const [weekAgg, monthAgg] =
    effectiveDate && indexCodes.length > 0 && effectiveDateEndExclusive
      ? await Promise.all([
          prisma.indexData.groupBy({
            by: ["indexCode"],
            where: {
              category,
              indexCode: { in: indexCodes },
              tradeDate: { gte: weekStart!, lt: effectiveDateEndExclusive },
            },
            _sum: { etfNetPurRedeem: true },
          }),
          prisma.indexData.groupBy({
            by: ["indexCode"],
            where: {
              category,
              indexCode: { in: indexCodes },
              tradeDate: { gte: monthStart!, lt: effectiveDateEndExclusive },
            },
            _sum: { etfNetPurRedeem: true },
          }),
        ])
      : [[], []];

  const weekSumByCode = new Map<string, number | null>();
  (weekAgg as { indexCode: string; _sum: { etfNetPurRedeem: number | null } }[]).forEach(
    (row) => {
      weekSumByCode.set(row.indexCode, row._sum.etfNetPurRedeem ?? null);
    },
  );
  const monthSumByCode = new Map<string, number | null>();
  (monthAgg as { indexCode: string; _sum: { etfNetPurRedeem: number | null } }[]).forEach(
    (row) => {
      monthSumByCode.set(row.indexCode, row._sum.etfNetPurRedeem ?? null);
    },
  );

  const latestUpdate = await prisma.indexData.findFirst({
    where: { category },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const response = {
    data: records.map((record) => {
      const base = mapIndexData(record);
      return {
        ...base,
        etf_net_pur_redeem1w: weekSumByCode.get(record.indexCode) ?? null,
        etf_net_pur_redeem1m: monthSumByCode.get(record.indexCode) ?? null,
      };
    }),
    availableDates,
    currentDate: effectiveDate ? formatDateKey(effectiveDate) : null,
    lastFetchAt: latestUpdate?.updatedAt?.toISOString() ?? null,
    category,
  };

  return NextResponse.json(response);
}
