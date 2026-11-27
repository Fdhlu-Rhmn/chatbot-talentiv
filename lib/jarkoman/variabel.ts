import type { JarkomanTersusun } from "./susun";
import { LABEL_FIELD, type Kategori } from "./template";
import type { Jenis, Status } from "./types";
import { jamTutupPresensi, keteranganHari, sapaan, tanggalPanjang, tanggalPendek } from "./waktu";

export interface Variabel {
  label: string;
  kategori: Kategori;
  nilai: string;
  // api = dari app.talentiv.id, manual = override admin, kosong = perlu dilengkapi, otomatis = dihitung sistem
  sumber: "api" | "manual" | "kosong" | "otomatis";
  entitas?: "kelas" | "sesi";
  entitasId?: string;
  field?: string;
  multiBaris?: boolean;
}

type Def = { field: string; entitas: "kelas" | "sesi"; kategori: Kategori; multiBaris?: boolean } | { label: string; kategori: Kategori; hitung: (t: JarkomanTersusun, perdana: Date) => string };

const DEF: Record<Jenis, Def[]> = {
  h7: [
    { field: "nama", entitas: "kelas", kategori: "kelas" },
    { label: "Hari, tanggal, jam sesi perdana", kategori: "waktu", hitung: (_, p) => tanggalPanjang(p) },
    { field: "linkTna", entitas: "kelas", kategori: "link" },
    { field: "linkGcal", entitas: "kelas", kategori: "link" },
    { field: "linkIcal", entitas: "kelas", kategori: "link" },
    { field: "namaCourse", entitas: "kelas", kategori: "kelas" },
    { field: "linkDeck", entitas: "kelas", kategori: "link" },
    { field: "linkStudentGuide", entitas: "kelas", kategori: "link" },
  ],
  h1: [],
  pengingat: [
    { label: "Sapaan waktu", kategori: "waktu", hitung: (t) => `Selamat ${sapaan(t.kirimAt)}` },
    { field: "topik", entitas: "sesi", kategori: "sesi" },
    { label: "Keterangan hari", kategori: "waktu", hitung: (t) => keteranganHari(t.kirimAt, t.sesi!.mulai) },
    { label: "Tanggal dan jam mulai", kategori: "waktu", hitung: (t) => tanggalPendek(t.sesi!.mulai) },
    { field: "zoomLink", entitas: "sesi", kategori: "link" },
    { field: "meetingId", entitas: "sesi", kategori: "link" },
    { field: "passcode", entitas: "sesi", kategori: "link" },
    { field: "mentorNama", entitas: "sesi", kategori: "sesi" },
    { field: "mentorProfil", entitas: "sesi", kategori: "sesi", multiBaris: true },
  ],
  presensi: [
    { label: "Sapaan waktu", kategori: "waktu", hitung: (t) => `Selamat ${sapaan(t.kirimAt).toLowerCase()}` },
    { field: "nama", entitas: "kelas", kategori: "kelas" },
    { label: "Sesi ke-", kategori: "sesi", hitung: (t) => `Sesi ${t.sesi!.nomor}` },
    { field: "linkPresensi", entitas: "sesi", kategori: "link" },
    { label: "Jam tutup presensi", kategori: "waktu", hitung: (t) => `${jamTutupPresensi(t.kirimAt)} WIB` },
  ],
};
DEF.h1 = DEF.h7;

export const JUMLAH_VARIABEL: Record<Jenis, number> = {
  h7: DEF.h7.length, h1: DEF.h1.length, pengingat: DEF.pengingat.length, presensi: DEF.presensi.length,
};

export function daftarVariabel(jenis: Jenis, t: JarkomanTersusun, perdana: Date): Variabel[] {
  return DEF[jenis].map((d) => {
    if ("hitung" in d) return { label: d.label, kategori: d.kategori, nilai: d.hitung(t, perdana), sumber: "otomatis" as const };
    const sumberObj = (d.entitas === "kelas" ? t.sumberKelas : t.sumberSesi) as Record<string, "api" | "manual"> | null;
    const obj = (d.entitas === "kelas" ? t.kelas : t.sesi) as unknown as Record<string, unknown>;
    const mentah = obj?.[d.field];
    const nilai = Array.isArray(mentah) ? mentah.join("\n") : ((mentah as string | null) ?? "");
    const sumber = sumberObj?.[d.field] === "manual" ? "manual" : nilai.trim() === "" ? "kosong" : "api";
    return {
      label: d.field === "mentorProfil" ? "Profil pembicara" : LABEL_FIELD[d.field] ?? d.field,
      kategori: d.kategori, nilai, sumber, entitas: d.entitas,
      entitasId: (obj?.id as string) ?? "", field: d.field, multiBaris: d.multiBaris,
    };
  });
}

export function statusTampil(status: Status, lengkap: boolean, otomasiAktif: boolean): string {
  switch (status) {
    case "terjadwal":
    case "perlu_dilengkapi":
      if (!lengkap) return "Perlu dilengkapi";
      return otomasiAktif ? "Siap kirim" : "Otomasi belum aktif";
    case "notif_terkirim":
      return "Notif terkirim";
    case "sudah_dikirim":
      return "Sudah dikirim";
    case "gagal":
      return "Gagal";
    case "dilewati":
      return "Dilewati";
  }
}
