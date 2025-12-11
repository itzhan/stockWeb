import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildUserProfile, requireUser } from "@/lib/userSession";
import type { PrismaClient } from "@prisma/client";

type TxClient = Pick<PrismaClient, "activationCode" | "user">;

export async function POST(request: Request) {
  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ message: "请输入激活码" }, { status: 400 });
  }
  let user;
  try {
    user = await requireUser(request);
  } catch (error) {
    return NextResponse.json(
      { message: (error as Error).message || "未登录" },
      { status: 401 }
    );
  }

  const trimmedCode = code.trim().toUpperCase();
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx: TxClient) => {
      const activation = await tx.activationCode.findUnique({
        where: { code: trimmedCode },
      });
      if (!activation) {
        throw new Error("激活码不存在");
      }
      if (activation.used) {
        throw new Error("激活码已被使用");
      }
      if (activation.expiresAt && activation.expiresAt < now) {
        throw new Error("激活码已过期");
      }

      const baseTime =
        user.membershipExpiresAt && user.membershipExpiresAt > now
          ? user.membershipExpiresAt
          : now;
      const newExpire = new Date(
        baseTime.getTime() + activation.durationDays * 24 * 60 * 60 * 1000
      );

      await tx.activationCode.update({
        where: { id: activation.id },
        data: {
          used: true,
          usedAt: now,
          usedById: user.id,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          membershipExpiresAt: newExpire,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      message: "激活成功",
      profile: buildUserProfile(result),
    });
  } catch (error) {
    console.error("兑换激活码失败", error);
    return NextResponse.json(
      { message: (error as Error).message || "兑换失败" },
      { status: 400 }
    );
  }
}
