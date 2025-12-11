import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createUserToken, verifyPassword } from "@/lib/userAuth";
import { buildUserProfile } from "@/lib/userSession";
import { createAdminToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();
  if (!username || !password) {
    return NextResponse.json(
      { message: "用户名与密码为必填项" },
      { status: 400 }
    );
  }

  // 管理员直登：使用 ENV 中的 ADMIN_USER / ADMIN_PASS
  const adminUser = process.env.ADMIN_USER ?? "admin";
  const adminPass = process.env.ADMIN_PASS ?? "admin";
  if (username === adminUser && password === adminPass) {
    const token = createAdminToken();
    return NextResponse.json({
      token,
      profile: {
        id: -1,
        username: adminUser,
        role: "admin",
        createdAt: new Date().toISOString(),
        membershipExpiresAt: null,
        hasMembership: true,
      },
    });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.passwordHash || !user.passwordSalt) {
    return NextResponse.json({ message: "账号或密码错误" }, { status: 400 });
  }
  const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ message: "账号或密码错误" }, { status: 400 });
  }
  const token = createUserToken({
    uid: user.id,
    username: user.username,
    role: user.role,
  });
  return NextResponse.json({
    token,
    profile: buildUserProfile(user),
  });
}
