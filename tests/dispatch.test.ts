import { expect, test } from "vitest";
import { pilihAksi, type BarisDispatch } from "@/lib/jarkoman/dispatch";
import { wib } from "@/lib/jarkoman/waktu";

const now = wib(2026, 11, 26, 12, 0);
const JAM = 3600_000;
const b = (o: Partial<BarisDispatch>): BarisDispatch => ({
  id: "x", status: "terjadwal", kirimAt: now, otomasiAktif: true, lengkap: true, remindedAt: null, percobaan: 0, jenis: "pengingat", mulai: new Date(now.getTime() + 3600_000), ...o,
});

test("notif: terjadwal, jatuh tempo, otomasi aktif", () => {
  expect(pilihAksi(now, [b({ id: "a" })]).notif).toEqual(["a"]);
  expect(pilihAksi(now, [b({ id: "a", kirimAt: new Date(now.getTime() + 60_000) })]).notif).toEqual([]);
  expect(pilihAksi(now, [b({ id: "a", otomasiAktif: false })])).toEqual({ notif: [], ingat: [], lewati: [] });
});

test("status selain terjadwal/perlu_dilengkapi diabaikan", () => {
  for (const status of ["notif_terkirim", "sudah_dikirim", "dilewati", "gagal"] as const) {
    expect(pilihAksi(now, [b({ status })])).toEqual({ notif: [], ingat: [], lewati: [] });
  }
});

test("percobaan >= 3 tidak dikirim lagi", () => {
  expect(pilihAksi(now, [b({ percobaan: 3 })]).notif).toEqual([]);
});

test("pengingat data belum lengkap: sekali, dalam 24 jam sebelum kirim", () => {
  const t = new Date(now.getTime() + 23 * JAM);
  expect(pilihAksi(now, [b({ id: "a", lengkap: false, kirimAt: t })]).ingat).toEqual(["a"]);
  expect(pilihAksi(now, [b({ id: "a", lengkap: false, kirimAt: t, remindedAt: now })]).ingat).toEqual([]);
  expect(pilihAksi(now, [b({ id: "a", lengkap: false, kirimAt: new Date(now.getTime() + 25 * JAM) })]).ingat).toEqual([]);
  expect(pilihAksi(now, [b({ id: "a", lengkap: true, kirimAt: t })]).ingat).toEqual([]);
});

test("C2: jatuh tempo tapi sesi sudah lewat masuk lewati, bukan notif", () => {
  const lama = b({ id: "a", jenis: "pengingat", kirimAt: wib(2026, 11, 1, 17, 0), mulai: wib(2026, 11, 1, 19, 30) });
  const presensiMasih = b({ id: "p", jenis: "presensi", kirimAt: wib(2026, 11, 26, 9, 0), mulai: wib(2026, 11, 26, 7, 0) });
  expect(pilihAksi(now, [lama, presensiMasih])).toEqual({ notif: ["p"], ingat: [], lewati: ["a"] });
});
