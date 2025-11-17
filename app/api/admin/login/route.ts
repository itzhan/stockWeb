import { NextResponse } from "next/server";
import { createAdminToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json().catch(() => ({}));
  const adminUser = process.env.ADMIN_USER ?? "admin";
  const adminPass = process.env.ADMIN_PASS ?? "secret123";

  if (username === adminUser && password === adminPass) {
    const token = createAdminToken();
    return NextResponse.json({ success: true, token });
  }

  return NextResponse.json(
    { success: false, message: "用户名或密码错误" },
    { status: 401 }
  );
}
