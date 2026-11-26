import { expect, test } from "vitest";
import { susunJarkoman } from "@/lib/jarkoman/susun";
import type { Kelas, Sesi } from "@/lib/jarkoman/types";
import { wib } from "@/lib/jarkoman/waktu";

const kelas = { id: "k1", nama: "Kelas A", namaCourse: "Kelas A", linkTna: "t", linkGcal: "g", linkIcal: "i", linkDeck: "d", linkStudentGuide: "s" } as Kelas;
const sesi = (id: string, nomor: number, linkPresensi: string | null) =>
  ({ id, kelasId: "k1", nomor, mulai: wib(2026, 12, nomor, 19, 30), linkPresensi, mentorProfil: [] }) as unknown as Sesi;
const row = (o: object) =>
  ({
    id: "j1", jenis: "presensi", kelasId: "k1", sesiId: "s2", kirimAt: wib(2026, 12, 2, 21, 30), kirimAtManual: null,
    status: "terjadwal", notifiedAt: null, remindedAt: null, percobaan: 0, error: null, ...o,
  }) as never;

test("override mengisi field kosong, jam manual dipakai", () => {
  const data = {
    kelas: [kelas],
    sesi: [sesi("s1", 1, "x"), sesi("s2", 2, null)],
    override: [{ entitas: "sesi" as const, entitasId: "s2", field: "linkPresensi", nilai: "https://forms.gle/baru" }],
    jarkoman: [],
  };
  const r = susunJarkoman(data, row({ kirimAtManual: wib(2026, 12, 2, 10, 0) }))!;
  expect(r.hasil.kosong).toEqual([]);
  expect(r.hasil.teks).toContain("https://forms.gle/baru");
  expect(r.kirimAt).toEqual(wib(2026, 12, 2, 10, 0));
  expect(r.hasil.teks).toContain("ditutup pukul 13.00");
  expect(r.sumberSesi?.linkPresensi).toBe("manual");
});

test("tanpa override: field kosong terdeteksi", () => {
  const data = { kelas: [kelas], sesi: [sesi("s1", 1, "x"), sesi("s2", 2, null)], override: [], jarkoman: [] };
  expect(susunJarkoman(data, row({}))!.hasil.kosong).toEqual(["Link presensi"]);
});

test("I1: kirim terlambat dirender dengan jam sekarang, setelah terkirim dengan notifiedAt", () => {
  const data = { kelas: [kelas], sesi: [sesi("s1", 1, "x"), { ...sesi("s2", 2, "y"), mulai: wib(2026, 12, 3, 8, 0) }], override: [], jarkoman: [] };
  const telat = row({ jenis: "pengingat", kirimAt: wib(2026, 12, 2, 19, 0) });
  const now = wib(2026, 12, 3, 6, 0);
  const r = susunJarkoman(data, telat, now)!;
  expect(r.kirimAt).toEqual(now);
  expect(r.hasil.teks).toContain("pagi ini");
  const terkirim = susunJarkoman(data, row({ jenis: "pengingat", kirimAt: wib(2026, 12, 2, 19, 0), status: "notif_terkirim", notifiedAt: now }), wib(2026, 12, 3, 7, 0))!;
  expect(terkirim.kirimAt).toEqual(now);
});
