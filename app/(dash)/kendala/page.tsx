import { TombolStatusKendala } from "@/components/FormAdminWa";
import { JudulHalaman, Kartu } from "@/components/ui";
import { modeDemo } from "@/lib/data";
import { tanggalPendek } from "@/lib/jarkoman/waktu";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Kendala {
  id: string;
  teks: string;
  pelapor: string | null;
  dibuat_at: string;
  status: "baru" | "selesai";
}

export default async function LaporanKendala() {
  let daftar: Kendala[] = [];
  let galat: string | null = null;
  if (!modeDemo()) {
    const { data, error } = await (await supabaseServer()).from("kendala").select("*").order("dibuat_at", { ascending: false });
    daftar = (data as Kendala[]) ?? [];
    galat = error?.message ?? null;
  }
  return (
    <div className="max-w-3xl space-y-5">
      <JudulHalaman atas="Masukan dari admin" judul="Laporan Kendala" />
      <Kartu>
        {galat && <p role="alert" className="text-sm text-oranye">Gagal memuat laporan: {galat}</p>}
        {!galat && daftar.length === 0 && (
          <p className="text-sm text-ink-muted">
            Belum ada laporan. Gunakan tombol Laporkan Kendala di Dashboard kalau notifikasi atau teks jarkoman bermasalah.
          </p>
        )}
        <ul className="divide-y divide-garis">
          {daftar.map((k) => (
            <li key={k.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className={`whitespace-pre-wrap text-sm ${k.status === "selesai" ? "text-ink-muted line-through" : ""}`}>{k.teks}</p>
                <p className="text-xs text-ink-muted">{k.pelapor ?? "Tanpa nama"} · {tanggalPendek(new Date(k.dibuat_at))}</p>
              </div>
              <TombolStatusKendala id={k.id} status={k.status} />
            </li>
          ))}
        </ul>
      </Kartu>
    </div>
  );
}
