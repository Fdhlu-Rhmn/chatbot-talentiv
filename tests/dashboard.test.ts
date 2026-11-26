import { expect, test } from "vitest";
import { siapkanDashboard } from "@/lib/jarkoman/dashboard";
import { rencanakanJarkoman } from "@/lib/jarkoman/rencana";
import type { Kelas, Sesi } from "@/lib/jarkoman/types";
import { wib } from "@/lib/jarkoman/waktu";
import { dataMock } from "@/lib/sumber/mock";

const now = wib(2026, 11, 26, 12, 0);
const m = dataMock();
const kelas: Kelas[] = m.kelas.map((k) => ({ ...k, id: k.sourceId, otomasiAktif: false }));
const sesi: Sesi[] = m.sesi.map(({ kelasSourceId, ...s }) => ({ ...s, id: s.sourceId, kelasId: kelasSourceId }));
const jarkoman = kelas.flatMap((k) =>
  rencanakanJarkoman(k, sesi.filter((s) => s.kelasId === k.id), [], now).map((r) => ({ ...r, id: `${r.jenis}--${r.sesiId ?? r.kelasId}` })),
);
const data = { kelas, sesi, override: [], jarkoman };

test("default: season berjalan, semua kelas, jarkoman berikutnya terpilih", () => {
  const r = siapkanDashboard(data, {}, now);
  expect(r.seasonAktif).toBe("November 2026");
  expect(r.kelasTerpilih).toHaveLength(3);
  expect(r.terpilih!.j.kirimAt >= now).toBe(true);
  expect(r.baris.every((b, i, a) => i === 0 || b.j.kirimAt >= a[i - 1].j.kirimAt || b.j.kirimAtManual)).toBe(true);
});

test("filter batch + jenis", () => {
  const r = siapkanDashboard(data, { batch: "mock-da-7", jenis: "presensi" }, now);
  expect(r.baris).toHaveLength(8);
  expect(r.baris.every((b) => b.j.jenis === "presensi" && b.j.kelasId === "mock-da-7")).toBe(true);
  expect(r.baris.find((b) => b.j.sesiId === "mock-da-7-s3")!.status).toBe("Perlu dilengkapi");
});

test("parameter tidak dikenal diabaikan", () => {
  const r = siapkanDashboard(data, { season: "Maret 1999", program: "X", batch: "Y", jenis: "Z" }, now);
  expect(r.seasonAktif).toBe("November 2026");
  expect(r.kelasTerpilih).toHaveLength(3);
});
