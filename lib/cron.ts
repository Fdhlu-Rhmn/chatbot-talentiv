import { timingSafeEqual } from "node:crypto";

export function cronSah(req: Request): boolean {
  const rahasia = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!rahasia) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${rahasia}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
