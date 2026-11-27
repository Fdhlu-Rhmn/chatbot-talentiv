import { afterEach, expect, test, vi } from "vitest";
import { bersihkanParam, kirimTemplate, tandaTanganSah } from "@/lib/wa";
import { createHmac } from "node:crypto";

afterEach(() => vi.unstubAllGlobals());

test("bersihkanParam membuang baris baru, tab, spasi beruntun", () => {
  expect(bersihkanParam("a\nb\t\tc     d")).toBe("a b c d");
  expect(bersihkanParam("x".repeat(1200))).toHaveLength(1000);
});

test("kirimTemplate mengirim body template dan membaca error Meta", async () => {
  process.env.WA_TOKEN = "tok";
  process.env.WA_PHONE_NUMBER_ID = "123";
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [{ id: "wamid.1" }] }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Invalid parameter" } }), { status: 400 }));
  vi.stubGlobal("fetch", fetchMock);

  expect(await kirimTemplate("jarkoman_siap_kirim", "6281", ["a\nb"])).toEqual({ ok: true, id: "wamid.1" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("https://graph.facebook.com/v23.0/123/messages");
  const body = JSON.parse(init.body);
  expect(body.template.name).toBe("jarkoman_siap_kirim");
  expect(body.template.language.code).toBe("id");
  expect(body.template.components[0].parameters[0]).toEqual({ type: "text", text: "a b" });

  expect(await kirimTemplate("jarkoman_siap_kirim", "6281", ["x"])).toEqual({ ok: false, error: "Invalid parameter" });
});

test("tandaTanganSah memverifikasi X-Hub-Signature-256", () => {
  process.env.WA_APP_SECRET = "s";
  const body = '{"a":1}';
  const sig = "sha256=" + createHmac("sha256", "s").update(body).digest("hex");
  expect(tandaTanganSah(body, sig)).toBe(true);
  expect(tandaTanganSah(body, "sha256=00")).toBe(false);
  expect(tandaTanganSah(body, null)).toBe(false);
});

import { normalisasiNomor } from "@/lib/wa";

test("normalisasiNomor ke format 62", () => {
  expect(normalisasiNomor("0812-3456-7890")).toBe("6281234567890");
  expect(normalisasiNomor("+62 812 3456 7890")).toBe("6281234567890");
  expect(normalisasiNomor("6281234567890")).toBe("6281234567890");
  expect(normalisasiNomor("12345")).toBeNull();
  expect(normalisasiNomor("62abc")).toBeNull();
});
