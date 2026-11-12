# TemuDosen — Sistem Booking Konsultasi dan Bimbingan Akademik

Aplikasi web end-to-end berbasis **Next.js 16 (App Router) + TypeScript + PostgreSQL + Prisma** untuk mengelola jadwal ketersediaan dosen, pengajuan booking konsultasi/bimbingan akademik mahasiswa, persetujuan dosen, perubahan jadwal, catatan konsultasi dengan pemisahan privasi (`private_notes` vs `student_visible_notes`), notifikasi in-app (pola outbox), laporan statistik & ekspor CSV, serta audit log.

---

## Teknologi yang Digunakan
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript (`strict`), Tailwind CSS v4, komponen UI aksesibel berbasis Radix UI (pola shadcn/ui), Lucide Icons, Recharts, React Hook Form + Zod.
- **Backend**: Next.js Route Handlers (`/api/**`) dan Server Components dengan pemisahan layer `policies`, `services`, `notifications`, `audit`, dan `validations`.
- **Database & ORM**: PostgreSQL 16 + Prisma ORM + SQL migration dengan ekstensi `btree_gist`, PostgreSQL **Exclusion Constraint** (`EXCLUDE USING gist`), `pg_advisory_xact_lock`, dan database trigger integritas peran-profil.
- **Autentikasi & Keamanan**: Session cookie `HttpOnly`, `SameSite=Lax`, `Secure` (production) dengan signed JWT (`jose`), bcrypt (`bcryptjs` cost 12), proteksi CSRF Origin, rate limiting, RBAC & ownership check server-side.
- **Testing**: Vitest (unit & integration test) dan Playwright (end-to-end desktop & mobile).

---

## Struktur Direktori Utama
```text
src/
  app/
    (auth)/          # /login, /register
    (student)/       # /student/dashboard, lecturers, book, bookings, history, notifications, profile
    (lecturer)/      # /lecturer/dashboard, calendar, availabilities, requests, upcoming, history, bookings/[id], notifications, profile
    (admin)/         # /admin/dashboard, users, lecturers, students, services, bookings, reports, audit-logs, settings
    api/             # REST Route Handlers (auth, me, lecturers, services, bookings, availabilities, notifications, admin/*)
  components/
    ui/              # Komponen UI aksesibel (Button, Card, Dialog, Select, Table, Tabs, Switch, dll.)
    layout/          # AppShell (Sidebar desktop, Navigation Drawer mobile, Header, Notifikasi, Profil)
    shared/          # StatusBadge, EmptyState, ErrorState, ConfirmDialog, LoadingSkeleton, NotificationsView, ProfileSettingsView
  features/          # Komponen interaktif per domain (bookings, lecturers, lecturer, admin)
  lib/
    auth/            # password.ts, session.ts, rate-limit.ts, csrf.ts
    db/              # prisma.ts
    http/            # api-response.ts
    permissions/     # rbac.ts
    validations/     # Skema Zod
  server/
    policies/        # booking-policy.ts, access-policy.ts, settings-service.ts
    services/        # auth, availability, booking, consultation, schedule-change, lecturer, admin, report, profile
    notifications/   # dispatcher.ts (reliable outbox)
    audit/           # audit-logger.ts
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  unit/
  integration/
  e2e/
```

---

## Instalasi & Menjalankan Secara Lokal

### 1. Instalasi Dependensi
```bash
pnpm install
```

### 2. Konfigurasi Environment Variables
Salin `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Variabel penting:
- `DATABASE_URL`: String koneksi PostgreSQL (contoh: `postgresql://postgres:postgres_dev_password@localhost:5432/temudosen?schema=public`)
- `SESSION_SECRET`: Kunci rahasia penandatanganan sesi JWT (wajib minimal 32 karakter acak di production)
- `NEXT_PUBLIC_APP_URL`: URL utama aplikasi (untuk validasi CSRF Origin)
- `DEFAULT_CAMPUS_TIMEZONE`: Zona waktu awal kampus (default `Asia/Jakarta`)
- `DEFAULT_PENDING_HOLD_HOURS`: Asumsi lama penahanan slot `PENDING` awal (default `24`)
- `DEFAULT_CANCELLATION_CUTOFF_HOURS`: Batas minimal jam pembatalan sebelum jadwal (default `12`)

### 3. Menjalankan Database PostgreSQL
Pastikan PostgreSQL 16 aktif (ekstensi `btree_gist` diaktifkan otomatis oleh migrasi):
```bash
docker compose up -d postgres
```
*(Atau arahkan `DATABASE_URL` ke instance PostgreSQL 16 lokal Anda yang sudah berjalan pada port `5432`.)*

### 4. Generate Client, Migrasi & Seed Development
```bash
pnpm db:generate
pnpm db:deploy
pnpm db:status
pnpm db:seed
```

### 5. Menjalankan Aplikasi
Mode development:
```bash
pnpm dev
```
Atau mode production lokal:
```bash
pnpm build
pnpm start
```
Akses aplikasi pada [http://localhost:3000](http://localhost:3000).

---

## Akun Demo Development (`prisma/seed.ts`)
> **PERINGATAN**: Kredensial berikut hanya dibuat oleh script seed untuk keperluan development/demo. Jangan pernah menjalankan `pnpm db:seed` di production dan ubah/nonaktifkan akun demo sebelum deploy.

| Peran | Email | Kata Sandi |
| :--- | :--- | :--- |
| Administrator | `admin@temudosen.ac.id` | `DemoAdmin123!` |
| Dosen (23 akun sesuai PDF) | `ar.razi@unimal.ac.id`, `asrianda@unimal.ac.id`, `defryhamdhana@unimal.ac.id`, ..., `zarayunizar@unimal.ac.id` | `password123` *(default awal; dapat diubah masing-masing di `/lecturer/profile`)* |
| Mahasiswa 1–5 | `andi.pratama@mhs.temudosen.ac.id` s.d. `eka.putri@mhs.temudosen.ac.id` | `DemoMhs123!` |

---

## Pengujian & Pemeriksaan Kualitas
Pastikan PostgreSQL aktif sebelum menjalankan integration test dan E2E test:
```bash
# TypeScript strict check
pnpm typecheck

# ESLint
pnpm lint

# Unit test (validasi waktu, deteksi bentrok, transisi status, RBAC, privasi catatan)
pnpm test:unit

# Integration test terhadap PostgreSQL (konflik slot, paralel race-condition, trigger DB, IDOR)
pnpm test:integration

# Seluruh test Vitest
pnpm test

# Build produksi
pnpm build

# End-to-End test Playwright (Desktop Chrome & Mobile Pixel 5)
pnpm exec playwright install chromium
pnpm test:e2e
```

---

## Asumsi & Kebijakan Kampus yang Perlu Dikonfirmasi (`/admin/settings`)
Seluruh kebijakan operasional yang belum ditetapkan final disimpan pada tabel `system_settings` dan dapat dikonfigurasi Administrator melalui halaman **Pengaturan Sistem** (`/admin/settings`):
1. `pending_hold_hours` = `24` jam (lama booking `PENDING` menahan slot sebelum kedaluwarsa otomatis).
2. `cancellation_cutoff_hours` = `12` jam (batas minimal sebelum jadwal mahasiswa diizinkan membatalkan booking).
3. `allow_student_cancel_confirmed` = `true` (apakah mahasiswa boleh membatalkan booking berstatus `CONFIRMED`).
4. `confirmed_cancel_requires_approval` = `false` (apakah pembatalan `CONFIRMED` membutuhkan persetujuan dosen).
5. `schedule_change_approver` = `LECTURER` (`LECTURER` | `ADMIN` — pihak yang berwenang memutuskan `ScheduleChangeRequest`).
6. `student_can_view_all_notes` = `false` (mahasiswa hanya melihat `student_visible_notes` & `recommendations`).
7. `admin_can_view_private_notes` = `false` (administrator tidak otomatis melihat `private_notes` dosen).
8. `campus_timezone` = `Asia/Jakarta` (seluruh waktu disimpan UTC di PostgreSQL dan ditampilkan dalam zona waktu kampus).
9. `allow_open_student_registration` = `true` (apakah mahasiswa dapat mendaftar mandiri melalui `/register`).

---

## Panduan Deployment Production
1. Siapkan database PostgreSQL terkelola (PostgreSQL 15/16+) dengan dukungan ekstensi `btree_gist`.
2. Konfigurasikan environment variables production:
   - `NODE_ENV=production`
   - `DATABASE_URL` mengarah ke PostgreSQL production (gunakan SSL bila perlu)
   - `SESSION_SECRET` acak minimal 32–64 byte (`openssl rand -hex 32`)
   - `NEXT_PUBLIC_APP_URL` menggunakan domain HTTPS resmi kampus (mis. `https://temudosen.kampus.ac.id`)
3. Jalankan migrasi produksi:
   ```bash
   pnpm db:deploy
   ```
4. Buat akun administrator resmi pertama secara aman (jangan jalankan `prisma/seed.ts` di production).
5. Aktifkan reverse proxy HTTPS (Nginx/Caddy/Cloudflare) sehingga cookie `Secure` berfungsi penuh dan seluruh trafik terenkripsi TLS.
6. Jalankan `pnpm build && pnpm start` (atau jalankan melalui container/process manager seperti PM2/systemd).
