import { NextResponse } from "next/server";
import { refreshRemoteRecords } from "../service";
import { requireMembership } from "@/lib/userSession";
import { requireAdminAuth } from "@/lib/auth";

export async function POST(request: Request) {
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
  try {
    const count = await refreshRemoteRecords();
    return NextResponse.json({
      success: true,
      count,
      timestamp: new Date().toISOString(),
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
