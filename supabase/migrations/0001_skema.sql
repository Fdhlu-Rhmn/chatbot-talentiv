-- Skema dashboard jarkoman Talentiv.
create type jenis_jarkoman as enum ('h7', 'h1', 'pengingat', 'presensi');
create type status_jarkoman as enum ('terjadwal', 'perlu_dilengkapi', 'notif_terkirim', 'sudah_dikirim', 'gagal', 'dilewati');

create table kelas (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  nama text not null,
  program text not null,
  nama_course text not null,
  jenis_kelas text not null check (jenis_kelas in ('essentials', 'bnsp', 'plus')),
  link_tna text,
  link_gcal text,
  link_ical text,
  link_deck text,
  link_student_guide text,
  otomasi_aktif boolean not null default false,
  diperbarui_at timestamptz not null default now()
);

create table sesi (
  id uuid primary key default gen_random_uuid(),
  source_id text not null unique,
  kelas_id uuid not null references kelas (id) on delete cascade,
  nomor int not null,
  topik text,
  mulai timestamptz not null,
  zoom_link text,
  meeting_id text,
  passcode text,
  mentor_nama text,
  mentor_profil text[] not null default '{}',
  link_presensi text,
  diperbarui_at timestamptz not null default now()
);
create index on sesi (kelas_id);

create table override (
  id uuid primary key default gen_random_uuid(),
  entitas text not null check (entitas in ('kelas', 'sesi')),
  entitas_id uuid not null,
  field text not null,
  nilai text not null,
  oleh text,
  diperbarui_at timestamptz not null default now(),
  unique (entitas, entitas_id, field)
);

create table jarkoman (
  id uuid primary key default gen_random_uuid(),
  jenis jenis_jarkoman not null,
  kelas_id uuid not null references kelas (id) on delete cascade,
  sesi_id uuid references sesi (id) on delete cascade,
  kirim_at timestamptz not null,
  kirim_at_manual timestamptz,
  status status_jarkoman not null default 'terjadwal',
  notified_at timestamptz,
  reminded_at timestamptz,
  confirmed_at timestamptz,
  percobaan int not null default 0,
  error text,
  wa_message_id text
);
create unique index jarkoman_kelas_jenis on jarkoman (kelas_id, jenis) where sesi_id is null;
create unique index jarkoman_sesi_jenis on jarkoman (sesi_id, jenis) where sesi_id is not null;
create index on jarkoman (status, kirim_at);

create table kendala (
  id uuid primary key default gen_random_uuid(),
  teks text not null,
  pelapor text,
  dibuat_at timestamptz not null default now(),
  status text not null default 'baru' check (status in ('baru', 'selesai'))
);

create table pengaturan (
  id int primary key check (id = 1),
  admin_wa text,
  sinkron_terakhir timestamptz
);
insert into pengaturan (id) values (1);

-- RLS: hanya pengguna login. Endpoint cron memakai service role (melewati RLS).
do $$
declare t text;
begin
  foreach t in array array['kelas', 'sesi', 'override', 'jarkoman', 'kendala', 'pengaturan'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "login penuh" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Klaim atomik: hanya baris yang berhasil diklaim yang boleh dikirim (cegah kirim ganda).
create function klaim_notif(ids uuid[]) returns setof jarkoman
language sql as $$
  update jarkoman set status = 'notif_terkirim', notified_at = now()
  where id = any (ids) and status in ('terjadwal', 'perlu_dilengkapi')
  returning *;
$$;
revoke execute on function klaim_notif(uuid[]) from public, anon, authenticated;

-- Klaim yang macet (proses mati antara klaim dan kirim): buka lagi setelah 5 menit, hitung sebagai satu percobaan.
create function sapu_klaim_macet() returns setof jarkoman
language sql as $$
  update jarkoman
  set status = case when percobaan + 1 >= 3 then 'gagal'::status_jarkoman else 'terjadwal'::status_jarkoman end,
      percobaan = percobaan + 1, notified_at = null, error = 'Pengiriman terputus sebelum selesai'
  where status = 'notif_terkirim' and wa_message_id is null and notified_at < now() - interval '5 minutes'
  returning *;
$$;
revoke execute on function sapu_klaim_macet() from public, anon, authenticated;

-- Meta melaporkan pesan gagal (webhook): jadwalkan ulang, atau gagal setelah 3 percobaan.
create function gagal_dari_meta(msg_id text, pesan text) returns setof jarkoman
language sql as $$
  update jarkoman
  set status = case when percobaan + 1 >= 3 then 'gagal'::status_jarkoman else 'terjadwal'::status_jarkoman end,
      percobaan = percobaan + 1, notified_at = null, wa_message_id = null, error = pesan
  where wa_message_id = msg_id and status = 'notif_terkirim'
  returning *;
$$;
revoke execute on function gagal_dari_meta(text, text) from public, anon, authenticated;
