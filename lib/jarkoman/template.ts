import type { Jenis, Kelas, Sesi } from "./types";
import { jamTutupPresensi, keteranganHari, sapaan, tanggalPanjang, tanggalPendek } from "./waktu";

export type Kategori = "kelas" | "waktu" | "link" | "sesi";
export interface Bagian {
  teks: string;
  kategori?: Kategori;
}
export interface HasilRender {
  teks: string;
  bagian: Bagian[];
  kosong: string[];
}
export interface KonteksRender {
  kelas: Kelas;
  sesi: Sesi | null;
  perdana: Sesi;
  kirimAt: Date;
}

export const LABEL_FIELD: Record<string, string> = {
  nama: "Nama kelas",
  namaCourse: "Nama course di LMS",
  linkTna: "Link TNA",
  linkGcal: "Link GCal",
  linkIcal: "Link iCal",
  linkDeck: "Deck Onboarding",
  linkStudentGuide: "Student Guide",
  topik: "Topik sesi",
  zoomLink: "Link Zoom",
  meetingId: "Meeting ID",
  passcode: "Passcode",
  mentorNama: "Nama pembicara",
  linkPresensi: "Link presensi",
};

class Penyusun {
  bagian: Bagian[] = [];
  kosong: string[] = [];
  t(teks: string) {
    this.bagian.push({ teks });
    return this;
  }
  v(nilai: string | null | undefined, kategori: Kategori, field?: string) {
    if (nilai === null || nilai === undefined || nilai.trim() === "") {
      const label = field ? LABEL_FIELD[field] ?? field : "Data";
      if (!this.kosong.includes(label)) this.kosong.push(label);
      this.bagian.push({ teks: `[${label} belum diisi]`, kategori });
    } else {
      this.bagian.push({ teks: nilai, kategori });
    }
    return this;
  }
  hasil(): HasilRender {
    return { teks: this.bagian.map((b) => b.teks).join(""), bagian: this.bagian, kosong: this.kosong };
  }
}

function h7(p: Penyusun, { kelas, perdana }: KonteksRender) {
  p.t("Halo rekan-rekan, Selamat datang di ").v(kelas.nama, "kelas", "nama").t("! 👋🏻\n\n")
    .t("📅 Sesi Perdana akan dilaksanakan pada: ").v(tanggalPanjang(perdana.mulai), "waktu").t("\n\n")
    .t("Sebelum kelas dimulai, mohon ikuti langkah-langkah di bawah ini.\n📝 Mengisi Training Need Analysis (TNA)\n")
    .v(kelas.linkTna, "link", "linkTna").t("\n\n")
    .t("📅 Subscribe Google Calendar\n* GCal (Windows/Android): ").v(kelas.linkGcal, "link", "linkGcal")
    .t("\n* iCal (Apple): ").v(kelas.linkIcal, "link", "linkIcal").t("\n\n")
    .t('💻 Akses LMS Talentiv\nLogin https://edu.talentiv.id/ menggunakan email yang digunakan ketika melakukan pendaftaran, klik "Courses", lalu klik ')
    .v(kelas.namaCourse, "kelas", "namaCourse").t("\n\n")
    .t("📚 Panduan Peserta:\n* Deck Onboarding: ").v(kelas.linkDeck, "link", "linkDeck")
    .t("\n* Student Guide: ").v(kelas.linkStudentGuide, "link", "linkStudentGuide")
    .t("\n❓ FAQ Peserta\nMasih bingung? Silakan cek informasi di FAQ Peserta terlebih dahulu. Jika belum tersedia, silakan tanyakan kepada admin 😊\nhttps://intip.in/FAQPeserta\n\n")
    .t("📌 Link Zoom akan dibagikan di grup menjelang kelas dimulai.\n\n")
    .t("Sampai jumpa di sesi perdana! Semangat belajar dan sampai bertemu di kelas! 🚀📚");
}

function pengingat(p: Penyusun, { sesi, kirimAt }: KonteksRender) {
  const s = sesi!;
  p.v(`Selamat ${sapaan(kirimAt)}`, "waktu").t("✨\n\n")
    .t("Tania ingin mengingatkan rekan-rekan, bahwa kelas ").v(s.topik, "sesi", "topik")
    .t(" akan dilaksanakan ").v(keteranganHari(kirimAt, s.mulai), "waktu").t(" ")
    .v(tanggalPendek(s.mulai), "waktu")
    .t(" - selesai melalui Zoom Meeting. Berikut adalah link Zoom untuk kelas ").v(`sesi ${s.nomor}`, "sesi").t(" kita:\n")
    .v(s.zoomLink, "link", "zoomLink").t("\n\n")
    .t("Meeting ID: ").v(s.meetingId, "link", "meetingId").t("\n")
    .t("Passcode: ").v(s.passcode, "link", "passcode").t("\n\n")
    .t("👤 Pembicara: ").v(s.mentorNama ? `*${s.mentorNama}*` : null, "sesi", "mentorNama");
  for (const baris of s.mentorProfil) p.t("\n").v(`* ${baris}`, "sesi");
  p.t("\n\nJangan lupa mempersiapkan pertanyaan-pertanyaan yang ingin ditanyakan ya…\nSee you!! 💫");
}

function presensi(p: Penyusun, { kelas, sesi, kirimAt }: KonteksRender) {
  const s = sesi!;
  p.v(`Selamat ${sapaan(kirimAt).toLowerCase()}`, "waktu").t(", rekan-rekan!\n\n")
    .t("Terima kasih sudah berpartisipasi pada kelas ").v(kelas.nama, "kelas", "nama").t(" ")
    .v(`Sesi ${s.nomor}`, "sesi").t(" 🙌\nSilakan mengisi presensi dan feedback melalui link berikut:\n🔗 ")
    .v(s.linkPresensi, "link", "linkPresensi").t("\n\n")
    .t("⏰ Presensi akan ditutup pukul ").v(jamTutupPresensi(kirimAt), "waktu")
    .t(" WIB, jadi pastikan untuk mengisinya tepat waktu ya!\n\n")
    .t("📝 Notes: Mohon mengisi presensi menggunakan nama lengkap sesuai data pendaftaran, karena nama pada presensi akan digunakan sebagai acuan dalam penerbitan sertifikat.\n\n")
    .t("Semangat & sukses selalu! ✨");
}

export function renderJarkoman(jenis: Jenis, ctx: KonteksRender): HasilRender {
  const p = new Penyusun();
  if (jenis === "h7" || jenis === "h1") h7(p, ctx);
  else if (!ctx.sesi) throw new Error(`Jarkoman ${jenis} butuh data sesi`);
  else if (jenis === "pengingat") pengingat(p, ctx);
  else presensi(p, ctx);
  return p.hasil();
}
