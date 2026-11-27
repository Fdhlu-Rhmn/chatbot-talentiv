import { redirect } from "next/navigation";
import { NavSamping } from "@/components/NavSamping";
import { modeDemo } from "@/lib/data";
import { supabaseServer } from "@/lib/supabase/server";

async function keluar() {
  "use server";
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 bg-samping px-4 py-3 text-white md:h-dvh md:w-60 md:gap-6 md:overflow-y-auto md:p-5">
        <div className="flex items-baseline justify-between gap-3 md:block">
          <p className="font-judul text-xl tracking-tight">talentiv</p>
          <p className="text-xs text-white/70">chatbot.talentiv.id</p>
        </div>
        <NavSamping />
        <div className="mt-auto hidden border-t border-white/15 pt-4 text-xs md:block">
          <p className="text-white/60">Klien</p>
          <p className="font-semibold">Talentiv Academy</p>
          {modeDemo() ? (
            <p className="mt-3 text-white/60">Mode demo</p>
          ) : (
            <form action={keluar} className="mt-3">
              <button className="text-white/70 underline-offset-2 hover:text-white hover:underline">Keluar</button>
            </form>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
