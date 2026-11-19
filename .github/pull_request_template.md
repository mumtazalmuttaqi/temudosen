## Ringkasan Perubahan
<!-- Jelaskan apa yang diubah, diperbaiki, atau ditambahkan -->

## Kategori Perubahan
- [ ] Bug fix (perbaikan bug tanpa mengubah fitur yang ada)
- [ ] Fitur baru (penambahan fitur baru yang kompatibel)
- [ ] Refactoring / Optimasi performa
- [ ] Pembaruan dokumentasi / CI

## Daftar Periksa Keamanan (Wajib Dicentang)
- [ ] **TIDAK ADA KREDENSIAL/RAHASIA**: Saya memastikan tidak ada API key, token, string koneksi database, atau file `.env` yang ter-commit.
- [ ] **Validasi Server-Side**: Semua input pengguna divalidasi menggunakan Zod di sisi server.
- [ ] **Uji Mutu Lokal**: Saya telah menjalankan `pnpm typecheck`, `pnpm lint`, dan `pnpm test` di lokal dan semuanya lulus tanpa error.
- [ ] **Hak Akses & Otorisasi**: Perubahan ini mematuhi aturan RBAC (Mahasiswa, Dosen, Admin) dan tidak membuka celah IDOR.
