"use client";
import { useState, useTransition } from "react";
import { simpanAdminWa, ubahStatusKendala } from "@/app/(dash)/actions";

export function FormAdminWa({ awal }: { awal: string }) {
  const [nilai, setNilai] = useState(awal);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="space-y-3" onSubmit={(e) => {
      e.preventDefault();
      start(async () => {
        const r = await simpanAdminWa(nilai);
        setPesan(r.ok ? "Nomor admin tersimpan" : r.pesan);
      });
    }}>
      <label className="block text-sm font-medium">
        Nomor WhatsApp admin penerima notifikasi
        <input value={nilai} onChange={(e) => setNilai(e.target.value)} inputMode="tel" placeholder="6281234567890"
          className="mt-1.5 block w-full max-w-xs rounded-xl border border-garis px-3 py-2.5 font-normal focus-visible:outline-2 focus-visible:outline-cta" />
      </label>
      <button disabled={pending} className="rounded-[16px] bg-cta px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Menyimpan…" : "Simpan nomor"}
      </button>
      {pesan && <p role="status" className="text-sm text-ink-muted">{pesan}</p>}
    </form>
  );
}

export function TombolStatusKendala({ id, status }: { id: string; status: "baru" | "selesai" }) {
  const [pending, start] = useTransition();
  const [galat, setGalat] = useState<string | null>(null);
  const ke = status === "baru" ? "selesai" : "baru";
  return (
    <>
      <button disabled={pending} onClick={() => start(async () => {
        const r = await ubahStatusKendala(id, ke);
        setGalat(r.ok ? null : r.pesan);
      })} className="rounded-xl border border-garis px-2.5 py-1 text-xs hover:bg-latar disabled:opacity-60">
        {status === "baru" ? "Tandai selesai" : "Buka lagi"}
      </button>
      {galat && <p role="alert" className="text-[11px] text-oranye">{galat}</p>}
    </>
  );
}
