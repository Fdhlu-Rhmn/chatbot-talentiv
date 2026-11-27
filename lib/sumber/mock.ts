import { wib } from "@/lib/jarkoman/waktu";
import type { DataSumber, KelasSumber, SesiSumber } from "./index";

// Contoh data dari brief / Rekap Tim LO. Dipakai sampai akses Supabase app.talentiv.id tersedia.
const HARI = 24 * 60 * 60 * 1000;

const kelas: KelasSumber[] = [
  {
    sourceId: "mock-hr-6",
    nama: "HR Recruiter Fast Track Batch 6 ( November 2026 )",
    program: "HR Recruiter Fast Track",
    namaCourse: "HR Recruiter Fast Track Batch 6 ( November 2026 )",
    jenisKelas: "bnsp",
    linkTna: "https://forms.gle/vwpCTzfxfqXSY7Y47",
    linkGcal: "https://tinyurl.com/Gcal-RecruiterBNSP",
    linkIcal: "https://tinyurl.com/iCal-RecruiterBNSP",
    linkDeck: "https://docs.google.com/presentation/d/1AoO294-hdkTxthWB9M5ISuYyWJNTq4eY/edit?usp=drive_link&ouid=107070883553759115815&rtpof=true&sd=true",
    linkStudentGuide: "https://drive.google.com/file/d/1e60u9zqQ-eMmIxdT7F4IXyelXrVgBI2m/view?usp=drive_link",
  },
  {
    sourceId: "mock-da-7",
    nama: "Data Analyst Fast Track Batch 7 ( November 2026 )",
    program: "Data Analyst Fast Track",
    namaCourse: "Data Analyst Fast Track Batch 7 ( November 2026 )",
    jenisKelas: "essentials",
    linkTna: "https://forms.gle/contohTnaDA7",
    linkGcal: "https://tinyurl.com/Gcal-DataAnalyst7",
    linkIcal: "https://tinyurl.com/iCal-DataAnalyst7",
    linkDeck: null,
    linkStudentGuide: "https://drive.google.com/file/d/contohStudentGuide/view",
  },
  {
    sourceId: "mock-at-9",
    nama: "Accounting & Tax Fast Track Batch 9",
    program: "Accounting & Tax Fast Track",
    namaCourse: "Accounting & Tax Fast Track Batch 9",
    jenisKelas: "plus",
    linkTna: "https://forms.gle/contohTnaAT9",
    linkGcal: "https://tinyurl.com/Gcal-AccountingTax9",
    linkIcal: "https://tinyurl.com/iCal-AccountingTax9",
    linkDeck: "https://docs.google.com/presentation/d/contohDeckAT9",
    linkStudentGuide: "https://drive.google.com/file/d/contohGuideAT9/view",
  },
];

const TOPIK_AT = ["Dasar Akuntansi", "Siklus Akuntansi", "Laporan Keuangan", "PPh 21", "PPN", "Rekonsiliasi Fiskal", "e-Faktur & e-Bupot", "Studi Kasus"];

function sesiMingguan(kelasSourceId: string, mulai: Date, langkahHari: number[], topik: string[], mentor: string, profil: string[]): SesiSumber[] {
  const hasil: SesiSumber[] = [];
  let t = mulai.getTime();
  for (let i = 0; i < 8; i++) {
    hasil.push({
      sourceId: `${kelasSourceId}-s${i + 1}`,
      kelasSourceId,
      nomor: i + 1,
      topik: topik[i] ?? `Sesi ${i + 1}`,
      mulai: new Date(t),
      zoomLink: `https://us06web.zoom.us/j/8571744943${i}?pwd=contoh`,
      meetingId: `857 1744 943${i}`,
      passcode: `sesi${i + 1}`,
      mentorNama: mentor,
      mentorProfil: profil,
      linkPresensi: `https://forms.gle/presensi-${kelasSourceId}-${i + 1}`,
    });
    t += langkahHari[i % langkahHari.length] * HARI;
  }
  return hasil;
}

export function dataMock(): DataSumber {
  const sesi = [
    ...sesiMingguan("mock-hr-6", wib(2026, 11, 14, 9, 0), [7], ["Onboarding Program", "Workforce Planning", "Job Analysis", "Sourcing", "Screening", "Interview", "Offering", "Ujian BNSP"],
      "Rina Kusuma", ["8+ years as Talent Acquisition Lead", "Certified BNSP Recruiter Assessor"]),
    ...sesiMingguan("mock-da-7", wib(2026, 11, 28, 9, 0), [7], ["Onboarding Program", "Excel untuk Analisis", "SQL Dasar", "SQL Lanjutan", "Visualisasi Data", "Python Dasar", "Statistik", "Final Project"],
      "Dimas Pratama", ["Data Analyst Lead at e-commerce unicorn", "6+ years in analytics"]),
    ...sesiMingguan("mock-at-9", wib(2026, 11, 17, 19, 30), [2, 5], TOPIK_AT, "Irfan Widyanto",
      ["10+ years of experience in Finance Senior Corporate", "Internal Auditor at one of the largest hospital chains in Indonesia"]),
  ];
  // Contoh data belum lengkap: link presensi sesi 3 Data Analyst kosong.
  sesi.find((s) => s.sourceId === "mock-da-7-s3")!.linkPresensi = null;
  return { kelas, sesi };
}
