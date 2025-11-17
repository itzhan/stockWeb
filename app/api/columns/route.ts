import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const columns = await prisma.columnName.findMany({
    orderBy: [{ displayOrder: "asc" }, { key: "asc" }],
  });
  return NextResponse.json(columns);
}
