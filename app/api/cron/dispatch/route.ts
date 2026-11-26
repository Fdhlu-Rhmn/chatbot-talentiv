import { cronSah } from "@/lib/cron";
import { muatUntukDispatch } from "@/lib/db";
import { MAKS_PERCOBAAN, pilihAksi, type BarisDispatch } from "@/lib/jarkoman/dispatch";
import { LABEL_JENIS, susunJarkoman } from "@/lib/jarkoman/susun";
import { tanggalPendek } from "@/lib/jarkoman/waktu";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { kirimTemplate } from "@/lib/wa";

export async function POST(req: Request) {
  if (!cronSah(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const db = supabaseAdmin();
  const now = new Date();

  // Klaim yang macet karena proses sebelumnya mati: buka lagi supaya dicoba ulang.
  const sapu = await db.rpc("sapu_klaim_macet");
  if (sapu.error) return Response.json({ error: sapu.error.message }, { status: 500 });

  const data = await muatUntukDispatch(db, now);
  const admin = data.adminWa;
  if (!admin) return Response.json({ skip: "nomor admin belum diisi atau tidak ada jarkoman jatuh tempo" });

  const tersusun = new Map(data.jarkoman.map((j) => [j.id, { j, s: susunJarkoman(data, j, now) }]));
  const baris: BarisDispatch[] = [];
  for (const { j, s } of tersusun.values()) {
    if (!s) continue;
    baris.push({
      id: j.id, jenis: j.jenis, status: j.status, kirimAt: s.kirimAt, mulai: s.mulai, otomasiAktif: s.kelas.otomasiAktif,
      lengkap: s.hasil.kosong.length === 0, remindedAt: j.remindedAt, percobaan: j.percobaan,
    });
  }
  const aksi = pilihAksi(now, baris);
  const appUrl = process.env.APP_URL ?? "";
  const hasil = { notif: 0, ingat: 0, gagal: 0, dilewati: aksi.lewati.length };
  const labelSesi = (n: number | undefined) => (n ? `Sesi ${n}` : "Sesi perdana");

  if (aksi.lewati.length) {
    await db.from("jarkoman").update({ status: "dilewati" }).in("id", aksi.lewati).in("status", ["terjadwal", "perlu_dilengkapi"]);
  }

  if (aksi.notif.length) {
    // Klaim atomik: kalau cron jalan dobel, hanya satu pemanggilan yang mendapat barisnya.
    const { data: diklaim, error } = await db.rpc("klaim_notif", { ids: aksi.notif });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    for (const row of diklaim as { id: string }[]) {
      const { j, s } = tersusun.get(row.id)!;
      const jenis = (s!.hasil.kosong.length ? "⚠️ data belum lengkap · " : "") + LABEL_JENIS[j.jenis];
      const r = await kirimTemplate("jarkoman_siap_kirim", admin, [
        jenis, s!.kelas.nama, labelSesi(s!.sesi?.nomor), tanggalPendek(s!.kirimAt).replace(" WIB", ""), `${appUrl}/k/${j.id}`,
      ]);
      if (r.ok) {
        await db.from("jarkoman").update({ wa_message_id: r.id, error: null }).eq("id", j.id);
        hasil.notif++;
      } else {
        const percobaan = j.percobaan + 1;
        await db.from("jarkoman").update({
          status: percobaan >= MAKS_PERCOBAAN ? "gagal" : j.status,
          notified_at: null,
          percobaan,
          error: r.error,
        }).eq("id", j.id);
        hasil.gagal++;
      }
    }
  }

  if (aksi.ingat.length) {
    const { data: ditandai } = await db.from("jarkoman").update({ reminded_at: now.toISOString() })
      .in("id", aksi.ingat).is("reminded_at", null).select("id");
    for (const { id } of ditandai ?? []) {
      const { j, s } = tersusun.get(id)!;
      const r = await kirimTemplate("jarkoman_perlu_dilengkapi", admin, [
        LABEL_JENIS[j.jenis], s!.kelas.nama, labelSesi(s!.sesi?.nomor), s!.hasil.kosong.join(", "), `${appUrl}/?j=${id}`,
      ]);
      if (r.ok) hasil.ingat++;
      // Gagal kirim: buka lagi supaya dicoba menit berikutnya.
      else await db.from("jarkoman").update({ reminded_at: null, error: r.error }).eq("id", id);
    }
  }

  return Response.json(hasil);
}
