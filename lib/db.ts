import type { SupabaseClient } from "@supabase/supabase-js";
import type { Override } from "@/lib/jarkoman/efektif";
import { rencanakanJarkoman, type JarkomanRow } from "@/lib/jarkoman/rencana";
import type { Kelas, Sesi } from "@/lib/jarkoman/types";
import { ambilDataSumber } from "@/lib/sumber";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient;
const tgl = (v: string | null) => (v ? new Date(v) : null);

export const keKelas = (r: any): Kelas => ({
  id: r.id, sourceId: r.source_id, nama: r.nama, program: r.program, namaCourse: r.nama_course, jenisKelas: r.jenis_kelas,
  linkTna: r.link_tna, linkGcal: r.link_gcal, linkIcal: r.link_ical, linkDeck: r.link_deck,
  linkStudentGuide: r.link_student_guide, otomasiAktif: r.otomasi_aktif,
});
export const keSesi = (r: any): Sesi => ({
  id: r.id, sourceId: r.source_id, kelasId: r.kelas_id, nomor: r.nomor, topik: r.topik, mulai: new Date(r.mulai),
  zoomLink: r.zoom_link, meetingId: r.meeting_id, passcode: r.passcode, mentorNama: r.mentor_nama,
  mentorProfil: r.mentor_profil ?? [], linkPresensi: r.link_presensi,
});
export const keJarkoman = (r: any): JarkomanRow & { id: string; confirmedAt: Date | null } => ({
  id: r.id, jenis: r.jenis, kelasId: r.kelas_id, sesiId: r.sesi_id, kirimAt: new Date(r.kirim_at),
  kirimAtManual: tgl(r.kirim_at_manual), status: r.status, notifiedAt: tgl(r.notified_at), remindedAt: tgl(r.reminded_at),
  confirmedAt: tgl(r.confirmed_at), percobaan: r.percobaan, error: r.error,
});
export const keOverride = (r: any): Override => ({ entitas: r.entitas, entitasId: r.entitas_id, field: r.field, nilai: r.nilai });

const dariJarkoman = (r: JarkomanRow) => ({
  jenis: r.jenis, kelas_id: r.kelasId, sesi_id: r.sesiId, kirim_at: r.kirimAt.toISOString(),
  kirim_at_manual: r.kirimAtManual?.toISOString() ?? null, status: r.status,
  notified_at: r.notifiedAt?.toISOString() ?? null, reminded_at: r.remindedAt?.toISOString() ?? null,
  percobaan: r.percobaan, error: r.error,
});

function cek<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function muatSemua(db: Db) {
  const [kelas, sesi, override, jarkoman, pengaturan] = await Promise.all([
    db.from("kelas").select("*").order("nama"),
    db.from("sesi").select("*").order("mulai"),
    db.from("override").select("*"),
    db.from("jarkoman").select("*").order("kirim_at"),
    db.from("pengaturan").select("*").eq("id", 1).single(),
  ]);
  return {
    kelas: cek(kelas).map(keKelas),
    sesi: cek(sesi).map(keSesi),
    override: cek(override).map(keOverride),
    jarkoman: cek(jarkoman).map(keJarkoman),
    pengaturan: cek(pengaturan) as { admin_wa: string | null; sinkron_terakhir: string | null },
  };
}

export async function jalankanSync(db: Db, now: Date) {
  const sumber = await ambilDataSumber();

  const kelasRows = cek(
    await db.from("kelas").upsert(
      sumber.kelas.map((k) => ({
        source_id: k.sourceId, nama: k.nama, program: k.program, nama_course: k.namaCourse, jenis_kelas: k.jenisKelas,
        link_tna: k.linkTna, link_gcal: k.linkGcal, link_ical: k.linkIcal, link_deck: k.linkDeck,
        link_student_guide: k.linkStudentGuide, diperbarui_at: now.toISOString(),
      })),
      { onConflict: "source_id" },
    ).select("*"),
  ).map(keKelas);
  const idKelas = new Map(kelasRows.map((k) => [k.sourceId, k.id]));

  const sesiRows = sumber.sesi.length
    ? cek(
        await db.from("sesi").upsert(
          sumber.sesi.map((s) => ({
            source_id: s.sourceId, kelas_id: idKelas.get(s.kelasSourceId), nomor: s.nomor, topik: s.topik,
            mulai: s.mulai.toISOString(), zoom_link: s.zoomLink, meeting_id: s.meetingId, passcode: s.passcode,
            mentor_nama: s.mentorNama, mentor_profil: s.mentorProfil, link_presensi: s.linkPresensi,
            diperbarui_at: now.toISOString(),
          })),
          { onConflict: "source_id" },
        ).select("*"),
      ).map(keSesi)
    : [];

  // ponytail: kelas yang hilang dari sumber dibiarkan; tambahkan penanda arsip kalau sumber mulai menghapus kelas.
  const ada = cek(await db.from("jarkoman").select("*").in("kelas_id", kelasRows.map((k) => k.id))).map(keJarkoman);
  let jumlah = 0;
  for (const k of kelasRows) {
    const rencana = rencanakanJarkoman(k, sesiRows.filter((s) => s.kelasId === k.id), ada.filter((j) => j.kelasId === k.id), now);
    const baru = rencana.filter((r) => !r.id).map(dariJarkoman);
    const lama = rencana.filter((r) => r.id).map((r) => ({ id: r.id, ...dariJarkoman(r) }));
    if (baru.length) cek(await db.from("jarkoman").insert(baru));
    if (lama.length) cek(await db.from("jarkoman").upsert(lama, { onConflict: "id" }));
    jumlah += rencana.length;
  }

  cek(await db.from("pengaturan").update({ sinkron_terakhir: now.toISOString() }).eq("id", 1));
  return { kelas: kelasRows.length, sesi: sesiRows.length, jarkoman: jumlah };
}
