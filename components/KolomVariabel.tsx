"use client";
import { useState, useTransition } from "react";
import { hapusOverride, simpanOverride, type HasilAksi } from "@/app/(dash)/actions";
import type { Variabel } from "@/lib/jarkoman/variabel";
import { LABEL_KATEGORI, STABILO } from "./ui";

const LABEL_SUMBER: Record<Variabel["sumber"], string> = {
  api: "dari API",
  manual: "diubah manual",
  kosong: "Perlu dilengkapi",
  otomatis: "dihitung otomatis",
};

function BarisVariabel({ v }: { v: Variabel }) {
  const [edit, setEdit] = useState(v.sumber === "kosong");
  const [nilai, setNilai] = useState(v.nilai);
  const [pesan, setPesan] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const kirim = (fn: () => Promise<HasilAksi>) =>
    start(async () => {
      const r = await fn();
      setPesan(r.ok ? null : r.pesan);
      if (r.ok) setEdit(false);
    });

  const bisaEdit = v.sumber !== "otomatis";
  const Input = v.multiBaris ? "textarea" : "input";
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${STABILO[v.kategori]}`}>{v.label}</span>
        <span className={`text-[11px] ${v.sumber === "kosong" ? "font-semibold text-oranye" : "text-ink-muted"}`}>
          {LABEL_SUMBER[v.sumber]}
        </span>
      </div>
      {edit && bisaEdit ? (
        <form className="flex gap-2" onSubmit={(e) => {
          e.preventDefault();
          kirim(() => simpanOverride(v.entitas!, v.entitasId!, v.field!, nilai));
        }}>
          <Input value={nilai} onChange={(e) => setNilai(e.target.value)} aria-label={v.label}
            placeholder={v.multiBaris ? "Satu baris per poin profil" : `Isi ${v.label.toLowerCase()}`}
            rows={v.multiBaris ? 3 : undefined}
            className={`min-w-0 flex-1 rounded-xl border bg-kartu px-3 py-2 text-sm ${v.sumber === "kosong" ? "border-oranye" : "border-garis"}`} />
          <button disabled={pending} className="rounded-[16px] bg-cta px-3 text-sm font-semibold text-white disabled:opacity-60">
            {pending ? "Menyimpan…" : "Simpan"}
          </button>
        </form>
      ) : (
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 truncate rounded-xl border border-garis bg-latar/60 px-3 py-2 text-sm" title={v.nilai}>
            {v.nilai}
          </p>
          {bisaEdit && (
            <button onClick={() => setEdit(true)} className="rounded-xl border border-garis px-2.5 py-2 text-xs hover:bg-latar"
              aria-label={`Ubah ${v.label}`}>
              Ubah
            </button>
          )}
        </div>
      )}
      {v.sumber === "manual" && (
        <button disabled={pending} onClick={() => kirim(() => hapusOverride(v.entitas!, v.entitasId!, v.field!))}
          className="text-xs text-cta underline-offset-2 hover:underline">
          Kembalikan ke data API
        </button>
      )}
      {pesan && <p role="alert" className="text-xs text-oranye">{pesan}</p>}
    </div>
  );
}

export function KolomVariabel({ judul, variabel }: { judul: string; variabel: Variabel[] }) {
  const kategori = [...new Set(variabel.map((v) => v.kategori))];
  return (
    <div className="space-y-4">
      <h2 className="text-lg">{judul}</h2>
      <div className="flex flex-wrap gap-3 text-[11px] text-ink-muted">
        {kategori.map((k) => (
          <span key={k} className="flex items-center gap-1">
            <span className={`inline-block size-2.5 rounded-sm ${STABILO[k]}`} /> {LABEL_KATEGORI[k]}
          </span>
        ))}
      </div>
      {variabel.map((v) => (
        <BarisVariabel key={`${v.entitasId}-${v.field ?? v.label}-${v.sumber}-${v.nilai}`} v={v} />
      ))}
    </div>
  );
}
