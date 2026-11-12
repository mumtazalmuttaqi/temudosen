import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function wibDate(daysOffset: number, hourWib: number, minuteWib = 0): Date {
  const now = new Date();
  // Ambil tanggal hari ini dalam WIB (UTC+7)
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = wibNow.getUTCFullYear();
  const month = wibNow.getUTCMonth();
  const day = wibNow.getUTCDate() + daysOffset;
  // Konversi balik dari WIB ke UTC (kurangi 7 jam)
  return new Date(Date.UTC(year, month, day, hourWib - 7, minuteWib, 0, 0));
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed development tidak boleh dijalankan di environment production!");
  }

  console.log("Memulai seeding database TemuDosen (development)...");

  // 1. Pastikan system_settings tersedia
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      pendingHoldHours: 24,
      cancellationCutoffHours: 12,
      allowStudentCancelConfirmed: true,
      confirmedCancelRequiresApproval: false,
      scheduleChangeApprover: "LECTURER",
      studentCanViewAllNotes: false,
      adminCanViewPrivateNotes: false,
      campusTimezone: "Asia/Jakarta",
      allowOpenStudentRegistration: true,
    },
  });

  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@temudosen.ac.id" },
  });
  if (existingAdmin) {
    console.log("Data demo sudah tersedia, melewati seed duplikat.");
    return;
  }

  const [adminHash, lecturerHash, studentHash] = await Promise.all([
    bcrypt.hash("DemoAdmin123!", 10),
    bcrypt.hash("DemoDosen123!", 10),
    bcrypt.hash("DemoMhs123!", 10),
  ]);

  // 2. Administrator (1 akun)
  const admin = await prisma.user.create({
    data: {
      name: "Drs. Wahyu Setiawan",
      email: "admin@temudosen.ac.id",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // 3. Layanan konsultasi
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: "Bimbingan Skripsi / Tugas Akhir",
        description: "Konsultasi progres bab, metodologi, implementasi, dan persiapan sidang tugas akhir.",
        durationMinutes: 45,
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: "Konsultasi Akademik & KRS",
        description: "Perencanaan studi semester, pengambilan mata kuliah, dan evaluasi IPK bersama dosen wali.",
        durationMinutes: 30,
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: "Review Proposal Penelitian",
        description: "Penelaahan topik, rumusan masalah, dan tinjauan pustaka untuk proposal penelitian/hibah.",
        durationMinutes: 60,
        isActive: true,
      },
    }),
    prisma.service.create({
      data: {
        name: "Diskusi Magang & Karier",
        description: "Bimbingan persiapan kerja praktik/magang industri dan pengembangan portofolio akademik.",
        durationMinutes: 30,
        isActive: true,
      },
    }),
  ]);

  // 4. Dosen (3 akun)
  const lecturerSpecs = [
    {
      name: "Dr. Budi Santoso, M.Kom.",
      email: "budi.santoso@temudosen.ac.id",
      lecturerNumber: "0014058201",
      expertise: "Rekayasa Perangkat Lunak, Arsitektur Sistem, Basis Data",
      faculty: "Fakultas Ilmu Komputer",
      bio: "Dosen pembimbing tugas akhir dan koordinator bidang Rekayasa Perangkat Lunak. Membuka sesi konsultasi terstruktur untuk mahasiswa tingkat akhir maupun bimbingan KRS.",
      serviceIds: [services[0].id, services[1].id, services[2].id, services[3].id],
    },
    {
      name: "Dr. Siti Rahma, M.T.",
      email: "siti.rahma@temudosen.ac.id",
      lecturerNumber: "0021088502",
      expertise: "Tata Kelola TI, Manajemen Proyek Sistem Informasi, UX Research",
      faculty: "Fakultas Ilmu Komputer",
      bio: "Peneliti dan dosen pengampu mata kuliah Analisis Proses Bisnis dan Tata Kelola TI. Fokus mendampingi penyusunan proposal penelitian dan proyek magang.",
      serviceIds: [services[0].id, services[1].id, services[2].id, services[3].id],
    },
    {
      name: "Prof. Dr. Hendra Wijaya, M.Sc.",
      email: "hendra.wijaya@temudosen.ac.id",
      lecturerNumber: "0003117501",
      expertise: "Kecerdasan Buatan, Sistem Tertanam, Publikasi Ilmiah",
      faculty: "Fakultas Teknik",
      bio: "Guru besar bidang Sistem Cerdas dan IoT. Membimbing mahasiswa riset, tugas akhir, dan penulisan artikel jurnal bereputasi.",
      serviceIds: [services[0].id, services[2].id, services[3].id],
    },
  ];

  const lecturers = [];
  for (const spec of lecturerSpecs) {
    const user = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        passwordHash: lecturerHash,
        role: "LECTURER",
        status: "ACTIVE",
        lecturerProfile: {
          create: {
            lecturerNumber: spec.lecturerNumber,
            expertise: spec.expertise,
            faculty: spec.faculty,
            bio: spec.bio,
            lecturerServices: {
              create: spec.serviceIds.map((serviceId) => ({ serviceId })),
            },
          },
        },
      },
      include: { lecturerProfile: true },
    });
    lecturers.push({ user, profile: user.lecturerProfile! });
  }

  // 5. Mahasiswa (5 akun)
  const studentSpecs = [
    {
      name: "Andi Pratama",
      email: "andi.pratama@mhs.temudosen.ac.id",
      studentNumber: "2310511001",
      programStudy: "Informatika",
      faculty: "Fakultas Ilmu Komputer",
    },
    {
      name: "Bela Safitri",
      email: "bela.safitri@mhs.temudosen.ac.id",
      studentNumber: "2310511002",
      programStudy: "Informatika",
      faculty: "Fakultas Ilmu Komputer",
    },
    {
      name: "Cahyo Nugroho",
      email: "cahyo.nugroho@mhs.temudosen.ac.id",
      studentNumber: "2310512003",
      programStudy: "Sistem Informasi",
      faculty: "Fakultas Ilmu Komputer",
    },
    {
      name: "Dina Kartika",
      email: "dina.kartika@mhs.temudosen.ac.id",
      studentNumber: "2310513004",
      programStudy: "Teknik Elektro",
      faculty: "Fakultas Teknik",
    },
    {
      name: "Eka Putri",
      email: "eka.putri@mhs.temudosen.ac.id",
      studentNumber: "2310511005",
      programStudy: "Informatika",
      faculty: "Fakultas Ilmu Komputer",
    },
  ];

  const students = [];
  for (const spec of studentSpecs) {
    const user = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        passwordHash: studentHash,
        role: "STUDENT",
        status: "ACTIVE",
        studentProfile: {
          create: {
            studentNumber: spec.studentNumber,
            programStudy: spec.programStudy,
            faculty: spec.faculty,
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push({ user, profile: user.studentProfile! });
  }

  // 6. Ketersediaan dosen (hari lampau untuk histori + beberapa hari ke depan)
  for (const lec of lecturers) {
    await prisma.availability.createMany({
      data: [
        // 3 hari lalu (lampau untuk data histori)
        {
          lecturerId: lec.profile.id,
          startAt: wibDate(-3, 9, 0),
          endAt: wibDate(-3, 12, 0),
          status: "OPEN",
        },
        // Besok (+1 hari) pagi & siang
        {
          lecturerId: lec.profile.id,
          startAt: wibDate(1, 9, 0),
          endAt: wibDate(1, 12, 0),
          status: "OPEN",
        },
        {
          lecturerId: lec.profile.id,
          startAt: wibDate(1, 13, 30),
          endAt: wibDate(1, 16, 0),
          status: "OPEN",
        },
        // +2 hari
        {
          lecturerId: lec.profile.id,
          startAt: wibDate(2, 9, 0),
          endAt: wibDate(2, 12, 0),
          status: "OPEN",
        },
        // +3 hari
        {
          lecturerId: lec.profile.id,
          startAt: wibDate(3, 10, 0),
          endAt: wibDate(3, 15, 0),
          status: "OPEN",
        },
        // +5 hari
        {
          lecturerId: lec.profile.id,
          startAt: wibDate(5, 9, 0),
          endAt: wibDate(5, 12, 0),
          status: "OPEN",
        },
      ],
    });
  }

  // 7. Booking beragam status + konsultasi + riwayat status + notifikasi + audit log
  const pendingExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Booking 1: COMPLETED (lampau, dengan catatan konsultasi privat & visible)
  const bCompleted = await prisma.booking.create({
    data: {
      bookingCode: "TD-20261109-A101",
      studentId: students[0].profile.id,
      lecturerId: lecturers[0].profile.id,
      serviceId: services[0].id,
      serviceDurationSnapshot: 45,
      startAt: wibDate(-3, 9, 0),
      endAt: wibDate(-3, 9, 45),
      topic: "Review Bab 1 dan Bab 2 Skripsi Sistem Antrean Akademik",
      additionalNotes: "Sudah melampirkan draf revisi di repositori jurusan.",
      status: "COMPLETED",
      consultation: {
        create: {
          privateNotes: "Catatan internal dosen: mahasiswa perlu memperdalam studi literatur 2 tahun terakhir sebelum layak masuk seminar proposal.",
          studentVisibleNotes: "Struktur Bab 1 sudah baik. Perkuat latar belakang dengan data empiris dan tambahkan 5 referensi jurnal terbaru pada Bab 2.",
          recommendations: "Revisi Bab 2 selesai dalam 7 hari, siapkan diagram arsitektur untuk pertemuan berikutnya.",
          followUpDate: wibDate(5, 9, 0),
        },
      },
      statusHistories: {
        create: [
          { fromStatus: null, toStatus: "PENDING", changedBy: students[0].user.id, reason: "Pengajuan awal" },
          { fromStatus: "PENDING", toStatus: "CONFIRMED", changedBy: lecturers[0].user.id, reason: "Disetujui oleh dosen" },
          { fromStatus: "CONFIRMED", toStatus: "COMPLETED", changedBy: lecturers[0].user.id, reason: "Konsultasi selesai dilaksanakan" },
        ],
      },
    },
  });

  // Booking 2: CONFIRMED (+1 hari pagi)
  const bConfirmed = await prisma.booking.create({
    data: {
      bookingCode: "TD-20261112-B202",
      studentId: students[0].profile.id,
      lecturerId: lecturers[0].profile.id,
      serviceId: services[1].id,
      serviceDurationSnapshot: 30,
      startAt: wibDate(1, 9, 0),
      endAt: wibDate(1, 9, 30),
      topic: "Konsultasi Rencana Pengambilan Mata Kuliah Pilihan Semester Genap",
      additionalNotes: "Ingin menanyakan prasyarat mata kuliah Sistem Terdistribusi.",
      status: "CONFIRMED",
      statusHistories: {
        create: [
          { fromStatus: null, toStatus: "PENDING", changedBy: students[0].user.id, reason: "Pengajuan awal" },
          { fromStatus: "PENDING", toStatus: "CONFIRMED", changedBy: lecturers[0].user.id, reason: "Jadwal dikonfirmasi dosen" },
        ],
      },
    },
  });

  // Booking 3: PENDING (+1 hari pagi slot berbeda)
  const bPending = await prisma.booking.create({
    data: {
      bookingCode: "TD-20261112-C303",
      studentId: students[1].profile.id,
      lecturerId: lecturers[0].profile.id,
      serviceId: services[0].id,
      serviceDurationSnapshot: 45,
      startAt: wibDate(1, 10, 0),
      endAt: wibDate(1, 10, 45),
      topic: "Konsultasi Perancangan Skema Database Tugas Akhir",
      additionalNotes: "Membawa ERD versi 2 untuk diperiksa.",
      status: "PENDING",
      pendingExpiresAt: pendingExpires,
      statusHistories: {
        create: [
          { fromStatus: null, toStatus: "PENDING", changedBy: students[1].user.id, reason: "Pengajuan awal" },
        ],
      },
    },
  });

  // Booking 4: PENDING pada Dosen 2
  await prisma.booking.create({
    data: {
      bookingCode: "TD-20261112-D404",
      studentId: students[2].profile.id,
      lecturerId: lecturers[1].profile.id,
      serviceId: services[2].id,
      serviceDurationSnapshot: 60,
      startAt: wibDate(2, 9, 0),
      endAt: wibDate(2, 10, 0),
      topic: "Review Proposal Penelitian Audit Tata Kelola COBIT 2019",
      status: "PENDING",
      pendingExpiresAt: pendingExpires,
      statusHistories: {
        create: [
          { fromStatus: null, toStatus: "PENDING", changedBy: students[2].user.id, reason: "Pengajuan awal" },
        ],
      },
    },
  });

  // Booking 5: REJECTED (tidak memblokir slot)
  await prisma.booking.create({
    data: {
      bookingCode: "TD-20261111-E505",
      studentId: students[3].profile.id,
      lecturerId: lecturers[2].profile.id,
      serviceId: services[2].id,
      serviceDurationSnapshot: 60,
      startAt: wibDate(1, 9, 0),
      endAt: wibDate(1, 10, 0),
      topic: "Diskusi Topik Hibah Riset AI",
      status: "REJECTED",
      rejectionReason: "Mohon lengkapi draf abstrak terlebih dahulu sebelum menjadwalkan sesi review.",
      statusHistories: {
        create: [
          { fromStatus: null, toStatus: "PENDING", changedBy: students[3].user.id, reason: "Pengajuan awal" },
          { fromStatus: "PENDING", toStatus: "REJECTED", changedBy: lecturers[2].user.id, reason: "Mohon lengkapi draf abstrak terlebih dahulu" },
        ],
      },
    },
  });

  // Booking 6: CANCELLED (tidak memblokir slot)
  await prisma.booking.create({
    data: {
      bookingCode: "TD-20261111-F606",
      studentId: students[4].profile.id,
      lecturerId: lecturers[0].profile.id,
      serviceId: services[3].id,
      serviceDurationSnapshot: 30,
      startAt: wibDate(2, 10, 0),
      endAt: wibDate(2, 10, 30),
      topic: "Konsultasi Persiapan Magang Industri",
      status: "CANCELLED",
      cancellationReason: "Bentrok dengan jadwal ujian praktikum pengganti.",
      statusHistories: {
        create: [
          { fromStatus: null, toStatus: "PENDING", changedBy: students[4].user.id, reason: "Pengajuan awal" },
          { fromStatus: "PENDING", toStatus: "CANCELLED", changedBy: students[4].user.id, reason: "Bentrok ujian praktikum" },
        ],
      },
    },
  });

  // Booking 7: NO_SHOW (lampau)
  await prisma.booking.create({
    data: {
      bookingCode: "TD-20261109-G707",
      studentId: students[2].profile.id,
      lecturerId: lecturers[1].profile.id,
      serviceId: services[1].id,
      serviceDurationSnapshot: 30,
      startAt: wibDate(-3, 10, 0),
      endAt: wibDate(-3, 10, 30),
      topic: "Evaluasi KRS Semester Berjalan",
      status: "NO_SHOW",
      statusHistories: {
        create: [
          { fromStatus: null, toStatus: "PENDING", changedBy: students[2].user.id, reason: "Pengajuan awal" },
          { fromStatus: "PENDING", toStatus: "CONFIRMED", changedBy: lecturers[1].user.id, reason: "Disetujui" },
          { fromStatus: "CONFIRMED", toStatus: "NO_SHOW", changedBy: lecturers[1].user.id, reason: "Mahasiswa tidak hadir" },
        ],
      },
    },
  });

  // Notifikasi awal
  await prisma.notification.createMany({
    data: [
      {
        userId: lecturers[0].user.id,
        title: "Permintaan Booking Baru",
        message: `${students[1].user.name} mengajukan Bimbingan Skripsi / Tugas Akhir (${bPending.bookingCode}).`,
        type: "BOOKING_CREATED",
        relatedEntityType: "Booking",
        relatedEntityId: bPending.id,
      },
      {
        userId: students[0].user.id,
        title: "Booking Dikonfirmasi",
        message: `Booking ${bConfirmed.bookingCode} dengan ${lecturers[0].user.name} telah dikonfirmasi.`,
        type: "BOOKING_APPROVED",
        relatedEntityType: "Booking",
        relatedEntityId: bConfirmed.id,
      },
      {
        userId: students[0].user.id,
        title: "Catatan Bimbingan Tersedia",
        message: `${lecturers[0].user.name} menambahkan ringkasan dan rekomendasi untuk ${bCompleted.bookingCode}.`,
        type: "CONSULTATION_UPDATED",
        relatedEntityType: "Booking",
        relatedEntityId: bCompleted.id,
      },
    ],
  });

  // Audit log awal
  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: "SYSTEM_SEED_DEV",
      entityType: "SystemSetting",
      entityId: "1",
      metadata: {
        lecturers: lecturers.length,
        students: students.length,
        services: services.length,
      },
    },
  });

  console.log("Seeding database TemuDosen selesai!");
}

main()
  .catch((e) => {
    console.error("Gagal menjalankan seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

