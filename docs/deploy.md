# Panduan deploy Dashboard Jarkoman (chatbot.talentiv.id)

Urutan ini membawa aplikasi dari mode demo ke produksi. Kerjakan dari atas ke bawah. Tanpa env Supabase, aplikasi berjalan dalam **mode demo**: data contoh, tanpa login, dan tidak bisa menyimpan.

## 1. Supabase

1. Buat project baru di supabase.com (region Singapore). Untuk produksi, gunakan paket Pro supaya project tidak di-pause.
2. Hubungkan repo ke project, lalu jalankan migrasi skema:
   ```
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push    # menjalankan 0001_skema.sql (0002 dijalankan di langkah 4)
   ```
   Kalau `db push` sekaligus mencoba menjalankan `0002_cron.sql`, isi Vault dulu (langkah 4), lalu ulangi.
3. Buka **Authentication → Users → Add user**, lalu buat akun admin (email + password). Matikan pendaftaran publik di **Authentication → Providers → Email → Allow new users to sign up: off**.
4. Buka **SQL editor** dan isi Vault:
   ```sql
   select vault.create_secret('https://chatbot.talentiv.id', 'app_url');
   select vault.create_secret('<CRON_SECRET>', 'cron_secret');
   ```
   Buat `CRON_SECRET` acak, misalnya dengan `openssl rand -hex 32`. Nilai yang sama dipakai di env Vercel.

## 2. Vercel

1. Import repo ini ke Vercel.
2. Isi Environment Variables (lihat `.env.example`):

   | Nama | Isi |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (rahasia, hanya server) |
   | `CRON_SECRET` | Sama dengan Vault |
   | `WA_TOKEN`, `WA_PHONE_NUMBER_ID`, `WA_BUSINESS_NUMBER`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN` | Dari langkah 3 |
   | `SUMBER_DATA` | `mock` sampai akses Supabase app.talentiv.id tersedia |
   | `APP_URL` | `https://chatbot.talentiv.id` |

3. Buka **Domains**, lalu tambahkan `chatbot.talentiv.id`. Di DNS talentiv.id, buat CNAME `chatbot` → `cname.vercel-dns.com`.
4. Setelah deploy, uji: `curl -X POST -H "Authorization: Bearer <CRON_SECRET>" https://chatbot.talentiv.id/api/cron/sync` harus mengembalikan `{"kelas":3,...}`.
5. Jalankan `0002_cron.sql` (lewat `npx supabase db push` atau SQL editor). Lalu cek:
   ```sql
   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
   ```
   Setiap menit harus ada baris `succeeded` untuk dispatch.

## 3. Meta (WhatsApp Cloud API)

1. Buka Meta Business Manager, lalu selesaikan verifikasi bisnis Talentiv.
2. Buka developers.facebook.com, buat App (Business), lalu tambahkan produk **WhatsApp**.
3. Di **WhatsApp → API Setup**, tambahkan **nomor baru** (belum pernah dipakai di aplikasi WhatsApp). Catat `Phone number ID` sebagai `WA_PHONE_NUMBER_ID`.
4. Buka **Business Settings → System users**, buat system user (Admin), assign App + WABA, lalu generate token permanen dengan izin `whatsapp_business_messaging` dan `whatsapp_business_management`. Token ini menjadi `WA_TOKEN`.
5. Buka **App settings → Basic → App secret**, lalu isi sebagai `WA_APP_SECRET`.
6. Buka **WhatsApp → Configuration → Webhook**, isi URL `https://chatbot.talentiv.id/api/wa/webhook`, verify token = nilai acak yang sama dengan `WA_VERIFY_TOKEN`, lalu subscribe field `messages`.
7. Buka **WhatsApp Manager → Message templates** dan ajukan dua template (kategori **Utility**, bahasa **Indonesian**):

   **`jarkoman_siap_kirim`**
   ```
   🔔 Jarkoman siap kirim
   {{1}}
   {{2}} · {{3}}
   Jam kirim: {{4}} WIB
   Buka: {{5}}
   ```
   Contoh untuk persetujuan: `Pengingat sebelum kelas`, `Accounting & Tax Fast Track Batch 9`, `Sesi 1`, `6 Oktober 2026 pukul 17:00`, `https://chatbot.talentiv.id/k/contoh`.

   **`jarkoman_perlu_dilengkapi`**
   ```
   ⚠️ Data jarkoman belum lengkap
   {{1}} · {{2}} · {{3}}
   Kosong: {{4}}
   Lengkapi: {{5}}
   ```
   Contoh: `Presensi`, `Data Analyst Fast Track Batch 7`, `Sesi 3`, `Link presensi`, `https://chatbot.talentiv.id/?j=contoh`.

## 4. Uji ujung ke ujung

1. Login ke chatbot.talentiv.id, buka **Nomor WhatsApp**, lalu isi nomor admin.
2. Di Dashboard, filter satu kelas, lalu tekan **Mulai Otomasi**.
3. Ubah jadwal kirim satu jarkoman ke 2 menit dari sekarang.
4. Dalam 3 menit, WA admin harus menerima "Jarkoman siap kirim". Link di pesan itu harus membuka halaman `/k/...` yang benar.
5. Untuk jarkoman dengan data kosong dan jam kirim kurang dari 24 jam lagi, harus masuk **tepat satu** pesan "Data jarkoman belum lengkap".

## 5. Sebelum go-live

- [ ] Taruh infografis asli di `public/h7.png`, lalu ubah `GAMBAR_H7` di `lib/aset.ts` menjadi `"/h7.png"`.
- [ ] Setelah akses Supabase app.talentiv.id didapat, buat `lib/sumber/supabase.ts`, pasang di `lib/sumber/index.ts`, dan set `SUMBER_DATA=supabase`.
- [ ] Konfirmasi aturan jam tutup presensi (default: kirim sebelum 12.00 → 13.00, sebelum 16.00 → 17.00, selain itu 23.00).
