import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  formatDateKey,
  mapIndexData,
  normalizeTradeDate,
} from "./service";
import { requireMembership } from "@/lib/userSession";
import { requireAdminAuth } from "@/lib/auth";
import type { RecordCategory } from "./service";

const normalizeCategory = (value: string | null): RecordCategory =>
  value === "theme" ? "theme" : "industry";

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

  const records = effectiveDate
    ? await prisma.indexData.findMany({
        where: {
          category,
          tradeDate: {
            gte: effectiveDate,
            lt: new Date(effectiveDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { indexName: "asc" },
      })
    : [];

  const latestUpdate = await prisma.indexData.findFirst({
    where: { category },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const response = {
    data: records.map(mapIndexData),
    availableDates,
    currentDate: effectiveDate ? formatDateKey(effectiveDate) : null,
    lastFetchAt: latestUpdate?.updatedAt?.toISOString() ?? null,
    category,
  };

  return NextResponse.json(response);
}
