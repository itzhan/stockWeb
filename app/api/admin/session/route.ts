import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    requireAdminAuth(request);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "授权信息无效" },
      { status: 401 }
    );
  }
}
