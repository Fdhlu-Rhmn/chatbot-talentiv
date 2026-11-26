"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/", label: "Dashboard" },
  { href: "/jadwal", label: "Jadwal" },
  { href: "/nomor", label: "Nomor WhatsApp" },
  { href: "/kendala", label: "Laporan Kendala" },
];

export function NavSamping() {
  const path = usePathname();
  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-1">
      {MENU.map((m) => {
        const aktif = m.href === "/" ? path === "/" : path.startsWith(m.href);
        return (
          <Link key={m.href} href={m.href} aria-current={aktif ? "page" : undefined}
            className={`rounded-xl px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-white ${
              aktif ? "bg-white font-semibold text-samping" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}>
            {m.label}
          </Link>
        );
      })}
    </nav>
  );
}
