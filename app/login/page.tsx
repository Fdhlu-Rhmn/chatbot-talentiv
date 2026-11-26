import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

import { amanNext } from "@/lib/aman";

async function masuk(form: FormData) {
  "use server";
  const next = amanNext(form.get("next"));
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) redirect(`/login?gagal=1&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; gagal?: string }> }) {
  const { next, gagal } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <form action={masuk} className="w-full max-w-sm space-y-4 rounded-[20px] border border-garis bg-kartu p-8">
        <div>
          <p className="text-sm text-ink-muted">Talentiv Academy</p>
          <h1 className="mt-1 text-3xl">Masuk ke Dashboard Jarkoman</h1>
        </div>
        <input type="hidden" name="next" value={amanNext(next)} />
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" placeholder="email@talentiv.id"
            className="mt-1 w-full rounded-xl border border-garis px-3 py-2.5 font-normal" />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full rounded-xl border border-garis px-3 py-2.5 font-normal" />
        </label>
        {gagal && <p role="alert" className="text-sm text-oranye">Email atau password salah. Coba lagi.</p>}
        <button className="w-full rounded-[16px] bg-cta py-3 font-semibold text-white hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta">
          Masuk
        </button>
      </form>
    </main>
  );
}
