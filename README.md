# FamFin — Sistem Monitor Keuangan Keluarga (MVP)

Implementasi lengkap sesuai `Dokumen Requirement Sistem Monitor Keuangan Keluarga v1.0`.

Stack: **React + Vite + Tailwind** (frontend) · **Node.js + Express + Prisma** (backend) · **PostgreSQL** (database).

---
 
## Daftar Isi
1. [Struktur Project](#struktur-project)
2. [Fitur yang Sudah Diimplementasikan](#fitur)
3. [PART A — Instalasi & Jalankan di Lokal](#part-a)
4. [PART B — Testing Sebelum Deploy](#part-b)
5. [PART C — Deploy ke Staging (Gratis)](#part-c)
6. [PART D — Deploy ke Production (Gratis)](#part-d)
7. [PART E — Checklist Sebelum Go-Live Sungguhan](#part-e)
8. [Troubleshooting Umum](#troubleshooting)

---

<a name="struktur-project"></a>
## 1. Struktur Project

```
famfin/
├── backend/                  # Node.js + Express + Prisma + PostgreSQL
│   ├── prisma/
│   │   ├── schema.prisma     # Skema database lengkap (semua modul)
│   │   └── seed.js           # Data contoh untuk testing
│   ├── src/
│   │   ├── controllers/      # Logika bisnis tiap modul
│   │   ├── routes/           # Endpoint API
│   │   ├── middleware/       # Auth (JWT), tenant isolation, RBAC
│   │   ├── utils/            # JWT, prisma client, audit log, mailer
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/                 # React + Vite + TailwindCSS
    ├── src/
    │   ├── pages/             # Login, Dashboard, Transaksi, Budget, dst
    │   ├── components/        # Layout/Sidebar
    │   ├── context/           # Auth & tenant state
    │   └── api/                # Axios client
    ├── .env.example
    └── package.json
```

---

<a name="fitur"></a>
## 2. Fitur yang Sudah Diimplementasikan

| # | Modul | Backend | Frontend |
|---|-------|:---:|:---:|
| 1 | Authentication (register, login, lupa/reset password via email) | ✅ | ✅ |
| 2 | Family / Tenant Management | ✅ | ✅ |
| 3 | User Management (Owner buat akun anggota langsung, ubah role, keluarkan anggota) | ✅ | ✅ |
| 4 | Role & Permission (Owner/Admin/Member/Viewer) | ✅ | ✅ |
| 5 | Account Management (Rekening & Dompet) | ✅ | ✅ |
| 6 | Account Access Management (akses granular per rekening) | ✅ | ✅ |
| 7 | Category Management | ✅ | ✅ |
| 8-10 | Income / Expense / Transfer Transaction | ✅ | ✅ |
| 11 | Transaction History + filter | ✅ | ✅ |
| 12 | Dashboard (KPI, grafik) | ✅ | ✅ |
| 13 | Basic Report (income, expense, cashflow, top category) | ✅ | ✅ |
| 14 | Export CSV | ✅ | ✅ |
| 15 | Budget (status Aman/Perhatian/Hampir Habis/Melebihi) | ✅ | ✅ |
| 16 | Financial Goals (Target Tabungan) | ✅ | ✅ |
| 19 | Audit Log | ✅ | ✅ |

Aturan validasi global (nominal > 0, tenant isolation, permission wajib divalidasi backend, rekening nonaktif tidak bisa dipakai, cegah duplicate submit, dsb.) — sesuai dokumen requirement bagian 21 — sudah diimplementasikan di level backend.

---

<a name="part-a"></a>
## 3. PART A — Instalasi & Jalankan di Lokal

### A.1 Prasyarat
Install dulu di komputer Anda:
- **Node.js versi 18 ke atas** — download di [nodejs.org](https://nodejs.org) (pilih versi LTS)
- **Git** — download di [git-scm.com](https://git-scm.com)
- Text editor, disarankan **VS Code**

Cek sudah terinstall dengan benar:
```bash
node -v      # harus muncul v18.x atau lebih baru
npm -v
git --version
```

### A.2 Extract Project
Extract file `famfin-project.zip` yang sudah didownload, lalu buka folder tersebut lewat terminal:
```bash
cd famfin
```

### A.3 Setup Database (Supabase — gratis, tidak perlu install apa pun)
1. Buka [supabase.com](https://supabase.com) → **Sign up** (bisa pakai akun GitHub/Google) → **New Project**.
2. Isi nama project (misal `famfin-dev`), buat password database (**catat & simpan**), pilih region **Southeast Asia (Singapore)**.
3. Tunggu ±2 menit sampai project selesai dibuat.
4. Klik ikon **Settings (gear)** di sidebar kiri bawah → **Database** → scroll ke **Connection String** → tab **URI** → copy.
5. Connection string terlihat seperti ini:
   ```
   postgresql://postgres.xxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
6. Ganti bagian `[YOUR-PASSWORD]` dengan password yang tadi Anda buat. Simpan URL ini, akan dipakai di langkah berikutnya.

DB Local
Password : z7jzyfLqADoWBanQ
postgresql://postgres:[z7jzyfLqADoWBanQ]@db.bfijzwchpfngbrmskwlz.supabase.co:5432/postgres
--------------------------------------------------------------------------------

> Alternatif: kalau sudah familiar dengan Docker, bisa juga jalankan Postgres lokal:
> ```bash
> docker run --name famfin-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=famfin -p 5432:5432 -d postgres:16
> ```
> lalu `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/famfin"`

### A.4 Setup & Jalankan Backend
```bash
cd backend
cp .env.example .env
```
Buka file `.env` dengan text editor, isi minimal 2 hal ini:
```
DATABASE_URL="<connection string dari Supabase langkah A.3>"
JWT_SECRET="isi-dengan-string-acak-panjang-minimal-32-karakter"
```
Tips generate `JWT_SECRET` acak:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Biarkan `SMTP_*` kosong dulu (email lupa-password akan otomatis muncul di terminal/console, bukan dikirim beneran — ini normal untuk testing lokal).

Install dependencies & siapkan database:
```bash
npm install
npx prisma migrate dev --name init
```
Perintah di atas akan otomatis membuat semua tabel (User, Tenant, Account, Transaction, Budget, dst.) di database Supabase Anda.

(Opsional) isi data contoh agar langsung ada rekening & kategori untuk dicoba:
```bash
npm run prisma:seed
```
Ini akan membuat akun demo: `haykal@famfin.test` / `password123`.

Jalankan server:
```bash
npm run dev
```
Kalau berhasil akan muncul: `FamFin backend berjalan di port 4000`
Cek di browser: buka **http://localhost:4000/health** → harus muncul `{"status":"ok",...}`

**Biarkan terminal ini tetap terbuka/berjalan.**

### A.5 Setup & Jalankan Frontend
Buka **terminal baru** (jangan tutup terminal backend):
```bash
cd famfin/frontend
cp .env.example .env
npm install
npm run dev
```
Kalau berhasil akan muncul URL, biasanya **http://localhost:5173**

Buka URL tersebut di browser. Anda akan melihat halaman Login FamFin.

### A.6 Coba Aplikasinya
- Klik **Daftar** → isi nama, email, nama keluarga, password → otomatis login dan masuk ke Dashboard.
- Atau login dengan akun demo dari seed: `haykal@famfin.test` / `password123`
- Coba tambah rekening (menu **Rekening & Dompet**), catat transaksi pemasukan/pengeluaran (menu **Transaksi**), lihat perubahan di **Dashboard**.
- Coba fitur **Lupa Password**: minta reset, lalu cek **terminal backend** — link reset password akan muncul di sana (karena SMTP belum dikonfigurasi, ini normal untuk mode development).

---

<a name="part-b"></a>
## 4. PART B — Testing Sebelum Deploy

Sebelum deploy, pastikan alur-alur ini sudah dicoba manual di lokal dan berjalan benar:

- [ ] Register akun baru → otomatis jadi Owner keluarga baru
- [ ] Login/logout
- [ ] Lupa password → reset password → login dengan password baru
- [ ] Tambah rekening (Bank/Cash/E-Wallet)
- [ ] Catat pemasukan → saldo rekening bertambah
- [ ] Catat pengeluaran → saldo rekening berkurang
- [ ] Transfer antar rekening → saldo kedua rekening berubah, tidak masuk hitungan income/expense
- [ ] Buat kategori custom
- [ ] Buat budget untuk 1 kategori, lakukan pengeluaran, cek status budget berubah (Aman → Perhatian → dst)
- [ ] Buat target tabungan, tambah kontribusi, cek progress bar
- [ ] Sebagai Owner, buat akun anggota baru (isi nama, email, password, role) → catat password yang ditampilkan → logout → login pakai email & password tsb sebagai anggota baru
- [ ] Ubah role anggota tersebut, pastikan menu yang tersedia berubah sesuai role
- [ ] Sebagai Owner, atur Account Access anggota Member ke suatu rekening, login sebagai Member, pastikan hanya bisa lihat rekening yang diberi akses
- [ ] Export transaksi ke CSV, buka file-nya, pastikan datanya benar
- [ ] Cek Audit Log mencatat semua aksi di atas

Kalau semua checklist di atas jalan lancar, Anda siap deploy ke staging.

--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

<a name="part-c"></a>
## 5. PART C — Deploy ke Staging (100% Gratis)

Stack hosting gratis yang dipakai:
- **Database**: [Supabase](https://supabase.com)
- **Backend**: [Render](https://render.com)
- **Frontend**: [Vercel](https://vercel.com)

> Catatan: Render free tier akan "tidur" setelah 15 menit tidak ada request, dan butuh ±30 detik untuk bangun lagi saat pertama diakses. Wajar untuk staging/demo.

DB Staging :
Password : giSVuMmcgXuv5cEM
postgresql://postgres:[giSVuMmcgXuv5cEM]@db.ldamshkcuearrbckwlku.supabase.co:5432/postgres

### C.1 Push Kode ke GitHub
```bash
cd famfin
git init
git add .
git commit -m "Initial commit - FamFin MVP"
```
Buat repository baru di [github.com/new](https://github.com/new), beri nama `famfin`, **jangan** centang "Add README" (biar tidak konflik). Lalu:
```bash
git remote add origin https://github.com/<username-anda>/famfin.git    https://github.com/Haykal12345678/Famfin.git
git branch -M main
git push -u origin main
```

### C.2 Buat Database Staging (Supabase)
Sama seperti langkah A.3, buat **project Supabase baru** khusus staging, misalnya beri nama `famfin-staging`. Simpan connection string-nya.

### C.3 Deploy Backend ke Render
1. Buka [render.com](https://render.com) → Sign up/login pakai GitHub.
2. **New → Web Service** → pilih/connect repo `famfin` yang tadi di-push.
3. Isi konfigurasi:
   - **Name**: `famfin-backend-staging`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**:
     ```
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**
4. Tab **Environment** → tambahkan variable satu per satu:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | connection string Supabase staging |
   | `JWT_SECRET` | generate baru dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `CORS_ORIGIN` | isi sementara `*`, nanti diupdate di langkah C.4 |
   | `FRONTEND_URL` | isi sementara `*`, nanti diupdate di langkah C.4 |
   | `SMTP_HOST` | kosongkan dulu (lihat PART E untuk setup email production) |
5. Klik **Create Web Service**. Tunggu build selesai (status jadi **Live**), biasanya 2-5 menit.
6. Catat URL backend, contoh: `https://famfin-backend-staging.onrender.com`
7. Tes: buka `https://famfin-backend-staging.onrender.com/health` di browser → harus muncul JSON status ok.

### C.4 Deploy Frontend ke Vercel
1. Buka [vercel.com](https://vercel.com) → Sign up/login pakai GitHub.
2. **Add New → Project** → import repo `famfin`.
3. Klik **Edit** pada Root Directory → pilih folder `frontend`.
4. Framework Preset otomatis terdeteksi **Vite**.
5. Buka **Environment Variables**, tambahkan:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://famfin-backend-staging.onrender.com/api` (dari langkah C.3) |
6. Klik **Deploy**. Tunggu ±1-2 menit.
7. Setelah selesai, catat URL frontend, contoh: `https://famfin-staging.vercel.app`

### C.5 Hubungkan Backend ↔ Frontend (Update CORS)
Kembali ke **Render** → service `famfin-backend-staging` → tab **Environment** → update:
```
CORS_ORIGIN=https://famfin-staging.vercel.app
FRONTEND_URL=https://famfin-staging.vercel.app
```
Simpan, Render akan otomatis redeploy (atau klik **Manual Deploy → Deploy latest commit**).

### C.6 Tes Staging End-to-End
Buka `https://famfin-staging.vercel.app`, ulangi semua checklist di **PART B** — pastikan semuanya jalan normal di staging sebelum lanjut ke production.

---

<a name="part-d"></a>
## 6. PART D — Deploy ke Production (Gratis)

Prinsipnya **sama persis** seperti PART C, tapi pakai project/service terpisah supaya staging dan production tidak saling ganggu.

1. **Database**: buat project Supabase baru, nama `famfin-prod`.
2. **Backend**: Render → New Web Service lagi → nama `famfin-backend-prod`, root directory `backend`, environment variables sama seperti C.3 tapi `DATABASE_URL` mengarah ke Supabase `famfin-prod`, dan `JWT_SECRET` **beda** dari staging (generate baru, jangan dipakai ulang).
3. **Frontend**: Vercel → Add New Project lagi (atau gunakan branch terpisah di project yang sama) → nama `famfin-prod`, root directory `frontend`, `VITE_API_URL` mengarah ke backend production.
4. Update `CORS_ORIGIN` dan `FRONTEND_URL` di Render production dengan URL Vercel production.
5. (Opsional, gratis) Tambahkan **custom domain** di Vercel: Project Settings → Domains → masukkan domain Anda sendiri kalau punya, atau tetap pakai subdomain `.vercel.app`.

### Ringkasan Environment
| | Staging | Production |
|---|---|---|
| Database | Supabase `famfin-staging` | Supabase `famfin-prod` |
| Backend | Render `famfin-backend-staging` | Render `famfin-backend-prod` |
| Frontend | Vercel `famfin-staging` | Vercel `famfin-prod` |

### Auto-Deploy
Setiap `git push` ke branch `main` akan otomatis trigger build ulang di Render & Vercel. Kalau ingin workflow lebih rapi: gunakan branch `develop` untuk auto-deploy ke staging, dan branch `main` khusus untuk production (atur di Settings masing-masing dashboard → Branch).

---

<a name="part-e"></a>
## 7. PART E — Checklist Sebelum Go-Live Sungguhan

MVP ini sudah lengkap secara fungsional, tapi sebelum dipakai oleh keluarga/user sungguhan (bukan sekadar demo), selesaikan dulu:

### E.1 Aktifkan Pengiriman Email Asli (khusus fitur Lupa Password)
Saat ini kalau `SMTP_HOST` kosong, email reset password hanya tercetak di log server — user tidak benar-benar menerima email. Untuk production:
1. Daftar gratis di [Resend](https://resend.com) (100 email/hari gratis) atau [Brevo](https://brevo.com) (300 email/hari gratis).
2. Ambil SMTP credentials dari dashboard mereka.
3. Isi di environment variable Render production:
   ```
   SMTP_HOST=smtp.resend.com   (atau sesuai provider)
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<dari provider>
   SMTP_PASS=<dari provider>
   SMTP_FROM="FamFin <no-reply@domainanda.com>"
   ```

> Catatan: pembuatan akun anggota keluarga **tidak** memakai email sama sekali. Owner/Admin membuat akun anggota langsung dari menu **Anggota Keluarga** (isi nama, email, password awal, role), lalu password tersebut diserahkan manual (langsung/chat pribadi) ke orang yang bersangkutan — bukan dikirim otomatis. SMTP di atas hanya dipakai untuk fitur **Lupa Password**.

### E.2 Keamanan Tambahan
- [ ] Ganti semua `JWT_SECRET` dengan nilai unik & rahasia (jangan reuse dari staging/contoh)
- [ ] Set `NODE_ENV=production` di backend production
- [ ] Pastikan `.env` **tidak pernah ter-commit** ke Git (sudah ada di `.gitignore`)
- [ ] Aktifkan 2FA di akun GitHub, Render, Vercel, Supabase Anda

### E.3 Kualitas & Reliabilitas
- [ ] Tambahkan automated testing (unit test untuk validasi bisnis, integration test untuk endpoint kritikal)
- [ ] Tambahkan error monitoring (misal [Sentry](https://sentry.io), free tier tersedia)
- [ ] Setup backup database otomatis (Supabase Pro punya point-in-time recovery; di free tier, export manual berkala lewat dashboard)

### E.4 Performa
- [ ] Kalau traffic mulai nyata dan free tier Render terasa lambat (cold start), upgrade ke paket **Starter** (~$7/bulan)
- [ ] Kalau database mendekati limit 500MB, upgrade Supabase ke **Pro** (~$25/bulan)

### E.5 Fitur yang Belum Ada (opsional, di luar scope MVP awal)
- Upload foto profil / logo keluarga (butuh storage seperti Cloudinary/S3 — belum diimplementasikan)
- Refresh token / kelola sesi login per device
- Notifikasi (misal budget hampir habis) via email/push

---

<a name="troubleshooting"></a>
## 8. Troubleshooting Umum

| Masalah | Solusi |
|---|---|
| `npx prisma migrate dev` error "Can't reach database" | Cek `DATABASE_URL` di `.env` sudah benar, password tidak mengandung karakter yang perlu di-escape, dan project Supabase statusnya aktif (buka dashboard Supabase untuk "wake up" project yang sempat pause) |
| Frontend muncul error CORS di console browser | Pastikan `CORS_ORIGIN` di backend **persis sama** dengan URL frontend (termasuk `https://`, tanpa trailing slash) |
| Login berhasil tapi semua halaman kosong/403 | Cek header `X-Tenant-Id` terkirim — biasanya karena `localStorage` kosong, coba logout lalu login ulang |
| Render backend lambat saat pertama diakses | Normal untuk free tier (cold start ±30 detik setelah idle 15 menit). Upgrade paket berbayar untuk hilangkan ini |
| Reset password: email tidak masuk | Kalau `SMTP_HOST` belum diisi, ini memang mode dev — link reset muncul di **log Render** (tab Logs), bukan di email asli |
| `npm install` gagal karena versi Node | Pastikan Node.js versi 18 atau lebih baru (`node -v`) |

---

Kalau ada langkah yang error saat dijalankan, beri tahu pesan error lengkapnya (dari terminal atau dari tab Logs di Render/Vercel) — akan lebih mudah dibantu debug dari situ.


