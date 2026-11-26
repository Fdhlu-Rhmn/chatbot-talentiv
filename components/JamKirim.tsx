"use client";
import { useState, useTransition } from "react";
import { ubahJamKirim } from "@/app/(dash)/actions";

export function JamKirim({ id, nilai, manual, terkunci }: { id: string; nilai: string; manual: boolean; terkunci: boolean }) {
  const [pending, start] = useTransition();
  const [pesan, setPesan] = useState<string | null>(null);
  const simpan = (v: string | null) =>
    start(async () => {
      const r = await ubahJamKirim(id, v);
      setPesan(r.ok ? null : r.pesan);
    });
  return (
    <div className="space-y-0.5">
      <input type="datetime-local" defaultValue={nilai} disabled={pending || terkunci} aria-label="Jadwal kirim (WIB)"
        onChange={(e) => e.target.value && simpan(e.target.value)}
        className="rounded-lg border border-garis bg-transparent px-2 py-1 text-xs disabled:opacity-60" />
      {manual && !terkunci && (
        <button onClick={() => simpan(null)} className="block text-[11px] text-cta hover:underline">Pakai jam default</button>
      )}
      {pesan && <p role="alert" className="text-[11px] text-oranye">{pesan}</p>}
    </div>
  );
}
