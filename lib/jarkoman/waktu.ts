import type { Jenis } from "./types";

// WIB = UTC+7 tanpa DST, jadi cukup geser offset tetap. Jangan pakai getHours() (server Vercel UTC).
const OFFSET = 7 * 60 * 60 * 1000;
const JAM = 60 * 60 * 1000;
const HARI = 24 * JAM;

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function wib(y: number, m: number, d: number, h = 0, min = 0): Date {
  return new Date(Date.UTC(y, m - 1, d, h, min) - OFFSET);
}

export function bagianWib(t: Date) {
  const g = new Date(t.getTime() + OFFSET);
  return {
    y: g.getUTCFullYear(),
    m: g.getUTCMonth() + 1,
    d: g.getUTCDate(),
    h: g.getUTCHours(),
    min: g.getUTCMinutes(),
    hari: g.getUTCDay(),
  };
}

const dua = (n: number) => String(n).padStart(2, "0");

export function sapaan(t: Date): "Pagi" | "Siang" | "Sore" | "Malam" {
  const { h } = bagianWib(t);
  if (h < 11) return "Pagi";
  if (h < 15) return "Siang";
  if (h < 18) return "Sore";
  return "Malam";
}

function nomorHari(t: Date): number {
  const { y, m, d } = bagianWib(t);
  return Date.UTC(y, m - 1, d) / HARI;
}

export function keteranganHari(kirim: Date, mulai: Date): string {
  const s = sapaan(mulai).toLowerCase();
  const selisih = nomorHari(mulai) - nomorHari(kirim);
  if (selisih === 0) return `${s} ini`;
  if (selisih === 1) return `besok ${s} hari`;
  return `pada ${tanggalPanjang(mulai).split(" pukul")[0]}`;
}

export function jamKirimDefault(jenis: Jenis, mulai: Date): Date {
  const { y, m, d, h } = bagianWib(mulai);
  switch (jenis) {
    case "h7":
      return wib(y, m, d - 7, 10, 0);
    case "h1":
      return wib(y, m, d - 1, 10, 0);
    case "pengingat":
      return h < 10 ? wib(y, m, d - 1, 19, 0) : new Date(mulai.getTime() - 2.5 * JAM);
    case "presensi":
      return new Date(mulai.getTime() + 2 * JAM);
  }
}

export function jamTutupPresensi(kirim: Date): "13.00" | "17.00" | "23.00" {
  const { h } = bagianWib(kirim);
  if (h < 12) return "13.00";
  if (h < 16) return "17.00";
  return "23.00";
}

export function season(t: Date): string {
  const { y, m } = bagianWib(t);
  return `${NAMA_BULAN[m - 1]} ${y}`;
}

export function tanggalPendek(t: Date): string {
  const { y, m, d, h, min } = bagianWib(t);
  return `${d} ${NAMA_BULAN[m - 1]} ${y} pukul ${dua(h)}:${dua(min)} WIB`;
}

export function tanggalPanjang(t: Date): string {
  return `${NAMA_HARI[bagianWib(t).hari]}, ${tanggalPendek(t)}`;
}

export function jamWib(t: Date): string {
  const { h, min } = bagianWib(t);
  return `${dua(h)}.${dua(min)}`;
}
