import { requireAdmin } from "../../src/auth";
import { deleteLink, isValidSlug } from "../../src/links";
import { json } from "../../src/http";
import type { VercelRequest, VercelResponse } from "../../src/vercel";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  const slug = String(req.query.slug ?? "");
  if (!isValidSlug(slug)) {
    return json(res, 400, { error: "Invalid slug." });
  }

  if (req.method === "DELETE") {
    await deleteLink(slug);
    return json(res, 200, { ok: true });
  }

  res.setHeader("allow", "DELETE");
  return res.status(405).send("Method Not Allowed");
}
