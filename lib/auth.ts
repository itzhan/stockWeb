import { createHmac, timingSafeEqual } from "node:crypto";

const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET?.trim() || "stock-admin-default-secret";

const base64UrlEncode = (input: Buffer) =>
  input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (input: string) => {
  let base = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base.length % 4;
  if (pad) {
    base += "=".repeat(4 - pad);
  }
  return Buffer.from(base, "base64");
};

const encodeSegment = (value: unknown) =>
  base64UrlEncode(Buffer.from(JSON.stringify(value), "utf8"));

const signSegment = (value: string) =>
  base64UrlEncode(
    createHmac("sha256", ADMIN_JWT_SECRET).update(value).digest()
  );

const parseAuthorizationHeader = (value: string | null) => {
  if (!value) {
    throw new Error("缺少授权信息");
  }
  const [scheme, token] = value.trim().split(/\s+/);
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    throw new Error("授权格式不正确");
  }
  return token;
};

type JwtPayload = {
  role: "admin";
  iat: number;
  exp: number;
};

export const createAdminToken = () => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    role: "admin",
    iat: now,
    exp: now + 12 * 60 * 60,
  };
  const encodedHeader = encodeSegment(header);
  const encodedPayload = encodeSegment(payload);
  const signature = signSegment(`${encodedHeader}.${encodedPayload}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const verifyAdminToken = (token: string) => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("token 格式不正确");
  }
  const [header, payload, signature] = parts;
  const expectedSignature = signSegment(`${header}.${payload}`);
  const signatureBuffer = base64UrlDecode(signature);
  const expectedBuffer = base64UrlDecode(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("token 签名不匹配");
  }

  const parsedPayload = JSON.parse(
    base64UrlDecode(payload).toString("utf8")
  ) as JwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (parsedPayload.exp && parsedPayload.exp < now) {
    throw new Error("token 已过期");
  }
  return parsedPayload;
};

export const requireAdminAuth = (request: Request) => {
  const token = parseAuthorizationHeader(request.headers.get("authorization"));
  verifyAdminToken(token);
  return token;
};
