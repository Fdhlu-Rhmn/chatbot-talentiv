import type { Kelas, Sesi } from "@/lib/jarkoman/types";
import { dataMock } from "./mock";

export type KelasSumber = Omit<Kelas, "id" | "otomasiAktif">;
export type SesiSumber = Omit<Sesi, "id" | "kelasId"> & { kelasSourceId: string };
export interface DataSumber {
  kelas: KelasSumber[];
  sesi: SesiSumber[];
}

// Adapter data app.talentiv.id. Isi cabang "supabase" setelah akses view v_jarkoman_sesi didapat.
export async function ambilDataSumber(): Promise<DataSumber> {
  const mode = process.env.SUMBER_DATA ?? "mock";
  if (mode === "mock") return dataMock();
  throw new Error("Sumber Supabase app.talentiv.id belum dikonfigurasi");
}
