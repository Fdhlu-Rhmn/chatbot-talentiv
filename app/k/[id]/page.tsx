import Link from "next/link";
import { notFound } from "next/navigation";
import { TombolBagikan } from "@/components/TombolBagikan";
import { muatDashboard } from "@/lib/data";
import { LABEL_JENIS, susunJarkoman } from "@/lib/jarkoman/susun";
import { tanggalPendek } from "@/lib/jarkoman/waktu";

export const dynamic = "force-dynamic";

// Halaman yang dibuka admin dari notifikasi WhatsApp (HP). Login wajib lewat middleware.
export default async function SiapKirim({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await muatDashboard();
  const j = data.jarkoman.find((x) => x.id === id);
  const t = j && susunJarkoman(data, j);
  if (!j || !t) notFound();
  const gambar = j.jenis === "h7" || j.jenis === "h1";

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-10">
      <header>
        <p className="text-sm text-ink-muted">{LABEL_JENIS[j.jenis]} · {t.sesi ? `Sesi ${t.sesi.nomor}` : "Sesi perdana"}</p>
        <h1 className="mt-1 text-xl leading-snug">{t.kelas.nama}</h1>
        <p className="text-sm text-ink-muted">Jadwal kirim {tanggalPendek(t.kirimAt)}</p>
      </header>

      {t.hasil.kosong.length > 0 && (
        <div role="alert" className="rounded-xl bg-[#FDE8D7] p-3 text-sm text-[#8A3B08]">
          <p className="font-semibold">Data belum lengkap: {t.hasil.kosong.join(", ")}</p>
          <Link href={`/?j=${j.id}`} className="underline">Lengkapi di dashboard</Link> sebelum mengirim.
        </div>
      )}

      <pre className="whitespace-pre-wrap break-words rounded-[20px] border border-garis bg-kartu p-4 font-teks text-[15px] leading-relaxed">
        {t.hasil.teks}
      </pre>

      <TombolBagikan id={j.id} teks={t.hasil.teks} gambar={gambar} sudah={j.status === "sudah_dikirim"} />

      <Link href="/" className="block text-center text-sm text-ink-muted underline">Buka dashboard</Link>
    </main>
  );
}
