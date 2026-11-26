import type { Kategori } from "@/lib/jarkoman/template";

export const STABILO: Record<Kategori, string> = {
  kelas: "bg-stabilo-kelas",
  waktu: "bg-stabilo-waktu",
  link: "bg-stabilo-link",
  sesi: "bg-stabilo-sesi",
};

export const LABEL_KATEGORI: Record<Kategori, string> = {
  kelas: "Data kelas",
  waktu: "Waktu",
  link: "Link",
  sesi: "Sesi & pembicara",
};

const WARNA_STATUS: Record<string, string> = {
  "Siap kirim": "bg-[#DDF3EF] text-[#155E56]",
  "Perlu dilengkapi": "bg-[#FDE8D7] text-[#8A3B08]",
  "Notif terkirim": "bg-[#DCEBFA] text-[#1C4560]",
  "Sudah dikirim": "bg-[#E6ECEB] text-ink-muted",
  Gagal: "bg-[#FBDADA] text-[#8F1D1D]",
  "Otomasi belum aktif": "border border-garis text-ink-muted",
  Dilewati: "bg-[#E6ECEB] text-ink-muted line-through",
};

export function BadgeStatus({ label }: { label: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${WARNA_STATUS[label] ?? ""}`}>
      {label}
    </span>
  );
}

export function Kartu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-[20px] border border-garis bg-kartu p-5 ${className}`}>{children}</section>;
}
