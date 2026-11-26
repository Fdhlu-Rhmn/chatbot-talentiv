import { masihRelevan } from "./rencana";
import type { Jenis, Status } from "./types";

export interface BarisDispatch {
  id: string;
  jenis: Jenis;
  status: Status;
  kirimAt: Date; // jam kirim efektif (manual ?? default)
  mulai: Date; // mulai sesi (H-7/H-1: sesi perdana)
  otomasiAktif: boolean;
  lengkap: boolean;
  remindedAt: Date | null;
  percobaan: number;
}

const HARI = 24 * 60 * 60 * 1000;
export const MAKS_PERCOBAAN = 3;

export function pilihAksi(now: Date, rows: BarisDispatch[]): { notif: string[]; ingat: string[]; lewati: string[] } {
  const notif: string[] = [];
  const ingat: string[] = [];
  const lewati: string[] = [];
  for (const r of rows) {
    if (!r.otomasiAktif || (r.status !== "terjadwal" && r.status !== "perlu_dilengkapi")) continue;
    if (r.kirimAt <= now) {
      // Jatuh tempo tapi sesi sudah lewat (mis. otomasi baru dinyalakan): jangan kirim jarkoman basi.
      if (!masihRelevan(r.jenis, r.mulai, r.kirimAt, now)) lewati.push(r.id);
      else if (r.percobaan < MAKS_PERCOBAAN) notif.push(r.id);
    } else if (!r.lengkap && !r.remindedAt && r.kirimAt.getTime() - now.getTime() <= HARI) {
      ingat.push(r.id);
    }
  }
  return { notif, ingat, lewati };
}
