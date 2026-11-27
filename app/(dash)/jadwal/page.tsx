import Link from "next/link";
import { KalenderMinggu } from "@/components/KalenderMinggu";
import { BadgeStatus, JudulHalaman, Kartu, tanpaSeason } from "@/components/ui";
import { muatDashboard } from "@/lib/data";
import { cariBentrok } from "@/lib/jarkoman/bentrok";
import { siapkanDashboard } from "@/lib/jarkoman/dashboard";
import { bagianWib, tanggalRingkas, wib } from "@/lib/jarkoman/waktu";

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
    <div className="mx-auto max-w-[1400px] space-y-5">
      <JudulHalaman atas={`Season ${d.seasonAktif}`} judul="Jadwal kelas" />

      <Kartu>
        <h2 className="mb-3 text-lg">Kalender mingguan · semua kelas</h2>
        <KalenderMinggu
          senin={seninDari(p.minggu, now)}
          hrefMinggu={(iso) => `/jadwal?${new URLSearchParams({ ...(p.season ? { season: p.season } : {}), minggu: iso })}`}
          item={sesiSeason.map((s) => {
            const k = d.kelasTerpilih.find((x) => x.id === s.kelasId)!;
            return { id: s.id, mulai: s.mulai, judul: tanpaSeason(k.nama, d.seasonAktif), sub: `Sesi ${s.nomor}${s.topik ? ` · ${s.topik}` : ""}`, warna: warna.get(k.id)!, bentrok: bentrok.has(s.id) };
          })}
        />
      </Kartu>

      {d.kelasTerpilih.map((k) => {
        const sesiKelas = data.sesi.filter((s) => s.kelasId === k.id).sort((a, b) => a.nomor - b.nomor);
        return (
        <Kartu key={k.id}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg" title={k.nama}>{tanpaSeason(k.nama, d.seasonAktif)}</h2>
            <div className="flex items-center gap-3 text-xs text-ink-muted">
              <span>H-7 {sel("h7", k.id)}</span>
              <span>H-1 {sel("h1", k.id)}</span>
            </div>
          </div>
          {/* HP: satu kartu per sesi, tanpa geser ke samping. */}
          <ul className="grid gap-2 sm:grid-cols-2 lg:hidden">
            {sesiKelas.map((s) => (
              <li key={s.id} className="rounded-xl border border-garis p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">Sesi {s.nomor}{s.topik && <span className="font-normal"> · {s.topik}</span>}</p>
                  {bentrok.has(s.id) && <Bentrok />}
                </div>
                <p className="mt-0.5 text-ink-muted">{tanggalRingkas(s.mulai)} · {s.mentorNama ?? "Pembicara belum diisi"}</p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 text-xs">
                  <dt className="text-ink-muted">Pengingat</dt><dd>{sel("pengingat", s.id)}</dd>
                  <dt className="text-ink-muted">Presensi</dt><dd>{sel("presensi", s.id)}</dd>
                </dl>
              </li>
            ))}
          </ul>
          <div className="hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-ink-muted">
                <tr className="border-b border-garis">
                  <th className="w-12 py-2.5 pr-4 font-semibold">Sesi</th>
                  <th className="py-2.5 pr-4 font-semibold">Topik</th>
                  <th className="py-2.5 pr-4 font-semibold">Tanggal & jam</th>
                  <th className="py-2.5 pr-4 font-semibold">Pembicara</th>
                  <th className="py-2.5 pr-4 font-semibold">Pengingat</th>
                  <th className="py-2.5 font-semibold">Presensi</th>
                </tr>
              </thead>
              <tbody>
                {sesiKelas.map((s) => (
                  <tr key={s.id} className="border-b border-garis/70 last:border-0 hover:bg-latar/60">
                    <td className="py-3 pr-4 text-ink-muted">{s.nomor}</td>
                    <td className="py-3 pr-4">{s.topik ?? "–"}</td>
                    <td className="whitespace-nowrap py-3 pr-4">
                      {tanggalRingkas(s.mulai)}
                      {bentrok.has(s.id) && <span className="ml-2"><Bentrok /></span>}
                    </td>
                    <td className="py-3 pr-4">{s.mentorNama ?? "–"}</td>
                    <td className="py-3 pr-4">{sel("pengingat", s.id)}</td>
                    <td className="py-3">{sel("presensi", s.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>
        );
      })}
    </div>
  );
}

const Bentrok = () => (
  <span className="shrink-0 rounded-full bg-[#FBDADA] px-2 py-0.5 text-xs font-medium text-[#8F1D1D]">Bentrok</span>
);
