import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createUserToken, hashPassword } from "@/lib/userAuth";
import { buildUserProfile } from "@/lib/userSession";

export async function POST(request: Request) {
  const { username, password, confirmPassword, email } = await request.json();
  if (!username || !password || !confirmPassword) {
    return NextResponse.json(
      { message: "用户名与密码为必填项" },
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    return NextResponse.json({ message: "两次输入的密码不一致" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ message: "密码长度至少 6 位" }, { status: 400 });
  }
  try {
    const { salt, hash } = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email: email ?? null,
        passwordHash: hash,
        passwordSalt: salt,
        role: "viewer",
      },
    });
    const token = createUserToken({
      uid: user.id,
      username: user.username,
      role: user.role,
    });
    return NextResponse.json({
      token,
      profile: buildUserProfile(user),
    });
  } catch (error) {
    console.error("注册失败", error);
    return NextResponse.json(
      { message: "注册失败，可能是用户名已存在" },
      { status: 500 }
    );
  }
}
