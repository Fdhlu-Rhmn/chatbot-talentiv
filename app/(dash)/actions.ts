"use server";
import { revalidatePath } from "next/cache";
import { modeDemo } from "@/lib/data";
import { jalankanSync } from "@/lib/db";
import { dariInputWib } from "@/lib/jarkoman/waktu";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { normalisasiNomor } from "@/lib/wa";

export type HasilAksi = { ok: true } | { ok: false; pesan: string };

const DEMO: HasilAksi = { ok: false, pesan: "Mode demo: database belum tersambung, perubahan tidak disimpan." };

type HasilDb = { error: { message: string } | null } | void;
async function jalankan(fn: (db: Awaited<ReturnType<typeof supabaseServer>>) => PromiseLike<HasilDb>): Promise<HasilAksi> {
  if (modeDemo()) return DEMO;
  const db = await supabaseServer();
  const { data } = await db.auth.getUser();
  if (!data.user) return { ok: false, pesan: "Sesi login habis. Masuk lagi." };
  const r = await fn(db);
  if (r && r.error) return { ok: false, pesan: r.error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

const FIELD_KELAS = ["nama", "namaCourse", "linkTna", "linkGcal", "linkIcal", "linkDeck", "linkStudentGuide"];
const FIELD_SESI = ["topik", "zoomLink", "meetingId", "passcode", "mentorNama", "mentorProfil", "linkPresensi"];
const fieldSah = (entitas: string, field: string) =>
  (entitas === "kelas" && FIELD_KELAS.includes(field)) || (entitas === "sesi" && FIELD_SESI.includes(field));

export async function simpanOverride(entitas: "kelas" | "sesi", entitasId: string, field: string, nilai: string) {
  if (!fieldSah(entitas, field)) return { ok: false, pesan: "Field tidak dikenal" } as HasilAksi;
  if (!nilai.trim()) return hapusOverride(entitas, entitasId, field);
  return jalankan(async (db) => {
    const { data } = await db.auth.getUser();
    return db.from("override").upsert(
      { entitas, entitas_id: entitasId, field, nilai: nilai.trim(), oleh: data.user?.email ?? null, diperbarui_at: new Date().toISOString() },
      { onConflict: "entitas,entitas_id,field" },
    );
  });
}

export async function hapusOverride(entitas: "kelas" | "sesi", entitasId: string, field: string) {
  return jalankan((db) => db.from("override").delete().match({ entitas, entitas_id: entitasId, field }));
}

export async function ubahJamKirim(jarkomanId: string, nilai: string | null) {
  const t = nilai ? dariInputWib(nilai) : null;
  if (nilai && !t) return { ok: false, pesan: "Format jam tidak valid" } as HasilAksi;
  // Jam baru = jadwal baru: buka lagi notifikasi & pengingat.
  return jalankan((db) =>
    db.from("jarkoman").update({
      kirim_at_manual: t?.toISOString() ?? null, status: "terjadwal", notified_at: null, reminded_at: null, percobaan: 0, error: null,
    }).eq("id", jarkomanId).neq("status", "sudah_dikirim"),
  );
}

export async function aturOtomasi(kelasIds: string[], aktif: boolean) {
  return jalankan((db) => db.from("kelas").update({ otomasi_aktif: aktif }).in("id", kelasIds));
}

export async function sinkronSekarang(): Promise<HasilAksi> {
  return jalankan(async () => {
    try {
      await jalankanSync(supabaseAdmin(), new Date());
    } catch (e) {
      return { error: { message: (e as Error).message } };
    }
  });
}

export async function laporKendala(teks: string) {
  if (!teks.trim()) return { ok: false, pesan: "Tulis kendalanya dulu" } as HasilAksi;
  return jalankan(async (db) => {
    const { data } = await db.auth.getUser();
    return db.from("kendala").insert({ teks: teks.trim(), pelapor: data.user?.email ?? null });
  });
}

export async function tandaiSudahDikirim(jarkomanId: string) {
  return jalankan((db) =>
    db.from("jarkoman").update({ status: "sudah_dikirim", confirmed_at: new Date().toISOString() }).eq("id", jarkomanId),
  );
}

export async function simpanAdminWa(nomor: string) {
  const n = normalisasiNomor(nomor);
  if (!n) return { ok: false, pesan: "Nomor harus format Indonesia, contoh 6281234567890" } as HasilAksi;
  return jalankan((db) => db.from("pengaturan").update({ admin_wa: n }).eq("id", 1));
}

export async function ubahStatusKendala(id: string, status: "baru" | "selesai") {
  return jalankan((db) => db.from("kendala").update({ status }).eq("id", id));
}
