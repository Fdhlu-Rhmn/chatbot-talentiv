import type { Status } from "./types";

export interface BarisDispatch {
  id: string;
  status: Status;
  kirimAt: Date; // jam kirim efektif (manual ?? default)
  otomasiAktif: boolean;
  lengkap: boolean;
  remindedAt: Date | null;
  percobaan: number;
}

const HARI = 24 * 60 * 60 * 1000;
export const MAKS_PERCOBAAN = 3;

export function pilihAksi(now: Date, rows: BarisDispatch[]): { notif: string[]; ingat: string[] } {
  const notif: string[] = [];
  const ingat: string[] = [];
  for (const r of rows) {
    if (!r.otomasiAktif || (r.status !== "terjadwal" && r.status !== "perlu_dilengkapi")) continue;
    if (r.kirimAt <= now) {
      if (r.percobaan < MAKS_PERCOBAAN) notif.push(r.id);
    } else if (!r.lengkap && !r.remindedAt && r.kirimAt.getTime() - now.getTime() <= HARI) {
      ingat.push(r.id);
    }
  }
  return { notif, ingat };
}
