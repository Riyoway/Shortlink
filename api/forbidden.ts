import type { VercelRequest, VercelResponse } from "../src/vercel";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("cache-control", "no-store");
  return res.status(403).send("Forbidden");
}
