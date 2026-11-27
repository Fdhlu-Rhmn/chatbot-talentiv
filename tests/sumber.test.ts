import { afterEach, expect, test } from "vitest";
import { ambilDataSumber } from "@/lib/sumber";

afterEach(() => {
  delete process.env.SUMBER_DATA;
});

test("mock: 3 kelas, setiap sesi milik kelas yang ada", async () => {
  process.env.SUMBER_DATA = "mock";
  const { kelas, sesi } = await ambilDataSumber();
  expect(kelas).toHaveLength(3);
  const ids = new Set(kelas.map((k) => k.sourceId));
  expect(sesi.length).toBeGreaterThan(0);
  expect(sesi.every((s) => ids.has(s.kelasSourceId))).toBe(true);
  expect(sesi.some((s) => s.linkPresensi === null)).toBe(true);
});

test("supabase belum dikonfigurasi", async () => {
  process.env.SUMBER_DATA = "supabase";
  await expect(ambilDataSumber()).rejects.toThrow("Sumber Supabase app.talentiv.id belum dikonfigurasi");
});
