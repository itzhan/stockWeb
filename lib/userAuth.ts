import { randomBytes, pbkdf2Sync } from "node:crypto";

const ITERATIONS = 120000;
const KEYLEN = 64;
const DIGEST = "sha512";

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return { salt, hash };
};

export const verifyPassword = (password: string, salt: string, hash: string) => {
  const computed = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return hash === computed;
};

export type UserJwtPayload = {
  uid: number;
  username: string;
  role: string;
  exp: number;
};

const USER_JWT_SECRET = process.env.USER_JWT_SECRET?.trim() || "user-default-secret";

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
    pbkdf2Sync(USER_JWT_SECRET, value, 1, 32, "sha256")
  );

export const createUserToken = (
  payload: Omit<UserJwtPayload, "exp">,
  hours = 24 * 90
) => {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: UserJwtPayload = { ...payload, exp: now + hours * 3600 };
  const encodedHeader = encodeSegment(header);
  const encodedPayload = encodeSegment(fullPayload);
  const signature = signSegment(`${encodedHeader}.${encodedPayload}`);
  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

export const verifyUserToken = (token: string): UserJwtPayload => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("token 格式不正确");
  }
  const [header, payload, signature] = parts;
  const expectedSignature = signSegment(`${header}.${payload}`);
  if (signature !== expectedSignature) {
    throw new Error("token 签名不匹配");
  }
  const parsed = JSON.parse(base64UrlDecode(payload).toString("utf8")) as UserJwtPayload;
  const now = Math.floor(Date.now() / 1000);
  if (parsed.exp < now) {
    throw new Error("token 已过期");
  }
  return parsed;
};

export const parseUserAuth = (request: Request): UserJwtPayload => {
  const auth = request.headers.get("authorization");
  if (!auth) throw new Error("缺少授权");
  const [scheme, token] = auth.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token) throw new Error("授权格式错误");
  return verifyUserToken(token);
};
