import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, test } from "vitest";

async function dbBaru() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated;");
  await db.exec(readFileSync("supabase/migrations/0001_skema.sql", "utf8"));
  return db;
}

test("migrasi jalan dan klaim_notif hanya mengklaim sekali", async () => {
  const db = await dbBaru();
  const k = await db.query<{ id: string }>(
    "insert into kelas (source_id, nama, program, nama_course, jenis_kelas) values ('k', 'A', 'P', 'A', 'bnsp') returning id",
  );
  const j = await db.query<{ id: string }>(
    "insert into jarkoman (jenis, kelas_id, kirim_at) values ('h7', $1, now()) returning id",
    [k.rows[0].id],
  );
  const id = j.rows[0].id;
  const a = await db.query("select * from klaim_notif($1::uuid[])", [[id]]);
  const b = await db.query("select * from klaim_notif($1::uuid[])", [[id]]);
  expect(a.rows.length + b.rows.length).toBe(1);
});

test("satu h7 per kelas", async () => {
  const db = await dbBaru();
  const k = await db.query<{ id: string }>(
    "insert into kelas (source_id, nama, program, nama_course, jenis_kelas) values ('k', 'A', 'P', 'A', 'bnsp') returning id",
  );
  const ins = () => db.query("insert into jarkoman (jenis, kelas_id, kirim_at) values ('h7', $1, now())", [k.rows[0].id]);
  await ins();
  await expect(ins()).rejects.toThrow(/duplicate key/);
});

async function satuJarkoman(db: PGlite, status = "notif_terkirim", percobaan = 0) {
  const k = await db.query<{ id: string }>(
    "insert into kelas (source_id, nama, program, nama_course, jenis_kelas) values ('k', 'A', 'P', 'A', 'bnsp') returning id",
  );
  const j = await db.query<{ id: string }>(
    "insert into jarkoman (jenis, kelas_id, kirim_at, status, notified_at, percobaan, wa_message_id) values ('h7', $1, now(), $2, now() - interval '10 minutes', $3, $4) returning id",
    [k.rows[0].id, status, percobaan, status === "notif_terkirim" ? null : "wamid.x"],
  );
  return j.rows[0].id;
}

test("I3: sapu_klaim_macet membuka lagi klaim tanpa wa_message_id", async () => {
  const db = await dbBaru();
  const id = await satuJarkoman(db);
  const r = await db.query<{ id: string }>("select id from sapu_klaim_macet()");
  expect(r.rows.map((x) => x.id)).toEqual([id]);
  const s = await db.query<{ status: string; percobaan: number }>("select status, percobaan from jarkoman where id = $1", [id]);
  expect(s.rows[0]).toEqual({ status: "terjadwal", percobaan: 1 });
});

test("I4: gagal_dari_meta menjadwalkan ulang lalu gagal setelah 3 percobaan", async () => {
  const db = await dbBaru();
  const k = await db.query<{ id: string }>(
    "insert into kelas (source_id, nama, program, nama_course, jenis_kelas) values ('k', 'A', 'P', 'A', 'bnsp') returning id",
  );
  const ins = async (percobaan: number, wamid: string) =>
    (await db.query<{ id: string }>(
      "insert into jarkoman (jenis, kelas_id, sesi_id, kirim_at, status, percobaan, wa_message_id) values ('h7', $1, null, now(), 'notif_terkirim', $2, $3) returning id",
      [k.rows[0].id, percobaan, wamid],
    )).rows[0].id;
  const a = await ins(0, "wamid.a");
  await db.query("select gagal_dari_meta('wamid.a', 'x')");
  const s = await db.query<{ status: string; percobaan: number; wa_message_id: string | null }>("select status, percobaan, wa_message_id from jarkoman where id = $1", [a]);
  expect(s.rows[0]).toEqual({ status: "terjadwal", percobaan: 1, wa_message_id: null });
  await db.query("delete from jarkoman");
  const b = await ins(2, "wamid.b");
  await db.query("select gagal_dari_meta('wamid.b', 'x')");
  expect((await db.query<{ status: string }>("select status from jarkoman where id = $1", [b])).rows[0].status).toBe("gagal");
});
