import { NextResponse } from "next/server";
import { fetchRemoteRecords, refreshRemoteRecords } from "../service";
import { requireMembership } from "@/lib/userSession";
import { requireAdminAuth } from "@/lib/auth";
import type { RecordCategory } from "../service";

const normalizeCategory = (value: string | null): RecordCategory => {
  if (value === "theme") {
    return "theme";
  }
  if (value === "etf_index") {
    return "etf_index";
  }
  return "industry";
};

export async function POST(request: Request) {
  let isAdmin = false;
  try {
    await requireMembership(request);
  } catch {
    try {
      requireAdminAuth(request);
      isAdmin = true;
    } catch (error) {
      return NextResponse.json(
        { message: (error as Error).message || "未授权" },
        { status: 401 }
      );
    }
  }
  try {
    const { searchParams } = new URL(request.url);
    const category = normalizeCategory(searchParams.get("category"));
    if (isAdmin) {
      const count = await refreshRemoteRecords();
      return NextResponse.json({
        success: true,
        count,
        timestamp: new Date().toISOString(),
        stored: true,
      });
    }

    const data = await fetchRemoteRecords(category);
    return NextResponse.json({
      success: true,
      data,
      category,
      count: data.length,
      timestamp: new Date().toISOString(),
      stored: false,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "刷新过程中发生错误";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
