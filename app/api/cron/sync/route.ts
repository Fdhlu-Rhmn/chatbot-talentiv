import { cronSah } from "@/lib/cron";
import { jalankanSync } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (!cronSah(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    return Response.json(await jalankanSync(supabaseAdmin(), new Date()));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
