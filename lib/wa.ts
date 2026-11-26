import { createHmac, timingSafeEqual } from "node:crypto";

export type NamaTemplate = "jarkoman_siap_kirim" | "jarkoman_perlu_dilengkapi";

// Parameter template Meta tidak boleh berisi baris baru, tab, atau >4 spasi beruntun.
export function bersihkanParam(s: string): string {
  return s.replace(/[\n\t\r]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 1000);
}

export async function kirimTemplate(
  nama: NamaTemplate,
  ke: string,
  params: string[],
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://graph.facebook.com/v23.0/${process.env.WA_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WA_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: ke,
        type: "template",
        template: {
          name: nama,
          language: { code: "id" },
          components: [{ type: "body", parameters: params.map((t) => ({ type: "text", text: bersihkanParam(t) })) }],
        },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body?.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, id: body.messages?.[0]?.id ?? "" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function normalisasiNomor(s: string): string | null {
  const n = s.replace(/[\s-]/g, "").replace(/^\+/, "").replace(/^0/, "62");
  return /^62\d{8,13}$/.test(n) ? n : null;
}

export function tandaTanganSah(body: string, header: string | null): boolean {
  const secret = process.env.WA_APP_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from("sha256=" + createHmac("sha256", secret).update(body).digest("hex"));
  return a.length === b.length && timingSafeEqual(a, b);
}
