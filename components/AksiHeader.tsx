"use client";
import { useRef, useState, useTransition } from "react";
import { aturOtomasi, laporKendala, sinkronSekarang, type HasilAksi } from "@/app/(dash)/actions";

function useAksi() {
  const [pending, start] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);
  const jalan = (fn: () => Promise<HasilAksi>, sukses?: string) =>
    start(async () => {
      const r = await fn();
      setPesan(r.ok ? sukses ?? null : r.pesan);
    });
  return { pending, pesan, jalan };
}

export function TombolSinkron() {
  const { pending, pesan, jalan } = useAksi();
  return (
    <div>
      <button disabled={pending} onClick={() => jalan(sinkronSekarang, "Data diperbarui")}
        className="text-xs font-semibold text-cta underline-offset-2 hover:underline disabled:opacity-60">
        {pending ? "Menyinkronkan…" : "Sinkron sekarang"}
      </button>
      {pesan && <p role="status" className="text-xs text-ink-muted">{pesan}</p>}
    </div>
  );
}

export function AksiHeader({ kelasIds, semuaAktif }: { kelasIds: string[]; semuaAktif: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [teks, setTeks] = useState("");
  const otomasi = useAksi();
  const kendala = useAksi();

  function toggleOtomasi() {
    const aktif = !semuaAktif;
    const tanya = aktif
      ? `Aktifkan notifikasi jarkoman untuk ${kelasIds.length} kelas? Admin akan menerima WhatsApp setiap jam kirim.`
      : `Hentikan notifikasi untuk ${kelasIds.length} kelas?`;
    if (confirm(tanya)) otomasi.jalan(() => aturOtomasi(kelasIds, aktif));
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button onClick={() => dialog.current?.showModal()}
          className="rounded-[16px] border border-ink/30 bg-kartu px-4 py-2.5 text-sm font-semibold hover:bg-latar">
          Laporkan Kendala
        </button>
        <button onClick={toggleOtomasi} disabled={otomasi.pending || kelasIds.length === 0}
          className={`rounded-[16px] px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
            semuaAktif ? "border border-ink/30 bg-kartu hover:bg-latar" : "bg-cta text-white hover:brightness-110"
          }`}>
          {semuaAktif ? "Hentikan Otomasi" : "Mulai Otomasi"}
        </button>
      </div>
      {otomasi.pesan && <p role="alert" className="text-xs text-oranye">{otomasi.pesan}</p>}

      <dialog ref={dialog} className="m-auto w-[min(92vw,28rem)] rounded-[20px] p-0 backdrop:bg-ink/40">
        <form method="dialog" className="space-y-3 p-6" onSubmit={(e) => {
          e.preventDefault();
          kendala.jalan(async () => {
            const r = await laporKendala(teks);
            if (r.ok) {
              setTeks("");
              dialog.current?.close();
            }
            return r;
          }, "Laporan terkirim");
        }}>
          <h2 className="text-xl">Laporkan Kendala</h2>
          <p className="text-sm text-ink-muted">Ceritakan apa yang tidak berjalan, misalnya notifikasi tidak masuk atau teks salah.</p>
          <textarea value={teks} onChange={(e) => setTeks(e.target.value)} rows={4} required aria-label="Isi kendala"
            placeholder="Tulis kendalanya di sini…" className="w-full rounded-xl border border-garis p-3 text-sm" />
          {kendala.pesan && <p role="alert" className="text-xs text-oranye">{kendala.pesan}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => dialog.current?.close()} className="rounded-[16px] px-4 py-2 text-sm">Batal</button>
            <button disabled={kendala.pending} className="rounded-[16px] bg-cta px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {kendala.pending ? "Mengirim…" : "Kirim laporan"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
