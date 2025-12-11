import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/auth";
import { randomBytes } from "node:crypto";

const generateCode = () =>
  randomBytes(8)
    .toString("hex")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 16);

export async function GET(request: Request) {
  try {
    requireAdminAuth(request);
  } catch {
    return NextResponse.json({ message: "未授权" }, { status: 401 });
  }
  const codes = await prisma.activationCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      usedBy: {
        select: { id: true, username: true },
      },
    },
  });
  return NextResponse.json(codes);
}

export async function POST(request: Request) {
  try {
    requireAdminAuth(request);
  } catch {
    return NextResponse.json({ message: "未授权" }, { status: 401 });
  }
  const { count = 1, durationDays, note, expiresAt } = await request.json();
  const countInt = Math.max(1, Math.min(Number(count) || 1, 200));
  if (!durationDays || durationDays <= 0) {
    return NextResponse.json(
      { message: "有效天数必须大于 0" },
      { status: 400 }
    );
  }

  const codes: { code: string; durationDays: number; note?: string | null; expiresAt?: Date | null }[] = [];
  const seen = new Set<string>();
  while (codes.length < countInt) {
    const code = generateCode();
    if (seen.has(code)) continue;
    seen.add(code);
    codes.push({
      code,
      durationDays,
      note: note ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    });
  }

  try {
    const created = await prisma.activationCode.createMany({
      data: codes,
    });
    return NextResponse.json({
      created: created.count,
      codes: codes.map((item) => item.code),
    });
  } catch (error) {
    console.error("生成激活码失败", error);
    return NextResponse.json(
      { message: "生成失败，请重试" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    requireAdminAuth(request);
  } catch {
    return NextResponse.json({ message: "未授权" }, { status: 401 });
  }
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ message: "缺少 ID" }, { status: 400 });
  }
  try {
    await prisma.activationCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除激活码失败", error);
    return NextResponse.json(
      { message: "删除失败，可能已被使用或不存在" },
      { status: 500 }
    );
  }
}
