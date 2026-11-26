import Link from "next/link";
import { bagianWib, jamWib, wib } from "@/lib/jarkoman/waktu";

export interface ItemKalender {
  id: string;
  mulai: Date;
  judul: string;
  sub: string;
  warna: string;
  bentrok: boolean;
}

const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const isoTgl = (t: Date) => {
  const { y, m, d } = bagianWib(t);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

export function KalenderMinggu({ senin, item, hrefMinggu }: { senin: Date; item: ItemKalender[]; hrefMinggu: (iso: string) => string }) {
  const { y, m, d } = bagianWib(senin);
  const hari = HARI.map((nama, i) => ({ nama, tgl: wib(y, m, d + i) }));
  const geser = (n: number) => isoTgl(wib(y, m, d + n));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={hrefMinggu(geser(-7))} className="rounded-xl border border-garis px-3 py-1.5 text-sm hover:bg-latar">Minggu sebelumnya</Link>
        <p className="text-sm font-semibold">
          {bagianWib(hari[0].tgl).d}/{bagianWib(hari[0].tgl).m} – {bagianWib(hari[6].tgl).d}/{bagianWib(hari[6].tgl).m}/{bagianWib(hari[6].tgl).y}
        </p>
        <Link href={hrefMinggu(geser(7))} className="rounded-xl border border-garis px-3 py-1.5 text-sm hover:bg-latar">Minggu berikutnya</Link>
      </div>
      <div className="grid gap-2 overflow-x-auto md:grid-cols-7">
        {hari.map((h) => {
          const isi = item.filter((x) => isoTgl(x.mulai) === isoTgl(h.tgl)).sort((a, b) => a.mulai.getTime() - b.mulai.getTime());
          return (
            <div key={h.nama} className="min-h-28 rounded-xl border border-garis bg-latar/50 p-2">
              <p className="mb-2 text-xs font-semibold text-ink-muted">{h.nama} {bagianWib(h.tgl).d}</p>
              <div className="space-y-1.5">
                {isi.map((x) => (
                  <div key={x.id} className={`rounded-lg p-2 text-xs ${x.warna} ${x.bentrok ? "outline-2 outline-[#C62828]" : ""}`}>
                    <p className="font-semibold">{jamWib(x.mulai)} {x.bentrok && <span className="text-[#8F1D1D]">· Bentrok</span>}</p>
                    <p className="line-clamp-2">{x.judul}</p>
                    <p className="text-ink-muted">{x.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
