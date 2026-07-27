import { getLink, incrementVisits, isValidSlug } from "../../src/links";
import { applySecurityHeaders, enforceRateLimit } from "../../src/security";
import type { VercelRequest, VercelResponse } from "../../src/vercel";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(res);
  if (!(await enforceRateLimit(req, res, { name: "redirect", limit: 300, windowSeconds: 60 }))) return;

  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    return res.status(405).send("Method Not Allowed");
  }

  const slug = String(req.query.slug ?? "");
  if (!isValidSlug(slug)) {
    return res.status(404).send("Not Found");
  }

  const link = await getLink(slug);
  if (!link) {
    return res.status(404).send("Not Found");
  }

  await incrementVisits(link);
  res.setHeader("cache-control", "no-store");
  return res.redirect(302, link.url);
}
