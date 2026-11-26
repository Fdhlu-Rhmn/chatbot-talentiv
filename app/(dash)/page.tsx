import Link from "next/link";
import { AksiHeader, TombolSinkron } from "@/components/AksiHeader";
import { Filter } from "@/components/Filter";
import { JamKirim } from "@/components/JamKirim";
import { KolomVariabel } from "@/components/KolomVariabel";
import { PratinjauWA } from "@/components/PratinjauWA";
import { BadgeStatus, Kartu } from "@/components/ui";
import { modeDemo, muatDashboard } from "@/lib/data";
import { siapkanDashboard, type ParamDashboard } from "@/lib/jarkoman/dashboard";
import { kirimEfektif } from "@/lib/jarkoman/rencana";
import { LABEL_JENIS } from "@/lib/jarkoman/susun";
import type { Jenis } from "@/lib/jarkoman/types";
import { daftarVariabel, JUMLAH_VARIABEL } from "@/lib/jarkoman/variabel";
import { keInputWib, tanggalPendek } from "@/lib/jarkoman/waktu";

export const dynamic = "force-dynamic";

const KET_TEMPLATE: Record<Jenis, string> = {
  h7: `Gambar + teks · ${JUMLAH_VARIABEL.h7} variabel`,
  h1: "Sama dengan H-7",
  pengingat: `Teks · ${JUMLAH_VARIABEL.pengingat} variabel`,
  presensi: `Teks · ${JUMLAH_VARIABEL.presensi} variabel`,
};
const WAKTU_KIRIM: Record<Jenis, string> = {
  h7: "Dikirim ke grup WhatsApp kelas · H-7 dari sesi perdana",
  h1: "Dikirim ke grup WhatsApp kelas · H-1 dari sesi perdana",
  pengingat: "Dikirim ke grup WhatsApp kelas · sebelum sesi dimulai",
  presensi: "Dikirim ke grup WhatsApp kelas · setelah sesi selesai",
};

const urlDengan = (p: ParamDashboard, ubah: ParamDashboard) => {
  const q = new URLSearchParams(Object.entries({ ...p, ...ubah }).filter(([, v]) => v) as [string, string][]);
  return `/?${q.toString()}`;
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<ParamDashboard> }) {
  const p = await searchParams;
  const data = await muatDashboard();
  const now = new Date();
  const d = siapkanDashboard(data, p, now);
  const t = d.terpilih;
  const demo = modeDemo();
  const waTerhubung = Boolean(process.env.WA_PHONE_NUMBER_ID && process.env.WA_TOKEN);
  const aktif = d.kelasTerpilih.filter((k) => k.otomasiAktif).length;
  const semuaAktif = d.kelasTerpilih.length > 0 && aktif === d.kelasTerpilih.length;

  return (
    <div className="space-y-5">
      {demo && (
        <p role="status" className="rounded-xl border border-oranye/40 bg-[#FDE8D7] px-4 py-2.5 text-sm text-[#8A3B08]">
          Mode demo: data contoh dari brief, belum tersambung ke database. Perubahan tidak disimpan.
        </p>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-muted">Talentiv Academy · Otomasi Jarkoman</p>
          <h1 className="text-3xl md:text-4xl">Dashboard Jarkoman</h1>
        </div>
        <AksiHeader kelasIds={d.kelasTerpilih.map((k) => k.id)} semuaAktif={semuaAktif} />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kartu className="!p-4">
          <p className="text-xs text-ink-muted">Nomor WhatsApp</p>
          <p className="font-semibold">{process.env.WA_BUSINESS_NUMBER || "Belum diatur"}</p>
          <p className={`text-xs ${waTerhubung ? "text-cta" : "text-ink-muted"}`}>
            {waTerhubung ? "Terhubung ke API resmi Meta" : "Belum terhubung ke API Meta"}
          </p>
        </Kartu>
        <Kartu className="!p-4">
          <p className="text-xs text-ink-muted">Season aktif</p>
          <p className="font-semibold">{d.seasonAktif || "Belum ada kelas"}</p>
          <p className="text-xs text-ink-muted">Program dikelompokkan per season</p>
        </Kartu>
        <Kartu className="!p-4">
          <p className="text-xs text-ink-muted">Status otomasi</p>
          <p className="font-semibold">{aktif === 0 ? "Belum dimulai" : `Aktif · ${aktif} dari ${d.kelasTerpilih.length} kelas`}</p>
          <p className="text-xs text-ink-muted">Notifikasi ke admin di setiap jam kirim</p>
        </Kartu>
        <Kartu className="!p-4">
          <p className="text-xs text-ink-muted">Sinkron data app.talentiv.id</p>
          <p className="font-semibold">
            {data.pengaturan.sinkron_terakhir ? tanggalPendek(new Date(data.pengaturan.sinkron_terakhir)) : "Belum pernah"}
          </p>
          {!demo && <TombolSinkron />}
        </Kartu>
      </div>

      <Kartu><Filter filter={d.filter} /></Kartu>

      {t ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.1fr)]">
          <Kartu>
            <h2 className="mb-3 text-lg">Template</h2>
            <div className="space-y-2">
              {(Object.keys(LABEL_JENIS) as Jenis[]).map((jenis) => {
                const pilih = t.j.jenis === jenis;
                return (
                  <Link key={jenis} href={urlDengan(p, { jenis, j: undefined })} aria-current={pilih ? "true" : undefined}
                    className={`block rounded-xl border px-3 py-2.5 ${pilih ? "border-cta bg-[#DDF3EF]" : "border-garis hover:bg-latar"}`}>
                    <p className="text-sm font-semibold">{LABEL_JENIS[jenis]}</p>
                    <p className="text-xs text-ink-muted">{KET_TEMPLATE[jenis]}</p>
                  </Link>
                );
              })}
            </div>
          </Kartu>

          <Kartu>
            <KolomVariabel
              judul={`Variabel · ${LABEL_JENIS[t.j.jenis]}`}
              variabel={daftarVariabel(t.j.jenis, t.t, d.perdana.get(t.j.kelasId)!.mulai)}
            />
          </Kartu>

          <Kartu>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-lg">Jarkoman</h2>
              <span className="text-xs text-ink-muted">Pratinjau WhatsApp</span>
            </div>
            <p className="mb-3 text-sm">
              <span className="font-semibold">{t.t.kelas.nama}</span>
              {t.t.sesi && <> · Sesi {t.t.sesi.nomor}</>}
              <br />
              <span className="text-ink-muted">Jadwal kirim {tanggalPendek(t.t.kirimAt)}</span>
            </p>
            {t.t.hasil.kosong.length > 0 && (
              <p role="alert" className="mb-3 rounded-xl bg-[#FDE8D7] px-3 py-2 text-sm text-[#8A3B08]">
                Belum lengkap: {t.t.hasil.kosong.join(", ")}. Lengkapi di kolom Variabel.
              </p>
            )}
            <PratinjauWA bagian={t.t.hasil.bagian} gambar={t.j.jenis === "h7" || t.j.jenis === "h1"} />
            <p className="mt-2 text-xs text-ink-muted">{WAKTU_KIRIM[t.j.jenis]}</p>
          </Kartu>
        </div>
      ) : (
        <Kartu>
          <p className="font-semibold">Belum ada jarkoman untuk filter ini.</p>
          <p className="text-sm text-ink-muted">Ubah filter di atas, atau jalankan sinkron untuk mengambil kelas dari app.talentiv.id.</p>
        </Kartu>
      )}

      <Kartu>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Jadwal jarkoman · Season {d.seasonAktif}</h2>
          <span className="text-xs text-ink-muted">Jam dalam WIB · ubah jam untuk menggeser satu jarkoman</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-ink-muted">
              <tr className="border-b border-garis">
                <th className="py-2 pr-3 font-semibold">Program & batch</th>
                <th className="py-2 pr-3 font-semibold">Sesi</th>
                <th className="py-2 pr-3 font-semibold">Template</th>
                <th className="py-2 pr-3 font-semibold">Jadwal kirim</th>
                <th className="py-2 pr-3 font-semibold">Variabel</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {d.baris.map((b) => {
                const total = JUMLAH_VARIABEL[b.j.jenis];
                const kosong = b.t.hasil.kosong;
                const pilih = t?.j.id === b.j.id;
                return (
                  <tr key={b.j.id} className={`border-b border-garis/70 ${pilih ? "bg-[#DDF3EF]/60" : ""}`}>
                    <td className="py-2 pr-3">
                      <Link href={urlDengan(p, { j: b.j.id })} className="font-semibold hover:underline">{b.t.kelas.nama}</Link>
                    </td>
                    <td className="py-2 pr-3">{b.t.sesi ? `Sesi ${b.t.sesi.nomor}${b.t.sesi.topik ? ` · ${b.t.sesi.topik}` : ""}` : "Sesi perdana"}</td>
                    <td className="py-2 pr-3">{LABEL_JENIS[b.j.jenis]}</td>
                    <td className="py-2 pr-3">
                      <JamKirim key={kirimEfektif(b.j).getTime()} id={b.j.id} nilai={keInputWib(kirimEfektif(b.j))}
                        manual={Boolean(b.j.kirimAtManual)} terkunci={demo || b.j.status === "sudah_dikirim"} />
                    </td>
                    <td className="py-2 pr-3">
                      {kosong.length ? <span className="text-oranye">{kosong.join(", ")} kosong</span> : `${total}/${total} lengkap`}
                    </td>
                    <td className="py-2">
                      <BadgeStatus label={b.status} />
                      {b.j.error && <p className="mt-0.5 max-w-48 text-[11px] text-[#8F1D1D]">{b.j.error}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {d.baris.length === 0 && <p className="py-4 text-sm text-ink-muted">Tidak ada jadwal untuk filter ini.</p>}
        </div>
      </Kartu>
    </div>
  );
}
