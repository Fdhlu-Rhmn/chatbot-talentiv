import "server-only";
import { muatSemua } from "@/lib/db";
import { rencanakanJarkoman } from "@/lib/jarkoman/rencana";
import type { Kelas, Sesi } from "@/lib/jarkoman/types";
import { dataMock } from "@/lib/sumber/mock";
import { supabaseServer } from "@/lib/supabase/server";

// Mode demo: belum ada Supabase. Dashboard memakai data contoh di memori, tidak bisa menyimpan.
export const modeDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL;

export type DataDashboard = Awaited<ReturnType<typeof muatSemua>>;

function dataDemo(): DataDashboard {
  const m = dataMock();
  const now = new Date();
  const kelas: Kelas[] = m.kelas.map((k) => ({ ...k, id: k.sourceId, otomasiAktif: false }));
  const sesi: Sesi[] = m.sesi.map(({ kelasSourceId, ...s }) => ({ ...s, id: s.sourceId, kelasId: kelasSourceId }));
  const jarkoman = kelas.flatMap((k) =>
    rencanakanJarkoman(k, sesi.filter((s) => s.kelasId === k.id), [], now).map((r) => ({
      ...r, id: `${r.jenis}--${r.sesiId ?? r.kelasId}`, confirmedAt: null,
    })),
  );
  return { kelas, sesi, override: [], jarkoman, pengaturan: { admin_wa: null, sinkron_terakhir: null } };
}

export async function muatDashboard(): Promise<DataDashboard> {
  if (modeDemo()) return dataDemo();
  return muatSemua(await supabaseServer());
}
