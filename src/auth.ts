import type { VercelRequest, VercelResponse } from "./vercel";

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    res.status(500).send("ADMIN_PASSWORD is not configured.");
    return false;
  }

  const header = req.headers.authorization;
  if (!header?.startsWith("Basic ")) {
    unauthorized(res);
    return false;
  }

  const credentials = decodeBase64(header.slice("Basic ".length));
  const separator = credentials.indexOf(":");
  if (separator === -1) {
    unauthorized(res);
    return false;
  }

  const actualUsername = credentials.slice(0, separator);
  const actualPassword = credentials.slice(separator + 1);
  if (!timingSafeEqual(actualUsername, username) || !timingSafeEqual(actualPassword, password)) {
    unauthorized(res);
    return false;
  }

  return true;
}

function unauthorized(res: VercelResponse): void {
  res.setHeader("www-authenticate", 'Basic realm="Shortlink Admin", charset="UTF-8"');
  res.setHeader("cache-control", "no-store");
  res.status(401).send("Unauthorized");
}

function decodeBase64(value: string): string {
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function timingSafeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let mismatch = leftBytes.length === rightBytes.length ? 0 : 1;

  for (let index = 0; index < length; index += 1) {
    mismatch |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }

  return mismatch === 0;
}
