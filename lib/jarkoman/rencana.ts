import type { Jenis, Kelas, Sesi, Status } from "./types";
import { jamKirimDefault } from "./waktu";

export interface JarkomanRow {
  id?: string;
  jenis: Jenis;
  kelasId: string;
  sesiId: string | null;
  kirimAt: Date;
  kirimAtManual: Date | null;
  status: Status;
  notifiedAt: Date | null;
  remindedAt: Date | null;
  percobaan: number;
  error: string | null;
}

const JAM = 60 * 60 * 1000;

export const kirimEfektif = (r: Pick<JarkomanRow, "kirimAt" | "kirimAtManual">) => r.kirimAtManual ?? r.kirimAt;

// Sync terlambat: masih layak dikirim selama sesi belum mulai (presensi: sampai 12 jam setelah mulai).
export function masihRelevan(jenis: Jenis, mulai: Date, kirim: Date, now: Date): boolean {
  if (kirim >= now) return true;
  const batas = jenis === "presensi" ? mulai.getTime() + 12 * JAM : mulai.getTime();
  return batas > now.getTime();
}

const kunci = (jenis: Jenis, sesiId: string | null) => `${jenis}:${sesiId ?? "-"}`;
export const terbuka = (s: Status) => s === "terjadwal" || s === "perlu_dilengkapi";

type Kolom = "kirimAt" | "kirimAtManual" | "status" | "notifiedAt" | "remindedAt" | "percobaan" | "error";
const KOLOM: Kolom[] = ["kirimAt", "kirimAtManual", "status", "notifiedAt", "remindedAt", "percobaan", "error"];
const sama = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);

export interface UbahSync {
  id: string;
  patch: Partial<Pick<JarkomanRow, Kolom>>;
  // Tulis hanya kalau baris masih seperti saat dibaca, supaya klaim dispatch/aksi admin tidak tertimpa.
  syarat: { status: Status; remindedAt: Date | null };
}

export function perubahanSync(ada: JarkomanRow[], rencana: JarkomanRow[]): { baru: JarkomanRow[]; ubah: UbahSync[] } {
  const lama = new Map(ada.filter((r) => r.id).map((r) => [r.id!, r]));
  const baru = rencana.filter((r) => !r.id);
  const ubah: UbahSync[] = [];
  for (const r of rencana) {
    const e = r.id ? lama.get(r.id) : undefined;
    if (!e) continue;
    const patch: Partial<Pick<JarkomanRow, Kolom>> = {};
    for (const k of KOLOM) if (!sama(e[k], r[k])) (patch as Record<string, unknown>)[k] = r[k];
    if (Object.keys(patch).length) ubah.push({ id: r.id!, patch, syarat: { status: e.status, remindedAt: e.remindedAt } });
  }
  return { baru, ubah };
}

export function rencanakanJarkoman(kelas: Kelas, sesi: Sesi[], ada: JarkomanRow[], now: Date): JarkomanRow[] {
  const lama = new Map(ada.map((r) => [kunci(r.jenis, r.sesiId), r]));
  const hasil: JarkomanRow[] = [];
  const terurut = [...sesi].sort((a, b) => a.nomor - b.nomor);
  const perdana = terurut[0];

  const target: { jenis: Jenis; sesiId: string | null; mulai: Date }[] = [];
  if (perdana) {
    target.push({ jenis: "h7", sesiId: null, mulai: perdana.mulai }, { jenis: "h1", sesiId: null, mulai: perdana.mulai });
  }
  for (const s of terurut) {
    target.push({ jenis: "pengingat", sesiId: s.id, mulai: s.mulai }, { jenis: "presensi", sesiId: s.id, mulai: s.mulai });
  }

  for (const t of target) {
    const def = jamKirimDefault(t.jenis, t.mulai);
    const k = kunci(t.jenis, t.sesiId);
    const e = lama.get(k);
    lama.delete(k);

    if (!e) {
      hasil.push({
        jenis: t.jenis, kelasId: kelas.id, sesiId: t.sesiId, kirimAt: def, kirimAtManual: null,
        status: masihRelevan(t.jenis, t.mulai, def, now) ? "terjadwal" : "dilewati",
        notifiedAt: null, remindedAt: null, percobaan: 0, error: null,
      });
      continue;
    }
    const baru: JarkomanRow = { ...e, kirimAt: def };
    const relevan = masihRelevan(t.jenis, t.mulai, kirimEfektif(baru), now);
    const efektifBerubah = kirimEfektif(e).getTime() !== kirimEfektif(baru).getTime();
    if (terbuka(e.status)) {
      // Baris yang belum dikirim tapi sesinya sudah lewat tidak boleh terkirim saat otomasi baru dinyalakan.
      if (!relevan) baru.status = "dilewati";
    } else if (efektifBerubah && relevan) {
      Object.assign(baru, { status: "terjadwal", notifiedAt: null, remindedAt: null, percobaan: 0, error: null });
    }
    hasil.push(baru);
  }

  // Sisa = sesi yang hilang dari sumber.
  for (const e of lama.values()) {
    hasil.push(e.status === "sudah_dikirim" ? e : { ...e, status: "dilewati" });
  }
  return hasil;
}
