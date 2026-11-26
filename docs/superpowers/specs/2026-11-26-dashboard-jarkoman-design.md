# Dashboard Jarkoman Talentiv — Desain

Tanggal: 26 November 2026 · Status: menunggu persetujuan
Dasar: "Brief Chatbot Jarkoman Talentiv Academy" (26 Nov 2026) + diskusi 26 Nov 2026.

## 1. Tujuan dan alasan

Tim Talentiv setiap hari menulis jarkoman WhatsApp secara manual untuk sekitar 9 kelas yang berjalan bersamaan. Jarkoman itu terdiri dari H-7, H-1, pengingat sebelum kelas, dan presensi. Isinya hampir sama setiap kali. Yang berganti hanya variabel seperti nama kelas, tanggal, link Zoom, mentor, dan link presensi.

Dashboard ini mengambil alih pekerjaan menyusun dan mengingat. Data kelas diambil otomatis dari sistem app.talentiv.id, jadi admin tidak mengetik ulang. Teks jarkoman disusun otomatis. Pada jam kirim, admin menerima notifikasi WhatsApp berisi link ke teks yang sudah jadi. Admin tinggal menyalin teks itu ke grup kelas.

Perubahan dari brief:
- Data variabel tidak lagi diinput admin. Data diambil dari API app.talentiv.id (Supabase). Admin hanya mengoreksi field yang kosong atau salah.
- Desain memakai brand Talentiv, bukan Levela.
- Bagian 3 brief ("Cara input tanggal", impor Google Sheet) diganti oleh sinkronisasi data.
- Pengiriman semi-otomatis, bukan langsung ke grup (lihat Kendala).

## 2. Sasaran, bukan sasaran, anti-sasaran

Sasaran:
- Keempat jarkoman rutin tersusun otomatis untuk semua sesi semua kelas aktif.
- Admin menerima notifikasi WhatsApp tepat pada jam kirim, lalu bisa mengirim ke grup dalam kurang dari 30 detik dari HP.
- Data dari app.talentiv.id tampil tanpa diketik ulang. Field yang kosong ditandai "Perlu dilengkapi" jauh sebelum jam kirim.
- Desain bisa di-upgrade ke pengiriman pesan pribadi ke peserta tanpa membangun ulang.

Bukan sasaran (untuk versi ini):
- Mengirim langsung ke grup WhatsApp, atau pesan pribadi ke peserta.
- Editor template. Teks tetap keempat jarkoman ditulis di kode sesuai brief.
- Peran per LO atau banyak penerima notifikasi. Hanya 1 nomor admin.
- Chatbot AI yang menjawab pertanyaan peserta.
- Impor Google Sheet.

Anti-sasaran (gagal walaupun "jalan"):
- Nomor WhatsApp diblokir. Karena itu tidak boleh memakai library tidak resmi (Fonnte, WAHA, Baileys, whatsapp-web.js).
- Teks berisi data kelas lain atau sesi yang salah, misalnya link Zoom tertukar.
- Dashboard menulis atau mengubah data di Supabase app.talentiv.id. Akses harus baca saja.
- Admin tetap harus mengetik ulang data yang sebenarnya sudah ada di app.talentiv.id.

## 3. Kendala

- **WhatsApp Cloud API Groups API** maksimal 8 peserta per grup. Grup juga harus dibuat oleh nomor bisnis. Grup kelas (30–40 peserta) tidak bisa dikirim lewat API resmi.
- **Parameter template Meta** tidak boleh berisi baris baru. Teks jarkoman lengkap tidak bisa dikirim lewat template, jadi notifikasi hanya membawa ringkasan + link.
- **Akses Supabase app.talentiv.id** masih diminta ke pemiliknya. Struktur tabel belum diketahui. Pengembangan berjalan dengan data contoh.
- **Biaya:** notifikasi utility ±Rp367 per pesan + PPN, kira-kira 160 pesan per bulan, jadi ±Rp60 ribu. Supabase Pro $25 per bulan untuk produksi.
- **Zona waktu:** semua jam dalam WIB (Asia/Jakarta). Simpan sebagai `timestamptz`.

## 4. Pendekatan yang dipertimbangkan

**Stack**
| Pilihan | Untung | Rugi |
|---|---|---|
| Laravel + MySQL di Hostinger | Cron dan antrian bawaan; hosting sudah dibayar | PHP; tidak satu ekosistem dengan sumber data |
| **Next.js + Supabase (dipilih)** | pg_cron + Edge Function tanpa server; login bawaan; satu ekosistem dengan app.talentiv.id | Biaya Supabase Pro untuk produksi |
| PHP native | Ringan | Login, cron, dan retry dibuat sendiri |

Dipilih Next.js + Supabase, karena pengguna dan Claude akan merawat bersama dan sumber datanya juga Supabase.

**Cara kirim**
| Pilihan | Ke grup | Aman blokir | Otomatis penuh | Biaya per bulan |
|---|---|---|---|---|
| Pesan pribadi via API resmi | Tidak | Ya | Ya | ±Rp2–2,6 jt |
| **Semi-otomatis (dipilih)** | Ya | Ya | Tidak | ±Rp60 rb |
| Gateway tidak resmi | Ya | Tidak | Ya | Langganan |

**Bentuk semi-otomatis**
- **A (dipilih):** notifikasi WA ke admin berisi link ke halaman siap kirim.
- B: hanya dashboard + email atau notifikasi browser. Mudah terlewat.
- C: bot Telegram. Butuh aplikasi tambahan dan nomor WA tidak terpakai.

Dipilih A, karena admin sudah memakai WhatsApp, dan nomor resmi sudah siap untuk upgrade ke pesan pribadi nanti.

## 5. Desain

### 5.1 Arsitektur

```
Supabase app.talentiv.id (baca saja)
        │  sync tiap 1 jam + tombol "Sinkron"
        ▼
Supabase project kita ── Postgres: kelas, sesi, override, jarkoman, kendala, pengaturan
        │                Auth: login admin
        │                pg_cron (tiap menit) ─► Edge Function `dispatch-due`
        │                pg_cron (tiap jam)   ─► Edge Function `sync-source`
        ▼
WhatsApp Cloud API ── template utility `jarkoman_siap_kirim` ─► WA admin
        │
Next.js (Vercel, domain chatbot.talentiv.id) ── dashboard + halaman siap kirim /k/[id]
```

- Sumber data diakses lewat satu modul adapter (`source`) dengan dua implementasi:
  - `mock`: data contoh dari brief (HR Recruiter Fast Track Batch 6, Data Analyst Fast Track Batch 7, Accounting & Tax Fast Track Batch 9, Dasar Akuntansi).
  - `supabase`: REST `/rest/v1/...` ke app.talentiv.id, diisi setelah akses didapat.
- Adapter dipilih lewat env.
- Key sumber hanya disimpan di secret Edge Function, tidak pernah dikirim ke browser.

### 5.2 Data

- **kelas**: `source_id`, nama kelas + batch, program, season, nama course LMS, jenis kelas (essentials/BNSP/PLUS), link TNA, GCal, iCal, Deck Onboarding, Student Guide, status otomasi (aktif/tidak).
- **sesi**: `source_id`, kelas, nomor sesi, topik, mulai (timestamptz), link Zoom, Meeting ID, passcode, nama mentor, profil mentor (multi-baris), link presensi.
- **override**: entitas (kelas/sesi), id, field, nilai, siapa, kapan. Nilai override selalu menang atas data sumber. Sync tidak pernah menyentuh tabel ini. Tersedia aksi "kembalikan ke data API", yang menghapus baris override.
- **jarkoman**: satu baris per (kelas, jenis H-7/H-1) dan per (sesi, jenis pengingat/presensi). Kolom: `kirim_at`, `kirim_at_manual` (nullable), status, `notified_at`, `confirmed_at`, `error`.
  - Status: `terjadwal` · `perlu_dilengkapi` · `notif_terkirim` · `sudah_dikirim` · `gagal` · `dilewati`.
- **kendala**: laporan dari tombol "Laporkan Kendala" (teks, pelapor, waktu, status).
- **pengaturan**: nomor WA admin, aturan jam default.

Sync membuat atau memperbarui baris `jarkoman` untuk setiap sesi baru atau yang berubah. Kalau tanggal sesi berubah, `kirim_at` dihitung ulang, kecuali ada `kirim_at_manual`. Sesi yang hilang dari sumber ditandai `dilewati`, tidak dihapus.

### 5.3 Teks dan variabel waktu

- Keempat template ditulis di kode, sama persis dengan teks brief bagian 4.1–4.3. Variabelnya disisipkan dari data efektif (sumber + override).
- **Season** = bulan dan tahun sesi perdana kelas, misalnya "November 2026", dan dipakai untuk filter.
- **Sapaan** dihitung dari jam kirim: <11.00 Pagi · 11.00–14.59 Siang · 15.00–17.59 Sore · ≥18.00 Malam.
- **Keterangan hari** (pengingat): kalau tanggal kirim sama dengan tanggal sesi, "pagi ini"/"siang ini"/"sore ini"/"malam ini" mengikuti jam sesi. Kalau sesi besok, "besok pagi hari" dan seterusnya.
- Format tanggal: "Sabtu, 14 November 2026 pukul 09:00 WIB" (H-7/H-1) dan "6 Oktober 2026 pukul 19:30 WIB" (pengingat), sesuai contoh brief.

**Jam kirim default** (bisa diubah per jarkoman). Semua ini *keputusan saya*, mohon dicek:
- H-7 dan H-1: pukul 10.00 pada H-7/H-1 dari sesi perdana.
- Pengingat: 2,5 jam sebelum sesi (contoh brief: 17.00 untuk kelas 19.30). Kalau sesi mulai sebelum 10.00, kirim pukul 19.00 hari sebelumnya ("besok pagi hari").
- Presensi: 2 jam setelah sesi mulai (contoh brief: ±21.00 untuk kelas 19.30).
- Jam tutup presensi: kirim sebelum 12.00 → 13.00; sebelum 16.00 → 17.00; selain itu → 23.00 WIB. Brief menyebut aturan ini masih perlu dikonfirmasi.

**Kelengkapan.** Jarkoman berstatus `perlu_dilengkapi` kalau ada variabel wajib yang kosong. Dashboard menampilkan daftarnya.

Admin diingatkan **satu kali** per jarkoman, lewat template utility `jarkoman_perlu_dilengkapi`.

- **Kapan:** 24 jam sebelum jam kirim, dan hanya kalau data masih belum lengkap.
- **Kalau jarkoman dibuat kurang dari 24 jam sebelum jam kirim**, misalnya ada sesi baru dari sinkron, pengingat dikirim segera.
- **Isi:** jenis · kelas · sesi · field yang kosong · link ke form variabelnya.
- **Pencatatan:** setelah terkirim, dicatat di `jarkoman.reminded_at`, dan tidak diulang.
- **Saat jam kirim**, kalau data masih kosong, notifikasi siap kirim diberi tanda "⚠️ data belum lengkap". Ini bukan pesan tambahan.

Perkiraan biaya tambahan: ±Rp10–20 ribu per bulan.

### 5.4 Pengiriman notifikasi

- pg_cron tiap menit memanggil `dispatch-due`. Fungsi ini menjalankan tiga tugas:
  - Mengambil jarkoman yang memenuhi tiga syarat: status terjadwal atau perlu dilengkapi, waktu efektif ≤ sekarang, dan otomasi kelas aktif.
  - Mengirim pengingat "perlu dilengkapi" (satu kali, 24 jam sebelum jam kirim).
- Status diklaim secara atomik (`UPDATE ... WHERE status IN (...) RETURNING`), supaya satu jarkoman tidak dikirim dua kali.
- Template `jarkoman_siap_kirim` (kategori utility, bahasa id). Parameternya satu baris tanpa newline:
  - jenis
  - kelas + batch
  - sesi
  - jam kirim
  - path link `/k/{id}`
- Kalau gagal, dicoba ulang maksimal 3 kali (tiap menit berikutnya). Setelah itu status `gagal`, ditampilkan di dashboard, dan error Meta disimpan.
- Tombol **Mulai Otomasi** mengaktifkan otomasi untuk kelas/batch yang sedang difilter. Sebelum diaktifkan, tidak ada notifikasi yang terkirim.

### 5.5 Halaman siap kirim `/k/[id]` (dibuka di HP)

- Wajib login. Sesi Supabase Auth bertahan di HP admin.
- Isi halaman:
  - judul (jenis · kelas · sesi)
  - teks lengkap yang sudah terisi
  - tombol **Salin**
  - tombol **Buka WhatsApp**: `https://wa.me/?text=<teks>`, admin memilih grup sendiri
  - tombol **Sudah dikirim**: status menjadi `sudah_dikirim`
- H-7/H-1 punya gambar tetap. Tombol **Bagikan** memakai Web Share API (`navigator.share` dengan file gambar + teks). Kalau tidak didukung, tampilkan tombol unduh gambar + salin teks.

### 5.6 Dashboard (desktop)

Mengikuti mockup brief bagian 5:
- **Menu samping:** Dashboard, Jadwal, Nomor WhatsApp, Laporan Kendala.
- **Header:** tombol Laporkan Kendala dan Mulai Otomasi. Kartu status: nomor WA (terhubung ke API Meta atau tidak), season aktif, status otomasi, waktu sinkron terakhir + tombol Sinkron.
- **Filter:** Season, Nama program, Batch, Jenis jarkoman.
- **Tiga kolom:**
  - Template: 4 jenis + jumlah variabel.
  - Variabel: tiap field berlabel warna kategori (Data kelas kuning, Waktu hijau, Link biru, Sesi & pembicara pink, sesuai brief) dan penanda sumber ("dari API" terkunci, ✏️ untuk override, "Perlu dilengkapi" untuk yang kosong).
  - Jarkoman: pratinjau bergaya WhatsApp dengan variabel di-stabilo.
- **Tabel jadwal:** program & batch, sesi, template, jadwal kirim (bisa diubah), kelengkapan variabel, status.
- **Halaman Jadwal:** tabel per batch (satu baris per sesi) dan kalender mingguan untuk 9 kelas. Sesi yang tumpang tindih jamnya diberi tanda bentrok.
- **Laporkan Kendala:** form singkat, disimpan ke tabel `kendala`, dan ditampilkan di halaman Laporan Kendala.

### 5.7 Tampilan

Brand Talentiv, tema terang:
- Latar `#EEF5F4`, kartu `#FFFFFF`, teks `#1E3F44`, teks sekunder `#4E6A6C`, garis `#D3E3E0`.
- Tombol utama `#1F8A7E` dengan teks putih tebal.
- Menu samping memakai `#143532` (surface-900 gelap) dengan teks putih.
- Judul memakai Poppins 400. Teks lain memakai DM Sans 400/500/600.
- Sudut: tombol 16px, kartu 20–24px.
- Warna stabilo variabel tetap seperti brief, supaya cocok dengan dokumen tim LO.
- Efek kaca dan foto dari brand poster tidak dipakai di dashboard.

### 5.8 Keamanan

- Semua tabel memakai RLS: hanya pengguna yang login yang bisa membaca dan menulis.
- Key Supabase sumber, token Meta, dan service key hanya disimpan sebagai secret Edge Function / env server.
- Webhook Meta (status pesan) diverifikasi dengan app secret.

## 6. Yang diserahkan ke pembangun

- Struktur folder, library UI (disarankan Tailwind dengan token di atas), dan detail komponen.
- Pemetaan kolom sumber ke tabel `kelas`/`sesi`, setelah akses Supabase app.talentiv.id didapat.
- Cara pendaftaran nomor WA ke Meta dan persetujuan template. Pengguna perlu menyiapkan Business Manager dan verifikasi bisnis.
- Test: unit test untuk perhitungan jam kirim, sapaan, keterangan hari, jam tutup presensi, dan pengisian template. Tambahkan satu test klaim atomik di dispatcher.

## 7. Terbuka

- Aturan jam tutup presensi (menunggu konfirmasi dari brief).
- Akses dan struktur Supabase app.talentiv.id.
