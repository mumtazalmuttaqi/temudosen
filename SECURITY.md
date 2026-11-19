# Kebijakan Keamanan (Security Policy)

## Versi yang Didukung

Hanya versi terbaru pada branch `main` yang secara aktif menerima pembaruan keamanan:

| Versi | Didukung |
| :--- | :--- |
| `main` (Production) | :white_check_mark: |
| Rilis Sebelumnya | :x: |

## Melaporkan Celah Keamanan (Vulnerability Reporting)

Kami menganggap serius keamanan sistem **TemuDosen**. Jika Anda menemukan kerentanan atau celah keamanan (vulnerability):

> [!CAUTION]
> **JANGAN MEMBUKA PUBLIC ISSUE** untuk masalah keamanan yang belum diperbaiki, karena dapat membahayakan pengguna aktif.

Silakan laporkan melalui salah satu jalur privat berikut:
1. **GitHub Private Vulnerability Reporting**: Buka tab **Security** > **Advisories** pada repository ini dan klik tombol **"Report a vulnerability"**.
2. **Email Kontak Keamanan**: Kirim email privat ke `mumtazia.230170189@mhs.unimal.ac.id` dengan subjek `[Security Issue] TemuDosen`.

### Informasi yang Diharapkan dalam Laporan:
- Deskripsi kerentanan dan potensi dampaknya.
- Langkah-langkah untuk mereproduksi masalah (*Proof of Concept* atau skrip uji coba).
- Saran mitigasi atau perbaikan jika ada.

Kami akan menanggapi laporan Anda dalam kurun waktu 1–3 hari kerja dan bekerja sama untuk merilis perbaikan sebelum informasi dipublikasikan (*Responsible Disclosure*).

## Kebijakan Kredensial & Kontribusi Aman

1. **Larangan Commit Kredensial**: Tidak ada kontributor yang diizinkan untuk meng-commit file `.env`, token sesi, kunci JWT, atau *connection string* database aktif.
2. **Validasi Rahasia Otomatis**: Repository ini mengaktifkan **GitHub Secret Scanning** dan **Push Protection**. Setiap commit yang terdeteksi mengandung format kunci/token rahasia akan otomatis ditolak oleh GitHub saat push.
3. **Pemberian Hak Akses Terbatas**: Seluruh kontributor wajib bekerja melalui *fork* dan mengajukan *Pull Request* yang melalui pengujian CI otomatis dan persetujuan *Code Owner*.
