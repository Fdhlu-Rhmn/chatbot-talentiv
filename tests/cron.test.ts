import { expect, test } from "vitest";
import { cronSah } from "@/lib/cron";

test("cronSah hanya menerima Bearer CRON_SECRET", () => {
  process.env.CRON_SECRET = "rahasia";
  const req = (h?: string) => new Request("http://x", { headers: h ? { authorization: h } : {} });
  expect(cronSah(req("Bearer rahasia"))).toBe(true);
  expect(cronSah(req("Bearer salah"))).toBe(false);
  expect(cronSah(req())).toBe(false);
  delete process.env.CRON_SECRET;
  expect(cronSah(req("Bearer "))).toBe(false);
});
