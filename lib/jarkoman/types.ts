export type Jenis = "h7" | "h1" | "pengingat" | "presensi";
export type Status =
  | "terjadwal"
  | "perlu_dilengkapi"
  | "notif_terkirim"
  | "sudah_dikirim"
  | "gagal"
  | "dilewati";

export interface Kelas {
  id: string;
  sourceId: string;
  nama: string;
  program: string;
  namaCourse: string;
  jenisKelas: "essentials" | "bnsp" | "plus";
  linkTna: string | null;
  linkGcal: string | null;
  linkIcal: string | null;
  linkDeck: string | null;
  linkStudentGuide: string | null;
  otomasiAktif: boolean;
}

export interface Sesi {
  id: string;
  sourceId: string;
  kelasId: string;
  nomor: number;
  topik: string | null;
  mulai: Date;
  zoomLink: string | null;
  meetingId: string | null;
  passcode: string | null;
  mentorNama: string | null;
  mentorProfil: string[];
  linkPresensi: string | null;
}
