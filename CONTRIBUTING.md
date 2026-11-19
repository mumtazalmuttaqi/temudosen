# Panduan Kontribusi (Contributing Guidelines)

Terima kasih atas ketertarikan Anda untuk berkontribusi pada pengembangan **TemuDosen**. Untuk menjaga keamanan, stabilitas, dan kualitas kode sistem, semua kontributor diwajibkan mengikuti aturan berikut:

## 1. Aturan Keamanan Utama
- **Jangan pernah menyertakan kredensial nyata**: Hindari mencantumkan kata sandi, token JWT, kunci privat, atau URL database produksi dalam kode sumber.
- Gunakan variabel lingkungan melalui `process.env.*` dan dokumentasikan variabel baru di `.env.example`.
- Semua data masukan pengguna dari form atau API wajib divalidasi dengan **Zod** di sisi server sebelum diproses oleh database.
- Pastikan logika bisnis tidak melewati batasan RBAC atau menimbulkan celah *Insecure Direct Object References* (IDOR).

## 2. Alur Kerja Kontribusi (Workflow)
1. **Fork Repository**: Lakukan fork repository ini ke akun GitHub Anda.
2. **Buat Branch Fitur/Perbaikan**:
   ```bash
   git checkout -b feature/nama-fitur
   # atau
   git checkout -b fix/nama-bug
   ```
3. **Lakukan Pengujian Mandiri Secara Ketat**:
   Sebelum membuat commit, pastikan semua perintah berikut lolos tanpa error:
   ```bash
   pnpm typecheck   # Memastikan tidak ada kesalahan tipe TypeScript
   pnpm lint        # Memastikan kepatuhan aturan ESLint
   pnpm test:unit   # Menjalankan pengujian logika bisnis
   pnpm build       # Memastikan aplikasi berhasil di-build untuk produksi
   ```
4. **Buat Pull Request (PR)**:
   - Buat PR yang mengarah ke branch `main`.
   - Isi formulir PR checklist secara jujur.
   - PR akan otomatis diuji oleh GitHub Actions CI. PR yang gagal dalam pemeriksaan CI tidak akan diizinkan untuk di-merge.
   - Tunggu review dan persetujuan dari *Code Owner* (`@mumtazalmuttaqi`).
