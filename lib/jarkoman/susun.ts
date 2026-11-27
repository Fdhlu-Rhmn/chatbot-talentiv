import { terapkanOverride, type Override } from "./efektif";
import { kirimEfektif, terbuka, type JarkomanRow } from "./rencana";
import { renderJarkoman, type HasilRender } from "./template";
import type { Jenis, Kelas, Sesi } from "./types";

export const LABEL_JENIS: Record<Jenis, string> = {
  h7: "H-7 Kelas",
  h1: "H-1 Kelas",
  pengingat: "Pengingat sebelum kelas",
  presensi: "Presensi",
};

export interface DataJarkoman {
  kelas: Kelas[];
  sesi: Sesi[];
  override: Override[];
  jarkoman: JarkomanRow[];
}

export interface JarkomanTersusun {
  kelas: Kelas;
  sesi: Sesi | null;
  mulai: Date; // mulai sesi; H-7/H-1 = sesi perdana
  kirimAt: Date; // jam pengiriman untuk teks (bukan selalu jadwal)
  hasil: HasilRender;
  sumberKelas: Partial<Record<keyof Kelas, "api" | "manual">>;
  sumberSesi: Partial<Record<keyof Sesi, "api" | "manual">> | null;
}

// Gabungkan data sumber + override admin, lalu render teks jarkoman.
// Jam yang dipakai di teks: jam pengiriman sebenarnya. Terkirim → notifiedAt; terlambat → sekarang.
function jamTeks(j: JarkomanRow, now: Date): Date {
  const rencana = kirimEfektif(j);
  if (j.notifiedAt) return j.notifiedAt > rencana ? j.notifiedAt : rencana;
  if (terbuka(j.status) && rencana < now) return now;
  return rencana;
}

export function susunJarkoman(d: DataJarkoman, j: JarkomanRow, now: Date = new Date()): JarkomanTersusun | null {
  const k = d.kelas.find((x) => x.id === j.kelasId);
  if (!k) return null;
  const kelas = terapkanOverride(k, "kelas", d.override);
  const sesiKelas = d.sesi.filter((s) => s.kelasId === k.id).sort((a, b) => a.nomor - b.nomor);
  if (!sesiKelas.length) return null;
  const perdana = terapkanOverride(sesiKelas[0], "sesi", d.override).data;
  const s = j.sesiId ? sesiKelas.find((x) => x.id === j.sesiId) : null;
  if (j.sesiId && !s) return null;
  const sesi = s ? terapkanOverride(s, "sesi", d.override) : null;
  const kirimAt = jamTeks(j, now);
  return {
    kelas: kelas.data,
    sesi: sesi?.data ?? null,
    mulai: (sesi?.data ?? perdana).mulai,
    kirimAt,
    hasil: renderJarkoman(j.jenis, { kelas: kelas.data, sesi: sesi?.data ?? null, perdana, kirimAt }),
    sumberKelas: kelas.sumber,
    sumberSesi: sesi?.sumber ?? null,
  };
}
