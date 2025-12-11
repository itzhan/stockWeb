import prisma from "@/lib/prisma";
import { parseUserAuth } from "./userAuth";

export const hasActiveMembership = (expiresAt: Date | null | undefined) => {
  if (!expiresAt) return false;
  return expiresAt.getTime() > Date.now();
};

export const buildUserProfile = (user: {
  id: number;
  username: string;
  role: string;
  createdAt: Date;
  membershipExpiresAt: Date | null;
}) => {
  const active = hasActiveMembership(user.membershipExpiresAt);
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    membershipExpiresAt: user.membershipExpiresAt
      ? user.membershipExpiresAt.toISOString()
      : null,
    hasMembership: active,
  };
};

export const requireUser = async (request: Request) => {
  const payload = parseUserAuth(request);
  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
  });
  if (!user) {
    throw new Error("用户不存在");
  }
  return user;
};

export const requireMembership = async (request: Request) => {
  const user = await requireUser(request);
  if (!hasActiveMembership(user.membershipExpiresAt)) {
    throw new Error("会员已过期或不存在");
  }
  return user;
};
