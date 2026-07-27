import { readFileSync } from "node:fs";
import { join } from "node:path";
import { requireAdminPage } from "../src/auth";
import type { VercelRequest, VercelResponse } from "../src/vercel";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  if (!requireAdminPage(req, res)) return;

  const html = readFileSync(join(process.cwd(), "public", "admin.html"), "utf8");
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  return res.status(200).send(html);
}
