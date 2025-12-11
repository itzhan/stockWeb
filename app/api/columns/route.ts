import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireMembership } from "@/lib/userSession";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(request: Request) {
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
  const columns = await prisma.columnName.findMany({
    orderBy: [{ displayOrder: "asc" }, { key: "asc" }],
  });
  return NextResponse.json(columns);
}
