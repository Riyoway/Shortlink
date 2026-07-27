import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "shortlink_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function validateAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) return false;
  return secureEqual(username, expectedUsername) && secureEqual(password, expectedPassword);
}

export function createSessionCookie(username: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = base64UrlEncode(`${username}:${expiresAt}`);
  const signature = sign(payload);
  const value = `${payload}.${signature}`;

  return [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`
  ].join("; ");
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function hasValidSession(cookieHeader: string | undefined): boolean {
  const value = parseCookies(cookieHeader)[COOKIE_NAME];
  if (!value) return false;

  const [payload, signature] = value.split(".");
  if (!payload || !signature || !secureEqual(signature, sign(payload))) {
    return false;
  }

  const decoded = base64UrlDecode(payload);
  const separator = decoded.lastIndexOf(":");
  if (separator === -1) return false;

  const username = decoded.slice(0, separator);
  const expiresAt = Number(decoded.slice(separator + 1));
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  return Boolean(username);
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};

  return Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [name, ...rest] = cookie.trim().split("=");
      return [name, rest.join("=")];
    })
  );
}

function sign(value: string): string {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return "";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return "";
  }
}

function secureEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  const paddedLeft = Buffer.alloc(length);
  const paddedRight = Buffer.alloc(length);

  leftBytes.copy(paddedLeft);
  rightBytes.copy(paddedRight);

  return timingSafeEqual(paddedLeft, paddedRight) && leftBytes.length === rightBytes.length;
}
