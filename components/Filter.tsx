"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface OpsiFilter {
  nama: "season" | "program" | "batch" | "jenis";
  label: string;
  nilai: string;
  opsi: { value: string; label: string }[];
}

// Ubah satu filter = buang filter turunannya dan pilihan jarkoman.
const TURUNAN: Record<OpsiFilter["nama"], string[]> = {
  season: ["program", "batch", "j"],
  program: ["batch", "j"],
  batch: ["j"],
  jenis: ["j"],
};

export function Filter({ filter }: { filter: OpsiFilter[] }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();

  function ubah(nama: OpsiFilter["nama"], nilai: string) {
    const q = new URLSearchParams(sp.toString());
    if (nilai) q.set(nama, nilai);
    else q.delete(nama);
    TURUNAN[nama].forEach((k) => q.delete(k));
    router.push(`${path}?${q.toString()}`);
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {filter.map((f) => (
        <label key={f.nama} className="text-xs font-semibold text-ink-muted">
          {f.label}
          <select value={f.nilai} onChange={(e) => ubah(f.nama, e.target.value)}
            className="mt-1 w-full rounded-xl border border-garis bg-kartu px-3 py-2.5 text-sm font-normal text-ink focus-visible:outline-2 focus-visible:outline-cta">
            {f.opsi.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
