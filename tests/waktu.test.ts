import { describe, expect, test } from "vitest";
import {
  jamKirimDefault, jamTutupPresensi, keteranganHari, sapaan, season, tanggalPanjang, tanggalPendek, wib, jamWib,
} from "@/lib/jarkoman/waktu";

const perdana = wib(2026, 11, 14, 9, 0); // Sabtu
const malam = wib(2026, 10, 6, 19, 30);

describe("jamKirimDefault", () => {
  test("H-7 dan H-1 pukul 10.00", () => {
    expect(jamKirimDefault("h7", perdana)).toEqual(wib(2026, 11, 7, 10, 0));
    expect(jamKirimDefault("h1", perdana)).toEqual(wib(2026, 11, 13, 10, 0));
  });
  test("pengingat 2,5 jam sebelum, atau 19.00 kemarin kalau sesi < 10.00", () => {
    expect(jamKirimDefault("pengingat", malam)).toEqual(wib(2026, 10, 6, 17, 0));
    expect(jamKirimDefault("pengingat", perdana)).toEqual(wib(2026, 11, 13, 19, 0));
  });
  test("presensi 2 jam setelah mulai", () => {
    expect(jamKirimDefault("presensi", malam)).toEqual(wib(2026, 10, 6, 21, 30));
  });
});

test("sapaan", () => {
  expect(sapaan(wib(2026, 1, 1, 10, 59))).toBe("Pagi");
  expect(sapaan(wib(2026, 1, 1, 11, 0))).toBe("Siang");
  expect(sapaan(wib(2026, 1, 1, 15, 0))).toBe("Sore");
  expect(sapaan(wib(2026, 1, 1, 18, 0))).toBe("Malam");
});

test("keteranganHari", () => {
  expect(keteranganHari(wib(2026, 10, 6, 17, 0), malam)).toBe("malam ini");
  expect(keteranganHari(wib(2026, 11, 13, 19, 0), perdana)).toBe("besok pagi hari");
});

test("sekitar tengah malam WIB (beda tanggal di UTC)", () => {
  const pagiSekali = wib(2026, 11, 15, 6, 30);
  expect(jamKirimDefault("pengingat", pagiSekali)).toEqual(wib(2026, 11, 14, 19, 0));
  expect(keteranganHari(wib(2026, 11, 14, 19, 0), pagiSekali)).toBe("besok pagi hari");
});

test("jamTutupPresensi", () => {
  expect(jamTutupPresensi(wib(2026, 1, 1, 11, 59))).toBe("13.00");
  expect(jamTutupPresensi(wib(2026, 1, 1, 15, 59))).toBe("17.00");
  expect(jamTutupPresensi(wib(2026, 1, 1, 21, 30))).toBe("23.00");
});

test("format", () => {
  expect(season(perdana)).toBe("November 2026");
  expect(tanggalPanjang(perdana)).toBe("Sabtu, 14 November 2026 pukul 09:00 WIB");
  expect(tanggalPendek(malam)).toBe("6 Oktober 2026 pukul 19:30 WIB");
  expect(jamWib(wib(2026, 1, 1, 17, 0))).toBe("17.00");
});
