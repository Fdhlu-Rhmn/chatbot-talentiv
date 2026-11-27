import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Klien dengan sesi pengguna (tunduk RLS). Dipakai di halaman dan server action.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component: cookie diperbarui oleh middleware.
        }
      },
    },
  });
}
