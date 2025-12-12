import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    await prisma.user.create({
      data: {
        username: "demo_user",
        role: "viewer",
      },
    });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const columns = await prisma.columnName.findMany({
    orderBy: { key: "asc" },
  });

  const totalRecords = await prisma.indexData.count();

  const latestTrade = await prisma.indexData.findFirst({
    orderBy: { tradeDate: "desc" },
    select: { tradeDate: true },
  });

  const industryRecords = await prisma.indexData.count({
    where: { category: "industry" },
  });
  const themeRecords = await prisma.indexData.count({
    where: { category: "theme" },
  });

  return NextResponse.json({
    users,
    columns,
    stats: {
      totalRecords,
      lastTradeDate: latestTrade?.tradeDate.toISOString() ?? null,
      industryRecords,
      themeRecords,
    },
  });
}
