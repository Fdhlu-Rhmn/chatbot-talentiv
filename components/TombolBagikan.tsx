"use client";
import { useState, useTransition } from "react";
import { tandaiSudahDikirim } from "@/app/(dash)/actions";
import { GAMBAR_H7 } from "@/lib/aset";

const TOMBOL = "flex min-h-11 w-full items-center justify-center rounded-[16px] px-4 text-base font-semibold";

export function TombolBagikan({ id, teks, gambar, sudah }: { id: string; teks: string; gambar: boolean; sudah: boolean }) {
  const [info, setInfo] = useState<string | null>(null);
  const [selesai, setSelesai] = useState(sudah);
  const [pending, start] = useTransition();

  async function salin() {
    try {
      await navigator.clipboard.writeText(teks);
      setInfo("Teks tersalin. Tempel di grup WhatsApp kelas.");
    } catch {
      setInfo("Browser menolak menyalin otomatis. Tekan lama teks di atas, lalu Salin.");
    }
  }

  async function bagikan() {
    try {
      const blob = await (await fetch(GAMBAR_H7)).blob();
      const file = new File([blob], GAMBAR_H7.slice(1), { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: teks });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    setInfo("Perangkat ini tidak bisa membagikan gambar langsung. Unduh gambar, lalu salin teks.");
  }

  return (
    <div className="space-y-2">
      {gambar && (
        <button onClick={bagikan} className={`${TOMBOL} bg-cta text-white`}>Bagikan gambar + teks</button>
      )}
      <button onClick={salin} className={`${TOMBOL} ${gambar ? "border border-ink/30 bg-kartu" : "bg-cta text-white"}`}>
        Salin teks
      </button>
      <a href={`https://wa.me/?text=${encodeURIComponent(teks)}`} target="_blank" rel="noopener noreferrer"
        className={`${TOMBOL} border border-ink/30 bg-kartu`}>
        Buka WhatsApp
      </a>
      {gambar && (
        <a href={GAMBAR_H7} download className="block text-center text-sm text-cta underline">Unduh gambar</a>
      )}
      {info && <p role="status" className="text-center text-sm text-ink-muted">{info}</p>}
      <button disabled={selesai || pending}
        onClick={() => start(async () => {
          const r = await tandaiSudahDikirim(id);
          if (r.ok) setSelesai(true);
          else setInfo(r.pesan);
        })}
        className={`${TOMBOL} mt-4 border-2 border-cta text-cta disabled:border-garis disabled:text-ink-muted`}>
        {selesai ? "Sudah dikirim" : pending ? "Menyimpan…" : "Tandai sudah dikirim ke grup"}
      </button>
    </div>
  );
}
