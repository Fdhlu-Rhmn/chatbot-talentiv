import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { renderJarkoman } from "@/lib/jarkoman/template";
import type { Kelas, Sesi } from "@/lib/jarkoman/types";
import { wib } from "@/lib/jarkoman/waktu";

const fixture = (n: string) => readFileSync(`tests/fixtures/${n}.txt`, "utf8").replace(/\r\n/g, "\n").replace(/\n$/, "");

const kelasBase: Kelas = {
  id: "k1", sourceId: "s-k1", nama: "HR Recruiter Fast Track Batch 6 ( November 2026 )", program: "HR Recruiter Fast Track",
  namaCourse: "HR Recruiter Fast Track Batch 6 ( November 2026 )", jenisKelas: "bnsp",
  linkTna: "https://forms.gle/vwpCTzfxfqXSY7Y47",
  linkGcal: "https://tinyurl.com/Gcal-RecruiterBNSP",
  linkIcal: "https://tinyurl.com/iCal-RecruiterBNSP",
  linkDeck: "https://docs.google.com/presentation/d/1AoO294-hdkTxthWB9M5ISuYyWJNTq4eY/edit?usp=drive_link&ouid=107070883553759115815&rtpof=true&sd=true",
  linkStudentGuide: "https://drive.google.com/file/d/1e60u9zqQ-eMmIxdT7F4IXyelXrVgBI2m/view?usp=drive_link",
  otomasiAktif: false,
};
const sesiBase: Sesi = {
  id: "s1", sourceId: "s-s1", kelasId: "k1", nomor: 1, topik: "Dasar Akuntansi", mulai: wib(2026, 11, 14, 9, 0),
  zoomLink: "https://us06web.zoom.us/j/85717449435?pwd=tJTCpedcE7qrOa4CloqOGkqKHllyaj.1",
  meetingId: "857 1744 9435", passcode: "sesi1", mentorNama: "Irfan Widyanto",
  mentorProfil: ["10+ years of experience in Finance Senior Corporate", "Internal Auditor at one of the largest hospital chains in Indonesia"],
  linkPresensi: "https://forms.gle/YvFwqxDH7fxrQ5oB8",
};

test("H-7 sama persis dengan brief, H-1 sama dengan H-7", () => {
  const ctx = { kelas: kelasBase, sesi: null, perdana: sesiBase, kirimAt: wib(2026, 11, 7, 10, 0) };
  const h7 = renderJarkoman("h7", ctx);
  expect(h7.teks).toBe(fixture("h7"));
  expect(h7.kosong).toEqual([]);
  expect(renderJarkoman("h1", ctx).teks).toBe(h7.teks);
  expect(h7.bagian.filter((b) => b.teks === kelasBase.nama).every((b) => b.kategori === "kelas")).toBe(true);
});

test("pengingat sama persis dengan brief", () => {
  const sesi = { ...sesiBase, mulai: wib(2026, 10, 6, 19, 30) };
  const r = renderJarkoman("pengingat", { kelas: kelasBase, sesi, perdana: sesi, kirimAt: wib(2026, 10, 6, 17, 0) });
  expect(r.teks).toBe(fixture("pengingat"));
});

test("presensi sama persis dengan brief", () => {
  const kelas = { ...kelasBase, nama: "Accounting & Tax Fast Track Batch 9" };
  const sesi = { ...sesiBase, mulai: wib(2026, 10, 6, 19, 30) };
  const r = renderJarkoman("presensi", { kelas, sesi, perdana: sesi, kirimAt: wib(2026, 10, 6, 21, 30) });
  expect(r.teks).toBe(fixture("presensi"));
});

test("field kosong ditandai", () => {
  const sesi = { ...sesiBase, linkPresensi: null };
  const r = renderJarkoman("presensi", { kelas: kelasBase, sesi, perdana: sesi, kirimAt: wib(2026, 11, 14, 11, 0) });
  expect(r.kosong).toEqual(["Link presensi"]);
  expect(r.teks).toContain("[Link presensi belum diisi]");
});
