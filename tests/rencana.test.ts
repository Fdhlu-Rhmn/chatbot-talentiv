import { describe, expect, test } from "vitest";
import { rencanakanJarkoman, type JarkomanRow } from "@/lib/jarkoman/rencana";
import type { Kelas, Sesi } from "@/lib/jarkoman/types";
import { wib } from "@/lib/jarkoman/waktu";

const kelas = { id: "k1" } as Kelas;
const sesi = (id: string, nomor: number, mulai: Date) => ({ id, nomor, kelasId: "k1", mulai }) as Sesi;
const s1 = sesi("s1", 1, wib(2026, 12, 5, 19, 30));
const s2 = sesi("s2", 2, wib(2026, 12, 12, 19, 30));
const now = wib(2026, 11, 26, 12, 0);
const cari = (rows: JarkomanRow[], jenis: string, sesiId: string | null) =>
  rows.find((r) => r.jenis === jenis && r.sesiId === sesiId)!;

test("kelas 2 sesi menghasilkan 6 jarkoman terjadwal", () => {
  const rows = rencanakanJarkoman(kelas, [s1, s2], [], now);
  expect(rows).toHaveLength(6);
  expect(rows.every((r) => r.status === "terjadwal")).toBe(true);
  expect(cari(rows, "h7", null).kirimAt).toEqual(wib(2026, 11, 28, 10, 0));
  expect(cari(rows, "pengingat", "s2").kirimAt).toEqual(wib(2026, 12, 12, 17, 0));
});

describe("sesi bergeser", () => {
  const awal = rencanakanJarkoman(kelas, [s1, s2], [], now);
  const geser = sesi("s2", 2, wib(2026, 12, 13, 19, 30));

  test("jam kirim ikut bergeser", () => {
    const rows = rencanakanJarkoman(kelas, [s1, geser], awal, now);
    expect(cari(rows, "pengingat", "s2").kirimAt).toEqual(wib(2026, 12, 13, 17, 0));
  });

  test("jam manual dipertahankan", () => {
    const ada = awal.map((r) => (r.sesiId === "s2" && r.jenis === "pengingat" ? { ...r, kirimAtManual: wib(2026, 12, 12, 8, 0) } : r));
    const r = cari(rencanakanJarkoman(kelas, [s1, geser], ada, now), "pengingat", "s2");
    expect(r.kirimAtManual).toEqual(wib(2026, 12, 12, 8, 0));
    expect(r.status).toBe("terjadwal");
  });

  test("notif sudah terkirim lalu sesi digeser ke masa depan: kembali terjadwal", () => {
    const ada = awal.map((r) =>
      r.sesiId === "s2" && r.jenis === "pengingat" ? { ...r, status: "notif_terkirim" as const, notifiedAt: now, remindedAt: now, percobaan: 1 } : r,
    );
    const r = cari(rencanakanJarkoman(kelas, [s1, geser], ada, now), "pengingat", "s2");
    expect(r.status).toBe("terjadwal");
    expect(r.notifiedAt).toBeNull();
    expect(r.remindedAt).toBeNull();
    expect(r.percobaan).toBe(0);
  });

  test("sudah_dikirim dan sesi tidak berubah: tidak disentuh", () => {
    const ada = awal.map((r) => (r.sesiId === "s1" ? { ...r, status: "sudah_dikirim" as const, notifiedAt: now } : r));
    const r = cari(rencanakanJarkoman(kelas, [s1, s2], ada, now), "pengingat", "s1");
    expect(r.status).toBe("sudah_dikirim");
    expect(r.notifiedAt).toEqual(now);
  });
});

describe("sync terlambat", () => {
  test("pengingat lewat jam kirim tapi sesi belum mulai: terjadwal (kirim segera)", () => {
    const t = wib(2026, 12, 5, 18, 0);
    expect(cari(rencanakanJarkoman(kelas, [s1], [], t), "pengingat", "s1").status).toBe("terjadwal");
  });
  test("pengingat untuk sesi yang sudah lewat: dilewati", () => {
    const t = wib(2026, 12, 5, 20, 0);
    expect(cari(rencanakanJarkoman(kelas, [s1], [], t), "pengingat", "s1").status).toBe("dilewati");
  });
  test("presensi tetap terjadwal sampai 12 jam setelah mulai", () => {
    expect(cari(rencanakanJarkoman(kelas, [s1], [], wib(2026, 12, 6, 7, 0)), "presensi", "s1").status).toBe("terjadwal");
    expect(cari(rencanakanJarkoman(kelas, [s1], [], wib(2026, 12, 6, 8, 0)), "presensi", "s1").status).toBe("dilewati");
  });
});

test("sesi yang hilang dari sumber ditandai dilewati", () => {
  const awal = rencanakanJarkoman(kelas, [s1, s2], [], now);
  const rows = rencanakanJarkoman(kelas, [s1], awal, now);
  expect(cari(rows, "pengingat", "s2").status).toBe("dilewati");
  expect(cari(rows, "presensi", "s2").status).toBe("dilewati");
});

// --- Temuan review ---
import { perubahanSync } from "@/lib/jarkoman/rencana";

test("C2: baris terbuka yang sudah tidak relevan ditandai dilewati saat sync", () => {
  const awal = rencanakanJarkoman(kelas, [s1], [], wib(2026, 11, 20, 0, 0));
  const rows = rencanakanJarkoman(kelas, [s1], awal.map((r, i) => ({ ...r, id: `id${i}` })), wib(2026, 12, 7, 0, 0));
  expect(cari(rows, "pengingat", "s1").status).toBe("dilewati");
  expect(cari(rows, "h7", null).status).toBe("dilewati");
});

test("I2: sesi dimajukan setelah notif terkirim, jam default baru sudah lewat tapi sesi belum mulai: terjadwal lagi", () => {
  const t0 = wib(2026, 12, 5, 12, 0);
  const awal = rencanakanJarkoman(kelas, [s1], [], t0).map((r, i) => ({ ...r, id: `id${i}` }));
  const terkirim = awal.map((r) => (r.jenis === "pengingat" ? { ...r, status: "notif_terkirim" as const, notifiedAt: wib(2026, 12, 5, 17, 0) } : r));
  const maju = sesi("s1", 1, wib(2026, 12, 5, 18, 0)); // default baru 15.30, sudah lewat
  const r = cari(rencanakanJarkoman(kelas, [maju], terkirim, wib(2026, 12, 5, 17, 10)), "pengingat", "s1");
  expect(r.status).toBe("terjadwal");
  expect(r.notifiedAt).toBeNull();
});

test("C1: perubahanSync hanya menulis baris yang berubah, dengan syarat status & reminded_at lama", () => {
  const awal = rencanakanJarkoman(kelas, [s1, s2], [], now).map((r, i) => ({ ...r, id: `id${i}` }));
  expect(perubahanSync(awal, rencanakanJarkoman(kelas, [s1, s2], awal, now))).toEqual({ baru: [], ubah: [] });
  const geser = sesi("s2", 2, wib(2026, 12, 13, 19, 30));
  const { baru, ubah } = perubahanSync(awal, rencanakanJarkoman(kelas, [s1, geser], awal, now));
  expect(baru).toEqual([]);
  expect(ubah).toHaveLength(2);
  const p = ubah.find((u) => u.id === awal.find((a) => a.jenis === "pengingat" && a.sesiId === "s2")!.id)!;
  expect(p.syarat).toEqual({ status: "terjadwal", remindedAt: null });
  expect(Object.keys(p.patch)).toEqual(["kirimAt"]);
});
