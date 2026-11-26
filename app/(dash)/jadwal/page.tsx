import Link from "next/link";
import { KalenderMinggu } from "@/components/KalenderMinggu";
import { BadgeStatus, Kartu } from "@/components/ui";
import { muatDashboard } from "@/lib/data";
import { cariBentrok } from "@/lib/jarkoman/bentrok";
import { siapkanDashboard } from "@/lib/jarkoman/dashboard";
import { bagianWib, tanggalPanjang, wib } from "@/lib/jarkoman/waktu";

export const dynamic = "force-dynamic";

const WARNA_KELAS = ["bg-[#DDF3EF]", "bg-[#DCEBFA]", "bg-[#FFF1C9]", "bg-[#F6E1EC]", "bg-[#E6ECEB]"];

function seninDari(iso: string | undefined, now: Date): Date {
  const c = iso && /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const t = c ? wib(+c[1], +c[2], +c[3]) : now;
  const { y, m, d, hari } = bagianWib(t);
  return wib(y, m, d - ((hari + 6) % 7));
}

export default async function Jadwal({ searchParams }: { searchParams: Promise<{ season?: string; minggu?: string }> }) {
  const p = await searchParams;
  const data = await muatDashboard();
  const now = new Date();
  const d = siapkanDashboard(data, { season: p.season }, now);
  const sesiSeason = data.sesi.filter((s) => d.kelasTerpilih.some((k) => k.id === s.kelasId));
  const bentrok = cariBentrok(sesiSeason);
  const warna = new Map(d.kelasTerpilih.map((k, i) => [k.id, WARNA_KELAS[i % WARNA_KELAS.length]]));
  const status = new Map(d.baris.map((b) => [`${b.j.jenis}:${b.j.sesiId ?? b.j.kelasId}`, b]));
  const sel = (jenis: string, key: string) => {
    const b = status.get(`${jenis}:${key}`);
    return b ? <Link href={`/?j=${b.j.id}`}><BadgeStatus label={b.status} /></Link> : <span className="text-ink-muted">–</span>;
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-ink-muted">Season {d.seasonAktif}</p>
        <h1 className="text-3xl md:text-4xl">Jadwal kelas</h1>
      </header>

      <Kartu>
        <h2 className="mb-3 text-lg">Kalender mingguan · semua kelas</h2>
        <KalenderMinggu
          senin={seninDari(p.minggu, now)}
          hrefMinggu={(iso) => `/jadwal?${new URLSearchParams({ ...(p.season ? { season: p.season } : {}), minggu: iso })}`}
          item={sesiSeason.map((s) => {
            const k = d.kelasTerpilih.find((x) => x.id === s.kelasId)!;
            return { id: s.id, mulai: s.mulai, judul: k.nama, sub: `Sesi ${s.nomor}${s.topik ? ` · ${s.topik}` : ""}`, warna: warna.get(k.id)!, bentrok: bentrok.has(s.id) };
          })}
        />
      </Kartu>

      {d.kelasTerpilih.map((k) => (
        <Kartu key={k.id}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg">{k.nama}</h2>
            <div className="flex items-center gap-3 text-xs">
              <span>H-7 {sel("h7", k.id)}</span>
              <span>H-1 {sel("h1", k.id)}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr className="border-b border-garis">
                  <th className="py-2 pr-3 font-semibold">Sesi</th>
                  <th className="py-2 pr-3 font-semibold">Topik</th>
                  <th className="py-2 pr-3 font-semibold">Tanggal & jam</th>
                  <th className="py-2 pr-3 font-semibold">Pembicara</th>
                  <th className="py-2 pr-3 font-semibold">Pengingat</th>
                  <th className="py-2 font-semibold">Presensi</th>
                </tr>
              </thead>
              <tbody>
                {data.sesi.filter((s) => s.kelasId === k.id).sort((a, b) => a.nomor - b.nomor).map((s) => (
                  <tr key={s.id} className="border-b border-garis/70">
                    <td className="py-2 pr-3">{s.nomor}</td>
                    <td className="py-2 pr-3">{s.topik ?? "–"}</td>
                    <td className="py-2 pr-3">
                      {tanggalPanjang(s.mulai)}
                      {bentrok.has(s.id) && <span className="ml-1 font-semibold text-[#8F1D1D]">Bentrok</span>}
                    </td>
                    <td className="py-2 pr-3">{s.mentorNama ?? "–"}</td>
                    <td className="py-2 pr-3">{sel("pengingat", s.id)}</td>
                    <td className="py-2">{sel("presensi", s.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>
      ))}
    </div>
  );
}
