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
