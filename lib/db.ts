import type { SupabaseClient } from "@supabase/supabase-js";
import type { Override } from "@/lib/jarkoman/efektif";
import { ambilSemua } from "@/lib/ambil";
import { perubahanSync, rencanakanJarkoman, type JarkomanRow, type UbahSync } from "@/lib/jarkoman/rencana";
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

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const KOLOM_DB: Record<string, string> = {
  kirimAt: "kirim_at", kirimAtManual: "kirim_at_manual", status: "status", notifiedAt: "notified_at",
  remindedAt: "reminded_at", percobaan: "percobaan", error: "error",
};
const dariPatch = (p: UbahSync["patch"]) =>
  Object.fromEntries(Object.entries(p).map(([k, v]) => [KOLOM_DB[k], v instanceof Date ? iso(v) : v]));

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

const tabel = <T>(db: Db, nama: string, urut?: string) =>
  ambilSemua<T>((a, b) => {
    const q = db.from(nama).select("*");
    return (urut ? q.order(urut) : q.order("id")).range(a, b);
  });

export async function muatSemua(db: Db) {
  const [kelas, sesi, override, jarkoman, pengaturan] = await Promise.all([
    tabel(db, "kelas", "nama"),
    tabel(db, "sesi", "mulai"),
    tabel(db, "override"),
    tabel(db, "jarkoman", "kirim_at"),
    db.from("pengaturan").select("*").eq("id", 1).single(),
  ]);
  return {
    kelas: kelas.map(keKelas),
    sesi: sesi.map(keSesi),
    override: override.map(keOverride),
    jarkoman: jarkoman.map(keJarkoman),
    pengaturan: cek(pengaturan) as { admin_wa: string | null; sinkron_terakhir: string | null },
  };
}

// Dispatch hanya butuh jarkoman terbuka yang jatuh tempo dalam 24 jam (+ kelas/sesi/override-nya).
export async function muatUntukDispatch(db: Db, now: Date) {
  const batas = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const jarkoman = (
    await ambilSemua<Record<string, unknown>>((a, b) =>
      db.from("jarkoman").select("*").in("status", ["terjadwal", "perlu_dilengkapi"])
        .or(`kirim_at.lte.${batas},kirim_at_manual.lte.${batas}`).order("id").range(a, b),
    )
  ).map(keJarkoman);
  const kelasIds = [...new Set(jarkoman.map((j) => j.kelasId))];
  if (!kelasIds.length) return { kelas: [], sesi: [], override: [], jarkoman, adminWa: null as string | null };
  const [kelas, sesi, override, pengaturan] = await Promise.all([
    ambilSemua<Record<string, unknown>>((a, b) => db.from("kelas").select("*").in("id", kelasIds).order("id").range(a, b)),
    ambilSemua<Record<string, unknown>>((a, b) => db.from("sesi").select("*").in("kelas_id", kelasIds).order("id").range(a, b)),
    tabel<Record<string, unknown>>(db, "override"),
    db.from("pengaturan").select("admin_wa").eq("id", 1).single(),
  ]);
  return {
    kelas: kelas.map(keKelas),
    sesi: sesi.map(keSesi),
    override: override.map(keOverride),
    jarkoman,
    adminWa: (cek(pengaturan) as { admin_wa: string | null }).admin_wa,
  };
}

export async function jalankanSync(db: Db, now: Date) {
  const sumber = await ambilDataSumber();

  cek(
    await db.from("kelas").upsert(
      sumber.kelas.map((k) => ({
        source_id: k.sourceId, nama: k.nama, program: k.program, nama_course: k.namaCourse, jenis_kelas: k.jenisKelas,
        link_tna: k.linkTna, link_gcal: k.linkGcal, link_ical: k.linkIcal, link_deck: k.linkDeck,
        link_student_guide: k.linkStudentGuide, diperbarui_at: now.toISOString(),
      })),
      { onConflict: "source_id" },
    ),
  );
  const sourceIds = sumber.kelas.map((k) => k.sourceId);
  const kelasRows = (
    await ambilSemua<Record<string, unknown>>((a, b) => db.from("kelas").select("*").in("source_id", sourceIds).order("id").range(a, b))
  ).map(keKelas);
  const idKelas = new Map(kelasRows.map((k) => [k.sourceId, k.id]));

  // Sesi yang kelasnya tidak ada di sumber dilewati, jangan menggagalkan seluruh sync.
  const sesiSah = sumber.sesi.filter((s) => idKelas.has(s.kelasSourceId));
  for (let i = 0; i < sesiSah.length; i += 500) {
    cek(
      await db.from("sesi").upsert(
        sesiSah.slice(i, i + 500).map((s) => ({
          source_id: s.sourceId, kelas_id: idKelas.get(s.kelasSourceId), nomor: s.nomor, topik: s.topik,
          mulai: s.mulai.toISOString(), zoom_link: s.zoomLink, meeting_id: s.meetingId, passcode: s.passcode,
          mentor_nama: s.mentorNama, mentor_profil: s.mentorProfil, link_presensi: s.linkPresensi,
          diperbarui_at: now.toISOString(),
        })),
        { onConflict: "source_id" },
      ),
    );
  }
  const sesiSource = new Set(sesiSah.map((s) => s.sourceId));
  const kelasIds = kelasRows.map((k) => k.id);
  const sesiRows = (
    await ambilSemua<Record<string, unknown>>((a, b) => db.from("sesi").select("*").in("kelas_id", kelasIds).order("id").range(a, b))
  ).map(keSesi).filter((s) => sesiSource.has(s.sourceId));

  // ponytail: kelas yang hilang dari sumber dibiarkan; tambahkan penanda arsip kalau sumber mulai menghapus kelas.
  const ada = (
    await ambilSemua<Record<string, unknown>>((a, b) => db.from("jarkoman").select("*").in("kelas_id", kelasIds).order("id").range(a, b))
  ).map(keJarkoman);
  let ditulis = 0;
  for (const k of kelasRows) {
    const milik = ada.filter((j) => j.kelasId === k.id);
    const { baru, ubah } = perubahanSync(milik, rencanakanJarkoman(k, sesiRows.filter((s) => s.kelasId === k.id), milik, now));
    if (baru.length) cek(await db.from("jarkoman").insert(baru.map(dariJarkoman)));
    for (const u of ubah) {
      // Bersyarat: kalau dispatch/admin mengubah baris ini sejak dibaca, lewati (sync berikutnya menghitung ulang).
      let q = db.from("jarkoman").update(dariPatch(u.patch)).eq("id", u.id).eq("status", u.syarat.status);
      q = u.syarat.remindedAt ? q.eq("reminded_at", u.syarat.remindedAt.toISOString()) : q.is("reminded_at", null);
      cek(await q);
    }
    ditulis += baru.length + ubah.length;
  }

  cek(await db.from("pengaturan").update({ sinkron_terakhir: now.toISOString() }).eq("id", 1));
  return { kelas: kelasRows.length, sesi: sesiRows.length, jarkomanDitulis: ditulis };
}
