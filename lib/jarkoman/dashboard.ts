import { kirimEfektif, type JarkomanRow } from "./rencana";
import { LABEL_JENIS, susunJarkoman, type DataJarkoman, type JarkomanTersusun } from "./susun";
import type { Jenis, Sesi } from "./types";
import { statusTampil } from "./variabel";
import { season } from "./waktu";

export interface ParamDashboard {
  season?: string;
  program?: string;
  batch?: string;
  jenis?: string;
  j?: string;
}

export interface BarisJadwal {
  j: JarkomanRow & { id: string };
  t: JarkomanTersusun;
  status: string;
}

const JENIS: Jenis[] = ["h7", "h1", "pengingat", "presensi"];

export function siapkanDashboard(d: DataJarkoman & { jarkoman: (JarkomanRow & { id: string })[] }, p: ParamDashboard, now: Date) {
  const perdana = new Map<string, Sesi>();
  for (const s of [...d.sesi].sort((a, b) => a.nomor - b.nomor)) if (!perdana.has(s.kelasId)) perdana.set(s.kelasId, s);
  const kelasAda = d.kelas.filter((k) => perdana.has(k.id));
  const seasonKelas = new Map(kelasAda.map((k) => [k.id, season(perdana.get(k.id)!.mulai)]));

  const urutSeason = [...new Map(kelasAda.map((k) => [seasonKelas.get(k.id)!, perdana.get(k.id)!.mulai.getTime()])).entries()]
    .sort((a, b) => a[1] - b[1]).map(([s]) => s);
  const seasonAktif = p.season && urutSeason.includes(p.season)
    ? p.season
    : urutSeason.includes(season(now)) ? season(now) : urutSeason.at(-1) ?? "";

  const kelasSeason = kelasAda.filter((k) => seasonKelas.get(k.id) === seasonAktif);
  const program = [...new Set(kelasSeason.map((k) => k.program))].sort();
  const programAktif = p.program && program.includes(p.program) ? p.program : "";
  const kelasProgram = kelasSeason.filter((k) => !programAktif || k.program === programAktif);
  const batchAktif = p.batch && kelasProgram.some((k) => k.id === p.batch) ? p.batch : "";
  const kelasTerpilih = kelasProgram.filter((k) => !batchAktif || k.id === batchAktif);
  const jenisAktif = JENIS.includes(p.jenis as Jenis) ? (p.jenis as Jenis) : "";

  const ids = new Set(kelasTerpilih.map((k) => k.id));
  const baris: BarisJadwal[] = d.jarkoman
    .filter((j) => ids.has(j.kelasId) && (!jenisAktif || j.jenis === jenisAktif))
    .map((j) => ({ j, t: susunJarkoman(d, j, now) }))
    .filter((x): x is { j: JarkomanRow & { id: string }; t: JarkomanTersusun } => x.t !== null)
    .map(({ j, t }) => ({ j, t, status: statusTampil(j.status, t.hasil.kosong.length === 0, t.kelas.otomasiAktif) }))
    .sort((a, b) => kirimEfektif(a.j).getTime() - kirimEfektif(b.j).getTime());

  const terbuka = (b: BarisJadwal) => b.j.status === "terjadwal" || b.j.status === "perlu_dilengkapi";
  const terpilih = baris.find((b) => b.j.id === p.j)
    ?? baris.find((b) => terbuka(b) && kirimEfektif(b.j) >= now)
    ?? baris[0]
    ?? null;

  return {
    filter: [
      { nama: "season" as const, label: "Season", nilai: seasonAktif, opsi: urutSeason.map((s) => ({ value: s, label: s })) },
      { nama: "program" as const, label: "Nama program", nilai: programAktif,
        opsi: [{ value: "", label: "Semua program" }, ...program.map((x) => ({ value: x, label: x }))] },
      { nama: "batch" as const, label: "Batch", nilai: batchAktif,
        opsi: [{ value: "", label: "Semua batch" }, ...kelasProgram.map((k) => ({ value: k.id, label: k.nama }))] },
      { nama: "jenis" as const, label: "Jenis jarkoman", nilai: jenisAktif,
        opsi: [{ value: "", label: "Semua" }, ...JENIS.map((x) => ({ value: x, label: LABEL_JENIS[x] }))] },
    ],
    seasonAktif,
    kelasTerpilih,
    baris,
    terpilih,
    perdana,
  };
}
