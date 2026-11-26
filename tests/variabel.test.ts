import { expect, test } from "vitest";
import { daftarVariabel, statusTampil } from "@/lib/jarkoman/variabel";
import { dariInputWib, keInputWib, wib } from "@/lib/jarkoman/waktu";
import type { JarkomanTersusun } from "@/lib/jarkoman/susun";

const t = {
  kelas: { id: "k1", nama: "A", namaCourse: "A", linkTna: "t", linkGcal: null, linkIcal: "i", linkDeck: "d", linkStudentGuide: "s" },
  sesi: null,
  kirimAt: wib(2026, 11, 7, 10, 0),
  hasil: { teks: "", bagian: [], kosong: ["Link GCal"] },
  sumberKelas: { nama: "api", linkTna: "manual", linkGcal: "api" },
  sumberSesi: null,
} as unknown as JarkomanTersusun;

test("variabel H-7: 8 item, sumber dan kosong benar", () => {
  const v = daftarVariabel("h7", t, wib(2026, 11, 14, 9, 0));
  expect(v).toHaveLength(8);
  expect(v.find((x) => x.field === "linkTna")).toMatchObject({ entitas: "kelas", entitasId: "k1", sumber: "manual", kategori: "link" });
  expect(v.find((x) => x.field === "linkGcal")).toMatchObject({ nilai: "", sumber: "kosong" });
  expect(v.find((x) => x.label === "Hari, tanggal, jam sesi perdana")).toMatchObject({ sumber: "otomatis", nilai: "Sabtu, 14 November 2026 pukul 09:00 WIB" });
});

test("statusTampil", () => {
  expect(statusTampil("terjadwal", false, true)).toBe("Perlu dilengkapi");
  expect(statusTampil("terjadwal", true, true)).toBe("Siap kirim");
  expect(statusTampil("terjadwal", true, false)).toBe("Otomasi belum aktif");
  expect(statusTampil("notif_terkirim", true, true)).toBe("Notif terkirim");
  expect(statusTampil("sudah_dikirim", true, true)).toBe("Sudah dikirim");
  expect(statusTampil("gagal", true, true)).toBe("Gagal");
  expect(statusTampil("dilewati", true, true)).toBe("Dilewati");
});

test("input datetime-local dibaca sebagai WIB", () => {
  const d = wib(2026, 11, 14, 19, 0);
  expect(keInputWib(d)).toBe("2026-11-14T19:00");
  expect(dariInputWib("2026-11-14T19:00")).toEqual(d);
  expect(dariInputWib("bukan tanggal")).toBeNull();
});
