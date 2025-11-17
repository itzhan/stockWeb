import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  formatDateKey,
  mapIndexData,
  normalizeTradeDate,
} from "./service";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get("date");
  const normalizedDate =
    dateParam && !Number.isNaN(Date.parse(dateParam))
      ? normalizeTradeDate(dateParam)
      : null;

  const groupedDates = (await prisma.indexData.groupBy({
    by: ["tradeDate"],
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
          tradeDate: {
            gte: effectiveDate,
            lt: new Date(effectiveDate.getTime() + 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { indexName: "asc" },
      })
    : [];

  const latestUpdate = await prisma.indexData.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const response = {
    data: records.map(mapIndexData),
    availableDates,
    currentDate: effectiveDate ? formatDateKey(effectiveDate) : null,
    lastFetchAt: latestUpdate?.updatedAt?.toISOString() ?? null,
  };

  return NextResponse.json(response);
}
