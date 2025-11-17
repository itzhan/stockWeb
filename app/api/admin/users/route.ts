import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";

const parseBody = async (request: Request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

export async function GET(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const { username, email, role } = await parseBody(request);
  if (!username) {
    return NextResponse.json(
      { message: "用户名为必填项" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email: email ?? null,
        role: role ?? "viewer",
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("创建用户失败：", error);
    return NextResponse.json(
      { message: "创建用户失败，请检查用户名是否已存在" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const { id, username, email, role } = await parseBody(request);
  if (!id) {
    return NextResponse.json({ message: "用户 ID 不存在" }, { status: 400 });
  }
  if (!username || !role) {
    return NextResponse.json(
      { message: "用户名与角色为必填项" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        username,
        email: email ?? null,
        role,
      },
    });
    return NextResponse.json(user);
  } catch (error) {
    console.error("更新用户失败：", error);
    return NextResponse.json(
      { message: "更新用户失败，可能是用户名重复" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdminAuth(request);
  } catch (error) {
    return NextResponse.json(
      { message: "未授权" },
      { status: 401 }
    );
  }
  const { id } = await parseBody(request);
  if (!id) {
    return NextResponse.json({ message: "用户 ID 不存在" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除用户失败：", error);
    return NextResponse.json(
      { message: "删除用户失败" },
      { status: 500 }
    );
  }
}
