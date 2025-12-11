import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildUserProfile, requireUser } from "@/lib/userSession";
import { verifyAdminToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!fresh) {
      throw new Error("用户不存在");
    }
    return NextResponse.json(buildUserProfile(fresh));
  } catch (error) {
    // 尝试管理员 token
    try {
      const auth = request.headers.get("authorization");
      if (!auth) throw new Error("未授权");
      const [scheme, token] = auth.trim().split(/\s+/);
      if (scheme?.toLowerCase() !== "bearer" || !token) {
        throw new Error("未授权");
      }
      const adminPayload = verifyAdminToken(token);
      return NextResponse.json({
        id: -1,
        username: "admin",
        role: adminPayload.role,
        createdAt: new Date(adminPayload.iat * 1000).toISOString(),
        membershipExpiresAt: null,
        hasMembership: true,
      });
    } catch {
      return NextResponse.json(
        { message: (error as Error).message || "未授权" },
        { status: 401 }
      );
    }
  }
}
