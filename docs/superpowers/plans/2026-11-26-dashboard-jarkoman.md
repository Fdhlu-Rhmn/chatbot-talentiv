# Dashboard Jarkoman Talentiv — Rencana Implementasi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun dashboard di chatbot.talentiv.id yang menyusun 4 jarkoman rutin dari data app.talentiv.id, lalu mengirim notifikasi WhatsApp ke 1 admin. Admin menyalin teks jadi ke grup kelas.

**Architecture:**
- Next.js (App Router) di Vercel berfungsi sebagai dashboard sekaligus endpoint cron.
- Supabase milik kita menyimpan data (kelas, sesi, override, jarkoman) dan menangani login.
- pg_cron + pg_net di Supabase memanggil `/api/cron/sync` tiap jam dan `/api/cron/dispatch` tiap menit.
- Semua aturan bisnis (jam kirim, sapaan, teks template, rencana jarkoman, pemilihan aksi kirim) ditulis sebagai fungsi murni di `lib/jarkoman/` dan diuji dengan Vitest.

**Tech Stack:** Next.js 15 + TypeScript, Tailwind CSS v4, Supabase (Postgres, Auth, pg_cron, pg_net), `@supabase/supabase-js` + `@supabase/ssr`, Vitest, WhatsApp Cloud API (Graph API v23.0).

**Spec:** `docs/superpowers/specs/2026-11-26-dashboard-jarkoman-design.md`

**Penyimpangan dari spec (keputusan rencana):** Spec menyebut sync dan dispatch sebagai Supabase Edge Function. Rencana ini memindahkannya ke route handler Next.js (`/api/cron/*`) yang dipanggil pg_cron lewat pg_net. Alasannya: satu codebase dan satu runtime, aturan di `lib/jarkoman/` dipakai bersama dashboard tanpa salin ke Deno, dan perilakunya sama.

## Global Constraints

- Semua waktu disimpan sebagai `timestamptz`. Semua tampilan dan perhitungan jam memakai WIB (`Asia/Jakarta`, UTC+7, tanpa DST). Server Vercel berjalan di UTC, jadi jangan memakai `Date#getHours()`.
- Data app.talentiv.id hanya **dibaca**. Tidak ada kode yang menulis ke Supabase sumber.
- Token Meta, service role key, key sumber, dan `CRON_SECRET` hanya ada di env server. Jangan pernah memakai prefiks `NEXT_PUBLIC_`.
- Tidak boleh memakai library WhatsApp tidak resmi.
- Parameter template Meta tidak boleh berisi `\n`, `\t`, atau lebih dari 4 spasi berturut-turut.
- Penerima notifikasi: 1 nomor admin dari tabel `pengaturan`.
- Token warna: latar `#EEF5F4`, kartu `#FFFFFF`, teks `#1E3F44`, teks sekunder `#4E6A6C`, garis `#D3E3E0`, tombol utama `#1F8A7E` (teks putih 600), menu samping `#143532`.
- Huruf: judul Poppins 400 (letter-spacing -0.02em), teks DM Sans 400/500/600. Radius tombol 16px, kartu 20px.
- Stabilo variabel: Data kelas `#FFE08A`, Waktu `#BDF0C8`, Link `#BFE0FF`, Sesi & pembicara `#FBCFE3`.
- Teks keempat template harus sama persis dengan fixture di Task 3.

## Review Focus

1. **Sesi di-reschedule setelah notifikasi terkirim.** Jarkoman harus kembali `terjadwal` dengan jam baru, supaya admin menerima teks yang benar. Test ada di Task 4.
2. **Sync terlambat** (sesi baru muncul setelah jam kirimnya lewat). Kalau masih relevan, kirim segera. Kalau sudah tidak relevan, tandai `dilewati`. Jangan kirim pengingat untuk kelas yang sudah selesai. Test ada di Task 4.
3. **Cron terpanggil dua kali dalam menit yang sama.** Satu jarkoman tetap hanya menghasilkan satu notifikasi. Test ada di Task 6, lewat klaim atomik.
4. **Override admin lalu data sumber berubah.** Nilai override tetap menang. Setelah "kembalikan ke data API", nilai sumber terbaru yang tampil. Test ada di Task 4.
5. **Jam kirim di sekitar tengah malam WIB** (misalnya sesi 06.30, sehingga pengingat jatuh 19.00 hari sebelumnya, padahal di UTC tanggalnya berbeda). Tanggal dan keterangan "besok pagi hari" harus benar. Test ada di Task 2.

---

## Struktur File

```
app/
  layout.tsx, globals.css             token brand + font
  login/page.tsx                      login email+password
  (dash)/layout.tsx                   menu samping + header
  (dash)/page.tsx                     Dashboard: filter, 3 kolom, tabel jadwal
  (dash)/jadwal/page.tsx              tabel per batch + kalender mingguan
  (dash)/nomor/page.tsx               status nomor WA + nomor admin
  (dash)/kendala/page.tsx             daftar laporan kendala
  (dash)/actions.ts                   server actions: override, jam kirim, otomasi, sinkron, kendala
  k/[id]/page.tsx                     halaman siap kirim (HP)
  api/cron/sync/route.ts
  api/cron/dispatch/route.ts
  api/wa/webhook/route.ts
components/                           Filter, KolomTemplate, KolomVariabel, PratinjauWA, TabelJadwal, KalenderMinggu, TombolBagikan
lib/
  jarkoman/types.ts                   tipe domain
  jarkoman/waktu.ts                   jam & format WIB
  jarkoman/template.ts                isi teks 4 jarkoman
  jarkoman/efektif.ts                 gabung sumber + override
  jarkoman/rencana.ts                 buat/perbarui baris jarkoman dari sesi
  jarkoman/dispatch.ts                pilih aksi kirim
  jarkoman/bentrok.ts                 deteksi bentrok jadwal
  sumber/index.ts, sumber/mock.ts     adapter data app.talentiv.id
  wa.ts                               klien WhatsApp Cloud API
  supabase/server.ts, supabase/admin.ts
  db.ts                               query baca/tulis tabel kita
supabase/migrations/0001_skema.sql, 0002_cron.sql
tests/                                *.test.ts + fixtures/*.txt
public/h7.png                         gambar "Selamat Datang di Kelas Talentiv!"
```

---

### Task 1: Kerangka proyek

**Files:**
- Create: proyek Next.js di root repo, `app/globals.css`, `app/layout.tsx`, `vitest.config.ts`, `.env.example`, `.gitignore`

**Interfaces:**
- Produces: `npm test` (Vitest), `npm run dev`, kelas Tailwind dari token (`bg-latar`, `bg-kartu`, `text-ink`, `text-ink-muted`, `border-garis`, `bg-cta`, `bg-samping`, `bg-stabilo-kelas|waktu|link|sesi`, `font-judul`, `font-teks`).

- [ ] **Step 1:** Jalankan `git init`, lalu `npx create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*"`. Folder `docs/` sudah ada; biarkan tetap.
- [ ] **Step 2:** Pasang paket: `npm i @supabase/supabase-js @supabase/ssr` dan `npm i -D vitest`. Tambahkan script `"test": "vitest run"`.
- [ ] **Step 3:** Di `app/globals.css`, isi blok `@theme` dengan token dari Global Constraints. Muat Poppins dan DM Sans lewat `next/font/google` di `layout.tsx`. Set `<html lang="id">`.
- [ ] **Step 4:** Buat `.env.example` berisi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN`, `SUMBER_DATA=mock`, `SUMBER_URL`, `SUMBER_KEY`, `APP_URL=https://chatbot.talentiv.id`.
- [ ] **Step 5:** Buat `tests/smoke.test.ts` dengan isi `expect(1).toBe(1)`. Jalankan `npm test` (harus PASS) dan `npm run build` (harus sukses).
- [ ] **Step 6:** Commit: `chore: kerangka Next.js + Tailwind token Talentiv + Vitest`.

### Task 2: Aturan waktu WIB

**Files:**
- Create: `lib/jarkoman/types.ts`, `lib/jarkoman/waktu.ts`
- Test: `tests/waktu.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type Jenis = 'h7' | 'h1' | 'pengingat' | 'presensi';
  export type Status = 'terjadwal' | 'perlu_dilengkapi' | 'notif_terkirim' | 'sudah_dikirim' | 'gagal' | 'dilewati';
  export interface Kelas { id: string; sourceId: string; nama: string; program: string; namaCourse: string;
    jenisKelas: 'essentials' | 'bnsp' | 'plus'; linkTna: string | null; linkGcal: string | null; linkIcal: string | null;
    linkDeck: string | null; linkStudentGuide: string | null; otomasiAktif: boolean }
  export interface Sesi { id: string; sourceId: string; kelasId: string; nomor: number; topik: string | null; mulai: Date;
    zoomLink: string | null; meetingId: string | null; passcode: string | null; mentorNama: string | null;
    mentorProfil: string[]; linkPresensi: string | null }
  ```
- Produces (`waktu.ts`):
  - `wib(y: number, m: number, d: number, h = 0, min = 0): Date`
  - `bagianWib(t: Date): { y, m, d, h, min, hari: number }`
  - `sapaan(t: Date): 'Pagi' | 'Siang' | 'Sore' | 'Malam'`
  - `keteranganHari(kirim: Date, mulai: Date): string`
  - `jamKirimDefault(jenis: Jenis, mulai: Date): Date` — untuk h7/h1, `mulai` adalah sesi perdana
  - `jamTutupPresensi(kirim: Date): '13.00' | '17.00' | '23.00'`
  - `season(t: Date): string`
  - `tanggalPanjang(t: Date): string`
  - `tanggalPendek(t: Date): string`
  - `jamWib(t: Date): string` (format `"17.00"`)

- [ ] **Step 1: Tulis test yang gagal**
  ```ts
  const perdana = wib(2026, 11, 14, 9, 0);          // Sabtu
  expect(jamKirimDefault('h7', perdana)).toEqual(wib(2026, 11, 7, 10, 0));
  expect(jamKirimDefault('h1', perdana)).toEqual(wib(2026, 11, 13, 10, 0));
  const malam = wib(2026, 10, 6, 19, 30);
  expect(jamKirimDefault('pengingat', malam)).toEqual(wib(2026, 10, 6, 17, 0));
  expect(jamKirimDefault('pengingat', perdana)).toEqual(wib(2026, 11, 13, 19, 0)); // sesi < 10.00
  expect(jamKirimDefault('presensi', malam)).toEqual(wib(2026, 10, 6, 21, 30));
  expect(sapaan(wib(2026, 1, 1, 10, 59))).toBe('Pagi');
  expect(sapaan(wib(2026, 1, 1, 11, 0))).toBe('Siang');
  expect(sapaan(wib(2026, 1, 1, 15, 0))).toBe('Sore');
  expect(sapaan(wib(2026, 1, 1, 18, 0))).toBe('Malam');
  expect(keteranganHari(wib(2026, 10, 6, 17, 0), malam)).toBe('malam ini');
  expect(keteranganHari(wib(2026, 11, 13, 19, 0), perdana)).toBe('besok pagi hari');
  // Review Focus 5: sesi 06.30, pengingat 19.00 kemarin; di UTC keduanya jatuh di tanggal yang sama
  const pagiSekali = wib(2026, 11, 15, 6, 30);
  expect(jamKirimDefault('pengingat', pagiSekali)).toEqual(wib(2026, 11, 14, 19, 0));
  expect(keteranganHari(wib(2026, 11, 14, 19, 0), pagiSekali)).toBe('besok pagi hari');
  expect(jamTutupPresensi(wib(2026, 1, 1, 11, 59))).toBe('13.00');
  expect(jamTutupPresensi(wib(2026, 1, 1, 15, 59))).toBe('17.00');
  expect(jamTutupPresensi(wib(2026, 1, 1, 21, 30))).toBe('23.00');
  expect(season(perdana)).toBe('November 2026');
  expect(tanggalPanjang(perdana)).toBe('Sabtu, 14 November 2026 pukul 09:00 WIB');
  expect(tanggalPendek(malam)).toBe('6 Oktober 2026 pukul 19:30 WIB');
  ```
- [ ] **Step 2:** Jalankan `npx vitest run tests/waktu.test.ts`. Harus FAIL (modul belum ada).
- [ ] **Step 3:** Implementasi. Hitung dengan offset tetap +7 jam: `bagianWib` = komponen UTC dari `t + 7 jam`, dan `wib()` = `Date.UTC(...) - 7 jam`. Nama hari dan bulan Indonesia ditulis sebagai array konstanta. Aturan:
  - Pengingat: kalau jam mulai < 10.00, kirim pukul 19.00 hari sebelumnya. Selain itu, kirim pada mulai − 2,5 jam.
  - Presensi: mulai + 2 jam.
  - H-7/H-1: pukul 10.00 pada tanggal perdana − 7 atau − 1 hari.
  - Keterangan hari: kalau tanggal WIB sama, `${sapaan(mulai).toLowerCase()} ini`. Kalau sesi besok, `besok ${sapaan(mulai).toLowerCase()} hari`.
  - Tutup presensi: kirim < 12.00 → `13.00`; < 16.00 → `17.00`; selain itu `23.00`.
- [ ] **Step 4:** Jalankan test yang sama. Harus PASS.
- [ ] **Step 5:** Commit: `feat: aturan waktu WIB jarkoman`.

### Task 3: Isi teks template

**Files:**
- Create: `lib/jarkoman/template.ts`, `tests/fixtures/h7.txt`, `tests/fixtures/pengingat.txt`, `tests/fixtures/presensi.txt`
- Test: `tests/template.test.ts`

**Interfaces:**
- Consumes: `Kelas`, `Sesi`, fungsi `waktu.ts`
- Produces:
  ```ts
  export type Kategori = 'kelas' | 'waktu' | 'link' | 'sesi';
  export interface Bagian { teks: string; kategori?: Kategori }
  export interface HasilRender { teks: string; bagian: Bagian[]; kosong: string[] }   // kosong = label field wajib yang null
  export function renderJarkoman(jenis: Jenis, ctx: { kelas: Kelas; sesi: Sesi | null; perdana: Sesi; kirimAt: Date }): HasilRender
  export const LABEL_FIELD: Record<string, string>  // contoh: linkPresensi → 'Link presensi'
  ```
  `teks` = gabungan `bagian[].teks`. h1 memakai teks yang sama dengan h7. Field yang kosong ditampilkan sebagai `[Link presensi belum diisi]` dan labelnya masuk ke `kosong`.

- [ ] **Step 1: Tulis fixture** (salin persis; baris kosong penting)

  `tests/fixtures/h7.txt`:
  ```
  Halo rekan-rekan, Selamat datang di HR Recruiter Fast Track Batch 6 ( November 2026 )! 👋🏻

  📅 Sesi Perdana akan dilaksanakan pada: Sabtu, 14 November 2026 pukul 09:00 WIB

  Sebelum kelas dimulai, mohon ikuti langkah-langkah di bawah ini.
  📝 Mengisi Training Need Analysis (TNA)
  https://forms.gle/vwpCTzfxfqXSY7Y47

  📅 Subscribe Google Calendar
  * GCal (Windows/Android): https://tinyurl.com/Gcal-RecruiterBNSP
  * iCal (Apple): https://tinyurl.com/iCal-RecruiterBNSP

  💻 Akses LMS Talentiv
  Login https://edu.talentiv.id/ menggunakan email yang digunakan ketika melakukan pendaftaran, klik "Courses", lalu klik HR Recruiter Fast Track Batch 6 ( November 2026 )

  📚 Panduan Peserta:
  * Deck Onboarding: https://docs.google.com/presentation/d/1AoO294-hdkTxthWB9M5ISuYyWJNTq4eY/edit?usp=drive_link&ouid=107070883553759115815&rtpof=true&sd=true
  * Student Guide: https://drive.google.com/file/d/1e60u9zqQ-eMmIxdT7F4IXyelXrVgBI2m/view?usp=drive_link
  ❓ FAQ Peserta
  Masih bingung? Silakan cek informasi di FAQ Peserta terlebih dahulu. Jika belum tersedia, silakan tanyakan kepada admin 😊
  https://intip.in/FAQPeserta

  📌 Link Zoom akan dibagikan di grup menjelang kelas dimulai.

  Sampai jumpa di sesi perdana! Semangat belajar dan sampai bertemu di kelas! 🚀📚
  ```

  `tests/fixtures/pengingat.txt`:
  ```
  Selamat Sore✨

  Tania ingin mengingatkan rekan-rekan, bahwa kelas Dasar Akuntansi akan dilaksanakan malam ini 6 Oktober 2026 pukul 19:30 WIB - selesai melalui Zoom Meeting. Berikut adalah link Zoom untuk kelas sesi 1 kita:
  https://us06web.zoom.us/j/85717449435?pwd=tJTCpedcE7qrOa4CloqOGkqKHllyaj.1

  Meeting ID: 857 1744 9435
  Passcode: sesi1

  👤 Pembicara: *Irfan Widyanto*
  * 10+ years of experience in Finance Senior Corporate
  * Internal Auditor at one of the largest hospital chains in Indonesia

  Jangan lupa mempersiapkan pertanyaan-pertanyaan yang ingin ditanyakan ya…
  See you!! 💫
  ```

  `tests/fixtures/presensi.txt`:
  ```
  Selamat malam, rekan-rekan!

  Terima kasih sudah berpartisipasi pada kelas Accounting & Tax Fast Track Batch 9 Sesi 1 🙌
  Silakan mengisi presensi dan feedback melalui link berikut:
  🔗 https://forms.gle/YvFwqxDH7fxrQ5oB8

  ⏰ Presensi akan ditutup pukul 23.00 WIB, jadi pastikan untuk mengisinya tepat waktu ya!

  📝 Notes: Mohon mengisi presensi menggunakan nama lengkap sesuai data pendaftaran, karena nama pada presensi akan digunakan sebagai acuan dalam penerbitan sertifikat.

  Semangat & sukses selalu! ✨
  ```
- [ ] **Step 2: Tulis test**
  - Ketiga fixture harus sama dengan `renderJarkoman(...).teks`, memakai data contoh dari fixture.
    - Pengingat: kirim pukul 17.00 pada 6 Okt 2026, sesi 19.30, topik "Dasar Akuntansi".
    - Presensi: kirim pukul 21.30.
  - `renderJarkoman('h1', sama dengan h7).teks === h7`.
  - Kalau `linkPresensi: null`, maka `kosong` berisi `['Link presensi']` dan teks mengandung `[Link presensi belum diisi]`.
  - Setiap `bagian` yang berisi nama kelas punya `kategori: 'kelas'`.
- [ ] **Step 3:** Jalankan `npx vitest run tests/template.test.ts`. Harus FAIL.
- [ ] **Step 4:** Implementasi `renderJarkoman`. Susun array `Bagian` dari potongan teks tetap dan variabel. Field wajib per jenis:
  - h7/h1: nama kelas, namaCourse, mulai perdana, linkTna, linkGcal, linkIcal, linkDeck, linkStudentGuide.
  - pengingat: topik, mulai, nomor, zoomLink, meetingId, passcode, mentorNama.
  - presensi: nama kelas, nomor, linkPresensi.
- [ ] **Step 5:** Jalankan test lagi. Harus PASS.
- [ ] **Step 6:** Commit: `feat: render teks 4 jarkoman sesuai brief`.

### Task 4: Skema database, override, dan rencana jarkoman

**Files:**
- Create: `supabase/migrations/0001_skema.sql`, `lib/jarkoman/efektif.ts`, `lib/jarkoman/rencana.ts`
- Test: `tests/efektif.test.ts`, `tests/rencana.test.ts`

**Interfaces:**
- Consumes: `Kelas`, `Sesi`, `Jenis`, `Status`, `jamKirimDefault`
- Produces:
  ```ts
  export interface Override { entitas: 'kelas' | 'sesi'; entitasId: string; field: string; nilai: string }
  export function terapkanOverride<T extends { id: string }>(row: T, entitas: 'kelas' | 'sesi', o: Override[]): { data: T; sumber: Partial<Record<keyof T, 'api' | 'manual'>> }
  export interface JarkomanRow { id?: string; jenis: Jenis; kelasId: string; sesiId: string | null; kirimAt: Date;
    kirimAtManual: Date | null; status: Status; notifiedAt: Date | null; remindedAt: Date | null; percobaan: number; error: string | null }
  export function rencanakanJarkoman(kelas: Kelas, sesi: Sesi[], ada: JarkomanRow[], now: Date): JarkomanRow[]
  export function kirimEfektif(r: JarkomanRow): Date   // kirimAtManual ?? kirimAt
  ```
- SQL (`0001_skema.sql`):
  - Tabel `kelas`, `sesi` (kolom sesuai tipe; `source_id unique`; `mentor_profil text[]`), `override` (unique `(entitas, entitas_id, field)`), `jarkoman` (unique `(kelas_id, jenis) where sesi_id is null`, unique `(sesi_id, jenis)`), `kendala (id, teks, pelapor, dibuat_at, status default 'baru')`, `pengaturan (id int primary key check (id=1), admin_wa text, sinkron_terakhir timestamptz)`.
  - Enum `jenis_jarkoman`, `status_jarkoman`.
  - RLS aktif di semua tabel. Policy `authenticated` boleh select/insert/update/delete.
  - Fungsi `klaim_notif(ids uuid[]) returns setof jarkoman`: `update jarkoman set status='notif_terkirim', notified_at=now() where id = any(ids) and status in ('terjadwal','perlu_dilengkapi') returning *`.

- [ ] **Step 1: Tulis test yang gagal**
  - `terapkanOverride`: kelas dengan `linkTna='a'` + override `linkTna='b'` → `data.linkTna==='b'`, `sumber.linkTna==='manual'`. Tanpa override → `'api'`. Ini juga mencakup Review Focus 4: data sumber berubah, override tetap menang.
  - `rencanakanJarkoman` untuk kelas dengan 2 sesi dan `ada=[]` → 6 baris (h7, h1, 2×pengingat, 2×presensi), `kirimAt` sesuai `jamKirimDefault`, status `terjadwal`.
  - Sesi bergeser 1 hari, baris lama `terjadwal` tanpa `kirimAtManual` → `kirimAt` ikut bergeser.
  - Baris dengan `kirimAtManual` tetap memakai jam manual walaupun sesi bergeser.
  - Review Focus 1: baris `notif_terkirim`, lalu sesi bergeser ke masa depan → status kembali `terjadwal`, `notifiedAt=null`, `kirimAt` baru.
  - Baris `sudah_dikirim` yang sesinya **tidak** berubah tidak disentuh.
  - Review Focus 2: baris baru dengan `kirimAt < now`:
    - pengingat yang sesinya belum mulai → `terjadwal` (dispatcher kirim segera).
    - pengingat yang sesinya sudah lewat → `dilewati`.
    - presensi masih `terjadwal` sampai mulai + 12 jam.
  - Sesi yang ada di `ada` tapi hilang dari `sesi` → `dilewati`.
- [ ] **Step 2:** Jalankan `npx vitest run tests/efektif.test.ts tests/rencana.test.ts`. Harus FAIL.
- [ ] **Step 3:** Implementasi kedua fungsi. Perlakukan sesi dengan `nomor` terkecil sebagai `perdana`. "Sesi berubah" artinya `jamKirimDefault` hasil hitung ulang berbeda dari `kirimAt` yang tersimpan.
- [ ] **Step 4:** Jalankan test lagi. Harus PASS.
- [ ] **Step 5:** Buat project Supabase. Jalankan `npx supabase link` lalu `npx supabase db push`. Pastikan di SQL editor `select count(*) from jarkoman` mengembalikan 0 tanpa error.
- [ ] **Step 6:** Commit: `feat: skema DB, override, rencana jarkoman`.

### Task 5: Adapter sumber + sync

**Files:**
- Create: `lib/sumber/index.ts`, `lib/sumber/mock.ts`, `lib/supabase/admin.ts`, `lib/db.ts`, `app/api/cron/sync/route.ts`
- Test: `tests/sumber.test.ts`

**Interfaces:**
- Produces:
  - `ambilDataSumber(): Promise<{ kelas: Omit<Kelas,'id'|'otomasiAktif'>[]; sesi: (Omit<Sesi,'id'|'kelasId'> & { kelasSourceId: string })[] }>`. Fungsi ini memilih implementasi berdasarkan `process.env.SUMBER_DATA`. `'supabase'` melempar `Error('Sumber Supabase app.talentiv.id belum dikonfigurasi')` sampai akses didapat.
  - `jalankanSync(now: Date): Promise<{ kelas: number; sesi: number; jarkoman: number }>` di `lib/db.ts`. Urutannya: upsert kelas/sesi lewat `source_id`, lalu `rencanakanJarkoman` per kelas, upsert jarkoman, dan update `pengaturan.sinkron_terakhir`.
  - `supabaseAdmin()` = klien dengan service role. Hanya dipakai di server.
  - `POST /api/cron/sync`: header `Authorization: Bearer ${CRON_SECRET}`. Kalau tidak cocok → 401. Kalau cocok → JSON hasil `jalankanSync`.
- Data mock (`mock.ts`): 3 kelas, season November 2026, data dari brief:
  - HR Recruiter Fast Track Batch 6, perdana Sab 14 Nov 2026 09.00, 8 sesi mingguan, link sesuai fixture h7.
  - Data Analyst Fast Track Batch 7, 8 sesi, salah satu sesi dengan `linkPresensi: null`.
  - Accounting & Tax Fast Track Batch 9, sesi Selasa/Kamis 19.30, mentor Irfan Widyanto + 2 baris profil, Zoom dari fixture pengingat.

- [ ] **Step 1:** Tulis test: `ambilDataSumber()` dengan `SUMBER_DATA=mock` mengembalikan 3 kelas dan setiap sesi punya `kelasSourceId` yang ada di daftar kelas. Dengan `SUMBER_DATA=supabase`, fungsi melempar error berisi teks di atas.
- [ ] **Step 2:** Jalankan `npx vitest run tests/sumber.test.ts`. Harus FAIL.
- [ ] **Step 3:** Implementasi `index.ts` dan `mock.ts`. Test harus PASS.
- [ ] **Step 4:** Implementasi `supabaseAdmin`, `jalankanSync`, dan route sync. Lalu jalankan `npm run dev` dan `curl -X POST -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/sync`. Hasil yang diharapkan: `{"kelas":3,...}` dan baris `jarkoman` terisi. Ulangi curl; jumlah baris di tabel tidak bertambah. Tanpa header, hasilnya 401.
- [ ] **Step 5:** Commit: `feat: adapter sumber mock + endpoint sync`.

### Task 6: Klien WhatsApp + dispatch

**Files:**
- Create: `lib/wa.ts`, `lib/jarkoman/dispatch.ts`, `app/api/cron/dispatch/route.ts`, `app/api/wa/webhook/route.ts`
- Test: `tests/dispatch.test.ts`, `tests/wa.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function bersihkanParam(s: string): string   // \n,\t → ' ', spasi beruntun → 1, potong 1000 karakter
  export async function kirimTemplate(nama: 'jarkoman_siap_kirim' | 'jarkoman_perlu_dilengkapi', ke: string, params: string[]): Promise<{ ok: true; id: string } | { ok: false; error: string }>
  export interface BarisDispatch { id: string; status: Status; kirimAt: Date; otomasiAktif: boolean; lengkap: boolean; remindedAt: Date | null; percobaan: number }
  export function pilihAksi(now: Date, rows: BarisDispatch[]): { notif: string[]; ingat: string[] }
  ```
- Template Meta (diajukan di Task 10, bahasa `id`, kategori UTILITY):
  - `jarkoman_siap_kirim`: `🔔 Jarkoman siap kirim\n{{1}}\n{{2}} · {{3}}\nJam kirim: {{4}} WIB\nBuka: {{5}}`. Isi {{1}}: nama jenis, diawali `⚠️ data belum lengkap · ` kalau tidak lengkap.
  - `jarkoman_perlu_dilengkapi`: `⚠️ Data jarkoman belum lengkap\n{{1}} · {{2}} · {{3}}\nKosong: {{4}}\nLengkapi: {{5}}`.
  - {{5}} = `${APP_URL}/k/${id}` untuk notifikasi siap kirim, atau `${APP_URL}/?j=${id}` untuk pengingat.
- `kirimTemplate`: `POST https://graph.facebook.com/v23.0/${WA_PHONE_NUMBER_ID}/messages` dengan `Authorization: Bearer ${WA_TOKEN}`. Body `{messaging_product:'whatsapp', to, type:'template', template:{name, language:{code:'id'}, components:[{type:'body', parameters: params.map(t=>({type:'text', text: bersihkanParam(t)}))}]}}`.

- [ ] **Step 1: Tulis test yang gagal**
  - `bersihkanParam('a\nb\t\tc     d') === 'a b c d'`.
  - `pilihAksi`:
    - Baris `terjadwal`, `kirimAt<=now`, otomasi aktif → masuk `notif`.
    - Otomasi mati → tidak masuk ke mana pun.
    - Status `notif_terkirim`, `sudah_dikirim`, `dilewati`, atau `gagal` → tidak masuk ke mana pun.
    - Belum lengkap, `kirimAt = now + 23 jam`, `remindedAt=null` → masuk `ingat`.
    - Sama tapi `remindedAt` sudah terisi → tidak masuk.
    - `kirimAt = now + 25 jam` → tidak masuk.
    - `percobaan >= 3` → tidak masuk `notif`.
- [ ] **Step 2:** Jalankan `npx vitest run tests/dispatch.test.ts tests/wa.test.ts`. Harus FAIL.
- [ ] **Step 3:** Implementasi `bersihkanParam`, `kirimTemplate` (`fetch`; respons non-2xx → `{ok:false, error: body.error.message}`), dan `pilihAksi`. Test harus PASS.
- [ ] **Step 4:** Implementasi `POST /api/cron/dispatch` (auth sama dengan sync):
  - Muat baris aktif.
  - Hitung `lengkap` dengan `renderJarkoman(...).kosong.length===0` (setelah override).
  - Panggil `pilihAksi`.
  - Untuk `notif`, panggil RPC `klaim_notif(ids)` dan **kirim hanya baris yang dikembalikan RPC** (Review Focus 3). Kalau gagal, kembalikan status ke sebelumnya dan `percobaan+1`. Kalau `percobaan` mencapai 3, status `gagal` dan simpan `error`.
  - Untuk `ingat`, set `reminded_at=now()` lewat `update ... where reminded_at is null returning id`, lalu kirim hanya id yang dikembalikan.
- [ ] **Step 5:** Tambahkan test integrasi kecil di `tests/dispatch.test.ts` yang men-skip diri kalau `SUPABASE_SERVICE_ROLE_KEY` tidak ada:
  - Panggil `klaim_notif([id])` dua kali secara paralel.
  - Total baris yang dikembalikan harus 1.
  - Jalankan test. Harus PASS.
- [ ] **Step 6:** Implementasi `/api/wa/webhook`:
  - GET mengembalikan `hub.challenge` kalau `hub.verify_token === WA_VERIFY_TOKEN`.
  - POST memverifikasi `X-Hub-Signature-256` (HMAC-SHA256 body dengan `WA_APP_SECRET`). Kalau tidak cocok → 401.
  - Status `failed` untuk pesan yang kita kirim ditulis ke `jarkoman.error`. Simpan id pesan Meta di kolom `wa_message_id`, tambahkan kolom ini di migrasi `0001`.
- [ ] **Step 7:** Commit: `feat: klien WhatsApp + dispatch notifikasi admin`.

### Task 7: Login + kerangka dashboard

**Files:**
- Create: `lib/supabase/server.ts`, `middleware.ts`, `app/login/page.tsx`, `app/(dash)/layout.tsx`

**Interfaces:**
- Produces: `supabaseServer()` (klien `@supabase/ssr` dengan cookie user, tunduk RLS). Semua route kecuali `/login` dan `/api/*` mewajibkan login. Kalau belum login, redirect ke `/login?next=<path>`.

- [ ] **Step 1:** Implementasi middleware dan halaman login (email + password Supabase Auth). Setelah login berhasil, arahkan ke `next`.
- [ ] **Step 2:** Buat layout dashboard sesuai mockup brief:
  - Menu samping `bg-samping` dengan logo teks "talentiv" + "chatbot.talentiv.id", lalu menu Dashboard, Jadwal, Nomor WhatsApp, Laporan Kendala.
  - Di footer menu: "Klien · Talentiv Academy".
  - Header berisi judul "Dashboard Jarkoman" dan tombol **Laporkan Kendala** (outline) dan **Mulai Otomasi** (`bg-cta`).
- [ ] **Step 3:** Verifikasi:
  - Buat user di Supabase Auth, lalu jalankan `npm run dev`.
  - Buka `/` dalam keadaan belum login → diarahkan ke `/login?next=/`.
  - Login → layout tampil.
  - `select * from kelas` dengan anon key tanpa sesi → 0 baris (RLS aktif).
- [ ] **Step 4:** Commit: `feat: login + layout dashboard`.

### Task 8: Halaman Dashboard

**Files:**
- Create: `app/(dash)/page.tsx`, `app/(dash)/actions.ts`, `components/Filter.tsx`, `components/KolomTemplate.tsx`, `components/KolomVariabel.tsx`, `components/PratinjauWA.tsx`, `components/TabelJadwal.tsx`

**Interfaces:**
- Consumes: `renderJarkoman`, `terapkanOverride`, `season`, `kirimEfektif`, `jalankanSync`
- Produces (server actions di `actions.ts`):
  - `simpanOverride(entitas, entitasId, field, nilai: string)`
  - `hapusOverride(entitas, entitasId, field)`
  - `ubahJamKirim(jarkomanId, kirimAt: string | null)` — `null` mengembalikan ke default
  - `aturOtomasi(kelasIds: string[], aktif: boolean)`
  - `sinkronSekarang()`
  - `laporKendala(teks: string)`

  Semua action memakai `supabaseServer()` lalu `revalidatePath('/')`.

- [ ] **Step 1:** Kartu status di bawah header:
  - Nomor WhatsApp: nomor + titik hijau "Terhubung ke API resmi Meta" kalau `WA_PHONE_NUMBER_ID` terisi.
  - Season aktif.
  - Status otomasi kelas terfilter ("Belum dimulai" / "Aktif · n kelas").
  - "Sinkron terakhir {jam}" + tombol Sinkron.
- [ ] **Step 2:** Filter lewat query string `?season=&program=&batch=&jenis=`:
  - Opsi diambil dari data.
  - Default season = season yang sedang berjalan.
  - Pilih jarkoman lewat `?j=<id>`. Default = jarkoman berikutnya yang akan dikirim dalam filter.
- [ ] **Step 3:** Tiga kolom:
  - Template: 4 kartu (H-7 Kelas "Gambar + teks · 8 variabel", H-1 "Sama dengan H-7", Pengingat "Teks · 8 variabel", Presensi "Teks · 6 variabel").
  - Variabel: field efektif dengan chip kategori berwarna stabilo.
    - Field dari sumber tampil read-only dengan label "dari API" dan tombol ✏️. Tombol ini membuka input lalu memanggil `simpanOverride`.
    - Field override diberi label "diubah manual" dan tautan "kembalikan ke data API".
    - Field kosong diberi border oranye dan label "Perlu dilengkapi", dengan input langsung.
  - Pratinjau: gelembung WhatsApp yang me-render `bagian` dengan stabilo per kategori. Untuk H-7/H-1, tampilkan `public/h7.png` di atasnya.
- [ ] **Step 4:** Tabel jadwal "Jadwal jarkoman · Season {x}":
  - Kolom: Program & batch, Sesi, Template, Jadwal kirim (bisa diubah inline lewat `<input type="datetime-local">` yang diinterpretasi sebagai WIB), Variabel (`n/m lengkap` atau `· {field} kosong`), Status (badge: Siap kirim hijau, Perlu dilengkapi oranye, Notif terkirim biru, Sudah dikirim abu, Gagal merah).
- [ ] **Step 5:** Tombol Mulai Otomasi:
  - Tampilkan konfirmasi "Aktifkan notifikasi untuk {n} kelas?", lalu panggil `aturOtomasi`.
  - Kalau semua kelas terfilter sudah aktif, tombol berubah jadi "Hentikan Otomasi".
- [ ] **Step 6:** Tombol Laporkan Kendala membuka `<dialog>` berisi textarea, lalu memanggil `laporKendala`.
- [ ] **Step 7:** Verifikasi dengan data mock:
  - HR Recruiter Batch 6 → H-7 menampilkan teks sama dengan fixture h7.
  - Ubah Link TNA lewat ✏️, lalu Sinkron → nilai manual tetap. "Kembalikan ke data API" → nilai mock kembali.
  - Sesi Data Analyst dengan link presensi kosong tampil "Perlu dilengkapi".
- [ ] **Step 8:** Commit: `feat: halaman dashboard jarkoman`.

### Task 9: Halaman siap kirim, Jadwal, Nomor, Kendala

**Files:**
- Create: `app/k/[id]/page.tsx`, `components/TombolBagikan.tsx`, `lib/jarkoman/bentrok.ts`, `components/KalenderMinggu.tsx`, `app/(dash)/jadwal/page.tsx`, `app/(dash)/nomor/page.tsx`, `app/(dash)/kendala/page.tsx`
- Test: `tests/bentrok.test.ts`

**Interfaces:**
- Produces: `cariBentrok(sesi: { id: string; mulai: Date; durasiMenit?: number }[]): Set<string>`. Default durasi 120 menit. Mengembalikan id sesi yang rentang waktunya tumpang tindih dengan sesi lain.
- Server action tambahan di `actions.ts`: `tandaiSudahDikirim(jarkomanId)` (status `sudah_dikirim`, `confirmed_at=now()`) dan `simpanAdminWa(nomor: string)` (validasi `^62\d{8,13}$`).

- [ ] **Step 1:** Tulis test `cariBentrok`:
  - Sesi 19.30 dan 20.00 di hari yang sama → keduanya bentrok.
  - Sesi 19.30 dan 21.30 → tidak bentrok.
  - Hari berbeda → tidak bentrok.

  Jalankan; harus FAIL. Implementasi; harus PASS.
- [ ] **Step 2:** `/k/[id]` (mobile-first, satu kolom, wajib login lewat middleware):
  - Judul "{Jenis} · {Kelas} · Sesi {n}".
  - Kalau `kosong` tidak kosong, tampilkan banner ⚠️ berisi daftar field.
  - Teks di `<pre class="whitespace-pre-wrap">`.
  - Tombol:
    - **Salin**: `navigator.clipboard.writeText`, lalu tampilkan "Tersalin".
    - **Buka WhatsApp**: `https://wa.me/?text=${encodeURIComponent(teks)}`.
    - Untuk H-7/H-1, **Bagikan gambar + teks**: `navigator.share({ files:[File h7.png], text })` kalau `navigator.canShare({files})`. Kalau tidak didukung, tampilkan link unduh gambar.
    - **Sudah dikirim**: memanggil `tandaiSudahDikirim`.
  - Tap target minimal 44px.
- [ ] **Step 3:** `/jadwal`:
  - Tabel per batch, satu baris per sesi: sesi, topik, tanggal & jam, mentor, status 4 jarkoman.
  - `KalenderMinggu`: 7 kolom hari × sesi berwarna per kelas, navigasi minggu lewat `?minggu=YYYY-MM-DD`. Sesi dari `cariBentrok` diberi border merah dan label "Bentrok".
- [ ] **Step 4:**
  - `/nomor`: nomor bisnis (dari env) + status terhubung, dan form nomor WA admin (`simpanAdminWa`).
  - `/kendala`: tabel laporan + tombol ubah status `baru`/`selesai`.
- [ ] **Step 5:** Verifikasi di Chrome DevTools mode HP (Pixel 7):
  - `/k/<id>` → Salin menyalin teks utuh.
  - Buka WhatsApp mengarah ke `wa.me` dengan teks terisi.
  - Sudah dikirim mengubah badge di dashboard.
  - `/jadwal` menampilkan bentrok kalau dua sesi mock dibuat tumpang tindih.
- [ ] **Step 6:** Commit: `feat: halaman siap kirim, jadwal, nomor, kendala`.

### Task 10: Deploy + cron + Meta

**Files:**
- Create: `supabase/migrations/0002_cron.sql`, `docs/deploy.md`

**Interfaces:**
- Consumes: `/api/cron/sync`, `/api/cron/dispatch`, `/api/wa/webhook`
- `0002_cron.sql`:
  - Aktifkan `pg_cron` dan `pg_net`.
  - Simpan `app_url` dan `cron_secret` di Supabase Vault.
  - `cron.schedule('sync', '0 * * * *', ...)` dan `cron.schedule('dispatch', '* * * * *', ...)`, masing-masing memanggil `net.http_post(url := app_url || '/api/cron/<x>', headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret))`.

- [ ] **Step 1:** Deploy ke Vercel dengan env dari `.env.example`, lalu tambahkan domain `chatbot.talentiv.id` (CNAME di DNS talentiv.id).
- [ ] **Step 2:** Isi Vault, lalu `npx supabase db push`. Cek `select * from cron.job_run_details order by start_time desc limit 5`. Harus ada run `succeeded` untuk dispatch tiap menit.
- [ ] **Step 3:** Siapkan Meta:
  - Di Meta Business Manager, buat WABA, daftarkan nomor baru, dan buat System User token permanen.
  - Ajukan 2 template dari Task 6 (kategori Utility, bahasa Indonesia).
  - Atur webhook ke `https://chatbot.talentiv.id/api/wa/webhook` dengan field `messages`.
  - Catat langkahnya di `docs/deploy.md`.
- [ ] **Step 4:** Uji ujung ke ujung:
  - Isi nomor admin di `/nomor`.
  - Aktifkan otomasi untuk 1 kelas mock.
  - Ubah jam kirim satu jarkoman ke 2 menit dari sekarang.
  - Dalam 3 menit WA admin harus menerima notifikasi "Jarkoman siap kirim" dengan link, dan link membuka `/k/<id>` yang benar.
  - Untuk jarkoman yang datanya kosong dengan jam kirim < 24 jam lagi, harus masuk tepat satu pesan "Data jarkoman belum lengkap".
- [ ] **Step 5:** Commit: `chore: cron pg_cron + panduan deploy`.

---

**Setelah akses Supabase app.talentiv.id didapat (di luar rencana ini):** isi `lib/sumber/supabase.ts` yang memetakan view `v_jarkoman_sesi` ke bentuk `ambilDataSumber()`, set `SUMBER_DATA=supabase`, dan tambahkan test pemetaan dengan contoh 1–2 baris dari pemilik data.
