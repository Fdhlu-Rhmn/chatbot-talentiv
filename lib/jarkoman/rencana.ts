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
function masihRelevan(jenis: Jenis, mulai: Date, kirim: Date, now: Date): boolean {
  if (kirim >= now) return true;
  const batas = jenis === "presensi" ? mulai.getTime() + 12 * JAM : mulai.getTime();
  return batas > now.getTime();
}

const kunci = (jenis: Jenis, sesiId: string | null) => `${jenis}:${sesiId ?? "-"}`;

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
    if (e.kirimAt.getTime() === def.getTime()) {
      hasil.push(e);
      continue;
    }
    const baru: JarkomanRow = { ...e, kirimAt: def };
    const efektifBerubah = kirimEfektif(e).getTime() !== kirimEfektif(baru).getTime();
    const sudahJalan = e.status !== "terjadwal" && e.status !== "perlu_dilengkapi";
    if (efektifBerubah && sudahJalan && kirimEfektif(baru) > now) {
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
