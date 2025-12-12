import { NextResponse } from "next/server";
import { fetchRemoteRecords, refreshRemoteRecords } from "../service";
import { requireMembership } from "@/lib/userSession";
import { requireAdminAuth } from "@/lib/auth";

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
    if (isAdmin) {
      const count = await refreshRemoteRecords();
      return NextResponse.json({
        success: true,
        count,
        timestamp: new Date().toISOString(),
        stored: true,
      });
    }

    const data = await fetchRemoteRecords();
    return NextResponse.json({
      success: true,
      data,
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
