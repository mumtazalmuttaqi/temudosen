import { expect, test, type Page } from "@playwright/test";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email Kampus", { exact: true }).fill(email);
  await page.getByLabel("Kata Sandi", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
}

test.describe("TemuDosen End-to-End Flow", () => {
  test("login tiap role, pembatasan akses RBAC, dan tampilan responsif", async ({ page, isMobile }) => {
    // 1. Login Mahasiswa
    await loginAs(page, "andi.pratama@mhs.temudosen.ac.id", "DemoMhs123!");
    await expect(page).toHaveURL(/\/student\/dashboard/);
    await expect(page.getByRole("heading", { name: /Selamat datang, Andi Pratama/i })).toBeVisible();

    if (isMobile) {
      // Pastikan drawer navigasi mobile berfungsi
      await page.getByRole("button", { name: "Buka menu navigasi" }).click();
      await expect(page.getByRole("link", { name: "Cari Dosen" })).toBeVisible();
      await page.getByRole("button", { name: "Tutup menu navigasi" }).click();
    }

    // Mahasiswa dilarang mengakses halaman Admin (403 Forbidden)
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading", { name: /Akses Ditolak/i })).toBeVisible();

    // Logout lewat menu profil
    await page.goto("/student/dashboard");
    await page.getByRole("button", { name: /Andi Pratama/i }).click();
    await page.getByRole("menuitem", { name: /Keluar/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // 2. Login Dosen
    await loginAs(page, "ar.razi@unimal.ac.id", "DemoDosen123!");
    await expect(page).toHaveURL(/\/lecturer\/dashboard/);
    await expect(page.getByRole("heading", { name: /Selamat datang, Ar Razi/i })).toBeVisible();

    await page.getByRole("button", { name: /Ar Razi/i }).click();
    await page.getByRole("menuitem", { name: /Keluar/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // 3. Login Admin & kelola pengguna/laporan
    await loginAs(page, "admin@temudosen.ac.id", "DemoAdmin123!");
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("heading", { name: /Panel Administrator Kampus/i })).toBeVisible();

    await page.goto("/admin/users");
    await expect(page.getByText("Ar Razi, S.T., M.Cs")).toBeVisible();

    await page.goto("/admin/reports");
    await expect(page.getByText("Total Booking", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ekspor CSV/i })).toBeVisible();
  });

  test("alur penuh: mahasiswa cari dosen & booking -> dosen setujui -> isi catatan -> mahasiswa cek riwayat aman", async ({
    page,
  }, testInfo) => {
    const uniqueTopic = `Bimbingan E2E ${testInfo.project.name} ${Date.now()}`;
    const secretNote = `CATATAN-PRIVAT-E2E-${Date.now()}`;
    const publicNote = `CATATAN-TERBUKA-E2E-${Date.now()}`;

    // 1. Mahasiswa login dan mencari dosen
    await loginAs(page, "eka.putri@mhs.temudosen.ac.id", "DemoMhs123!");
    await expect(page).toHaveURL(/\/student\/dashboard/);

    await page.goto("/student/lecturers");
    await page.getByLabel("Cari dosen").fill("Zahratul Fitri");
    await expect(page.getByText("Zahratul Fitri")).toBeVisible();
    await expect(page.getByText("Ar Razi, S.T., M.Cs")).toHaveCount(0);
    await expect(page.getByText(/Generative AI dan LLM untuk pelayanan publik/i)).toBeVisible();

    // Klik Buat Booking untuk Zahratul Fitri
    await page.getByRole("link", { name: "Buat Booking" }).first().click();
    await expect(page).toHaveURL(/\/student\/book/);

    // Langkah 2: Pilih Layanan
    await page.getByRole("button", { name: /Konsultasi Akademik & KRS/i }).click();

    // Langkah 3: Pilih tanggal & slot pertama yang tersedia
    await expect(page.getByText("Pilih Jam Konsultasi")).toBeVisible();
    const slotButtons = page.locator("button:has(svg.lucide-clock)");
    await expect(slotButtons.first()).toBeVisible();
    await slotButtons.first().click();
    await page.getByRole("button", { name: /Lanjut Isi Topik/i }).click();

    // Langkah 4: Isi topik
    await page.getByLabel(/Topik \/ Tujuan Konsultasi/i).fill(uniqueTopic);
    await page.getByRole("button", { name: /Tinjau Ringkasan/i }).click();

    // Langkah 5 & 6: Kirim permintaan
    await page.getByRole("button", { name: /Kirim Permintaan Booking/i }).click();
    await expect(page.getByText(/Nomor Booking:/i)).toBeVisible();
    await expect(page.getByText("Menunggu Persetujuan", { exact: true })).toBeVisible();

    // Logout mahasiswa
    await page.getByRole("button", { name: /Eka Putri/i }).click();
    await page.getByRole("menuitem", { name: /Keluar/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // 2. Dosen Zahratul Fitri login, setujui booking, tandai selesai, dan isi catatan terpisah
    await loginAs(page, "zahratulfitri@unimal.ac.id", "DemoDosen123!");
    await expect(page).toHaveURL(/\/lecturer\/dashboard/);

    await page.goto("/lecturer/requests");
    await expect(page.getByText(uniqueTopic)).toBeVisible();

    // Buka detail booking tersebut
    const card = page
      .locator("div.rounded-xl", { hasText: uniqueTopic })
      .filter({ has: page.getByRole("link", { name: "Detail" }) })
      .first();
    await card.getByRole("link", { name: "Detail" }).click();

    // Setujui
    await page.getByRole("button", { name: /Setujui Booking/i }).click();
    await expect(page.getByText("Dikonfirmasi", { exact: true }).first()).toBeVisible();

    // Tandai Selesai
    await page.getByRole("button", { name: /Tandai Selesai/i }).click();
    await page.getByRole("button", { name: /Ya, Tandai Selesai/i }).click();
    await expect(page.getByText("Selesai", { exact: true }).first()).toBeVisible();

    // Isi catatan privat & catatan terbuka untuk mahasiswa
    await page.getByLabel(/Catatan Privat Dosen/i).fill(secretNote);
    await page.getByLabel(/Catatan untuk Mahasiswa/i).fill(publicNote);
    await page.getByLabel(/Rekomendasi/i).fill("Pertahankan IPK semester ini.");
    await page.getByRole("button", { name: /Simpan Catatan Konsultasi/i }).click();
    await expect(page.getByText(/Catatan konsultasi berhasil disimpan/i).first()).toBeVisible();

    // Logout dosen
    await page.getByRole("button", { name: /Zahratul Fitri/i }).click();
    await page.getByRole("menuitem", { name: /Keluar/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // 3. Mahasiswa login kembali dan memeriksa status + riwayat (privateNote TIDAK BOLEH terlihat!)
    await loginAs(page, "eka.putri@mhs.temudosen.ac.id", "DemoMhs123!");
    await expect(page).toHaveURL(/\/student\/dashboard/);
    await page.goto("/student/history");
    await expect(page.getByText(uniqueTopic)).toBeVisible();
    await expect(page.getByText(publicNote)).toBeVisible();
    await expect(page.getByText(secretNote)).toHaveCount(0);
  });
});

