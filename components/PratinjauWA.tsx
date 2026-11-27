import { GAMBAR_H7 } from "@/lib/aset";
import type { Bagian } from "@/lib/jarkoman/template";
import { STABILO } from "./ui";

export function PratinjauWA({ bagian, gambar }: { bagian: Bagian[]; gambar: boolean }) {
  return (
    <div className="rounded-2xl bg-[#E5DDD5] p-3">
      <div className="ml-auto max-w-[95%] space-y-2 rounded-xl rounded-tr-sm bg-[#D9FDD3] p-2.5 shadow-sm">
        {gambar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={GAMBAR_H7} alt="Infografis Selamat Datang di Kelas Talentiv (gambar tetap)" width={1080} height={1080}
            className="h-auto w-full rounded-lg" />
        )}
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#111B21]">
          {bagian.map((b, i) =>
            b.kategori ? (
              <mark key={i} className={`rounded px-0.5 text-inherit ${STABILO[b.kategori]}`}>{b.teks}</mark>
            ) : (
              <span key={i}>{b.teks}</span>
            ),
          )}
        </p>
      </div>
    </div>
  );
}
