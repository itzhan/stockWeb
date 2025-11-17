import { NextResponse } from "next/server";
import { refreshRemoteRecords } from "../service";

export async function POST() {
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
