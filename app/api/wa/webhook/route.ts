import { supabaseAdmin } from "@/lib/supabase/admin";
import { tandaTanganSah } from "@/lib/wa";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.WA_VERIFY_TOKEN) {
    return new Response(p.get("hub.challenge") ?? "");
  }
  return new Response("forbidden", { status: 403 });
}

interface StatusMeta {
  id: string;
  status: string;
  errors?: { title?: string; message?: string }[];
}
interface Perubahan {
  value?: { statuses?: StatusMeta[] };
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!tandaTanganSah(body, req.headers.get("x-hub-signature-256"))) {
    return new Response("unauthorized", { status: 401 });
  }
  const payload = JSON.parse(body) as { entry?: { changes?: Perubahan[] }[] };
  const gagal = (payload.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .flatMap((c) => c.value?.statuses ?? [])
    .filter((s) => s.status === "failed");
  if (gagal.length) {
    const db = supabaseAdmin();
    for (const s of gagal) {
      const pesan = s.errors?.[0]?.message ?? s.errors?.[0]?.title ?? "Gagal terkirim";
      // Jadwalkan ulang (maks 3 percobaan). ponytail: id pesan pengingat tidak disimpan, jadi gagalnya tidak terlacak.
      await db.rpc("gagal_dari_meta", { msg_id: s.id, pesan: `WhatsApp: ${pesan}` });
    }
  }
  return new Response("ok");
}
