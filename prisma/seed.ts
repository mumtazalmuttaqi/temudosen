import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function wibDate(daysOffset: number, hourWib: number, minuteWib = 0): Date {
  const now = new Date();
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = wibNow.getUTCFullYear();
  const month = wibNow.getUTCMonth();
  const day = wibNow.getUTCDate() + daysOffset;
  return new Date(Date.UTC(year, month, day, hourWib - 7, minuteWib, 0, 0));
}

interface PdfLecturerSpec {
  name: string;
  nip: string;
  nidn: string;
  email: string;
  expertise: string;
  faculty: string;
  thesisRecommendations: string[];
}

const PDF_LECTURERS: PdfLecturerSpec[] = [
  {
    name: "Ar Razi, S.T., M.Cs",
    nip: "198903072020121004",
    nidn: "0007038903",
    email: "ar.razi@unimal.ac.id",
    expertise:
      "Machine Learning, Deep Learning, Natural Language Processing (NLP), Data Mining, Data Science, Rekayasa Perangkat Lunak, Pengembangan Web",
    faculty: "Fakultas Teknik",
    thesisRecommendations: ["Data mining", "NLP", "Pengembangan Web"],
  },
  {
    name: "Dr. Asrianda, S.Kom., M. Kom",
    nip: "197305152006041001",
    nidn: "0015057317",
    email: "asrianda@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Deep Learning, Natural Language Processing (NLP), Data Mining, Data Science, Sistem Pendukung Keputusan, Sistem Pakar, Pengembangan Mobile, Geographic Information System (GIS)",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Pemetaan Daerah Rawan Banjir Menggunakan Data Mining dan GIS",
      "Pemetaan Potensi Kebakaran Hutan dan Lahan Metode: Decision Tree, Random Forest. Data: Titik hotspot, curah hujan, tutupan lahan. Output: Peta risiko kebakaran.",
      "Prediksi Produktivitas Pertanian Berbasis GIS dan Machine Learning Metode: Random Forest, SVM. Data: Curah hujan, jenis tanah, suhu, luas lahan. Output: Peta prediksi hasil panen.",
    ],
  },
  {
    name: "Dr. Eng. Defry Hamdhana, S.T., M.Kom",
    nip: "198705052015041003",
    nidn: "0005058704",
    email: "defryhamdhana@unimal.ac.id",
    expertise:
      "Machine Learning, Deep Learning, Natural Language Processing (NLP), Data Science",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Ekstraksi Informasi Otomatis dari Dokumen Peraturan Akademik Unimal Menggunakan Named Entity Recognition Berbasis Transformer",
      "Analisis Sentimen Ulasan Wisata Aceh pada Media Sosial Menggunakan Model BERT Berbahasa Indonesia",
      "Prediksi Hasil Panen Padi di Kabupaten Aceh Utara Menggunakan Metode Random Forest Berbasis Data Cuaca dan Lahan",
    ],
  },
  {
    name: "Dr. Taufiq ST., MT",
    nip: "197407162003121002",
    nidn: "0016077407",
    email: "taufiq.te@unimal.ac.id",
    expertise:
      "Machine Learning, Deep Learning, Natural Language Processing (NLP), Sistem Pendukung Keputusan, Internet of Things (IoT)",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "IoT Berbasis Energi Terbarukan",
      "NLP Suara Manusia",
      "Model Rantai Pasok Mengunakan Mesin Learning",
    ],
  },
  {
    name: "Dr.Eng. Muhammad Fikry, S.Kom., M.Kom",
    nip: "198710312015041003",
    nidn: "1031108702",
    email: "muh.fikry@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Deep Learning, Computer Vision, Data Mining, Data Science, Rekayasa Perangkat Lunak, Pengembangan Mobile, Human Computer Interaction (HCI), Internet of Things (IoT), Cloud Computing, Smart City",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [],
  },
  {
    name: "Eva Darnila",
    nip: "197904242005012003",
    nidn: "0024047904",
    email: "eva.darnila@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Natural Language Processing (NLP), Data Mining, Data Science, Sistem Pendukung Keputusan, Sistem Pakar, Rekayasa Perangkat Lunak, Human Computer Interaction (HCI), Data Warehouse, Internet of Things (IoT), Jaringan Komputer, Geographic Information System (GIS), Smart City, Multimedia Vision (AR/VR)",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Model Strategi Kesehatan, Prioritas Intervensi Data Spasial (GIS), Sensor IoT Dan Model ML Untuk Prediksi Pencegahan/Pengendalian Penyakit, Pelayanan Kesehatan, Kesehatan Masyarakat Dan Sumber Daya Kesehatan.",
      "Expert System, Hybrid berbasis Rules dan Mesin Learning [Resiko Bencana, Pemberdayaan Masyarakat, Ketahanan Pangan, Bidang Pertanian, Perikanan, Kebudayaan, Pariwisata, Kesehatan, Perkebunan dan Pendidikan].",
      "Sistem Prediksi Resiko Bencana, Ketahanan Pangan Terintegrasi, Bidang Pertanian, Perikanan, Cagar Budaya, Pariwisata, Perkebunan, Pendidikan Berbasis Mesin Learning, AR, Smart City",
    ],
  },
  {
    name: "Fadlisyah",
    nip: "197603302006041003",
    nidn: "0030037603",
    email: "tts4.0@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Deep Learning, Computer Vision, Speech Processing",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Pengenalan Hafalan Quran",
      "Klasifikasi suara",
      "Pengenalan Pola",
    ],
  },
  {
    name: "Maryana",
    nip: "197312312003122001",
    nidn: "0015087302",
    email: "maryana@unimal.ac.id",
    expertise: "Matematika",
    faculty: "Fakultas Teknik",
    thesisRecommendations: ["SPK", "Deep Learning", "Data Mining/Data Science"],
  },
  {
    name: "Munirul Ula",
    nip: "197808082008121001",
    nidn: "0008087806",
    email: "munirulula@unimal.ac.id",
    expertise:
      "Internet of Things (IoT), Jaringan Komputer, Cloud Computing, Cyber Security, Smart City",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [],
  },
  {
    name: "Nunsina",
    nip: "199302042023212035",
    nidn: "1304029301",
    email: "nunsina@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Rekayasa Perangkat Lunak, Internet of Things (IoT)",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Pengembangan Sistem Pelacakan Produk Pertanian Berbasis Blockchain untuk Transparansi Rantai Pasok",
      "Implementasi Smart Contract untuk Otomatisasi Transaksi UMKM Berbasis Blockchain",
    ],
  },
  {
    name: "Prof. Dr. Ir. Dahlan Abdullah, S.Kom., M.Kom",
    nip: "197602282002121005",
    nidn: "0028027601",
    email: "dahlan@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Rekayasa Perangkat Lunak, Pengembangan Web, Internet of Things (IoT), Jaringan Komputer, Smart City",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [],
  },
  {
    name: "Prof. Dr. Ir. Nurdin, S.Kom., M.Kom",
    nip: "197810202005011003",
    nidn: "0020107802",
    email: "nurdin@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Data Mining, Data Science, Internet of Things (IoT), Geographic Information System (GIS)",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Data Mining",
      "Internet of Things",
      "Artificial Intelligence",
    ],
  },
  {
    name: "Rini Meiyanti, S.T., M. Kom",
    nip: "199205222020122009",
    nidn: "1322059201",
    email: "rinimeiyanti@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Data Mining, Sistem Pendukung Keputusan, Rekayasa Perangkat Lunak, Internet of Things (IoT), Smart City, Multimedia Vision (AR/VR)",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [],
  },
  {
    name: "Rizal",
    nip: "197811052006041013",
    nidn: "0005117804",
    email: "rizal@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Deep Learning, Natural Language Processing (NLP), Data Mining, Data Science, Internet of Things (IoT), Jaringan Komputer, Network Science",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [],
  },
  {
    name: "Rizki Suwanda, S.T., M.Kom",
    nip: "199109172022031006",
    nidn: "0117099103",
    email: "rizkisuwanda@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Data Mining, Sistem Pendukung Keputusan, Rekayasa Perangkat Lunak, Pengembangan Web",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Integrasi Sistem Informasi Website & Data Mining",
      "Machine Learning & Prediksi Data Runtun Waktu (Time-Series)",
      "Pengembangan Teknologi Edukasi (EdTech) untuk Dunia Pendidikan",
    ],
  },
  {
    name: "Rozzi Kesuma Dinata",
    nip: "198408292012121001",
    nidn: "0029088405",
    email: "rozzi@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Data Mining, Data Science, Sistem Pendukung Keputusan, Sistem Pakar",
    faculty: "Fakultas Teknik",
    thesisRecommendations: ["Machine learning", "Data mining", "Data science"],
  },
  {
    name: "Safwandi, ST., M. Kom",
    nip: "197712132008121004",
    nidn: "0013127706",
    email: "safwandi@unimal.ac.id",
    expertise:
      "Sistem Pendukung Keputusan, Sistem Pakar, Rekayasa Perangkat Lunak, Human Computer Interaction (HCI), Sistem Informasi Sesuai dengan fungsional dan sertifikasi saya",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Sistem pakar",
      "Sistem Pendukung Keputusan",
      "Rekayasa Perangkat Lunak",
    ],
  },
  {
    name: "Said Fadlan Anshari, S.Kom., M.Kom",
    nip: "199402132022031011",
    nidn: "0413029402",
    email: "saidfadlan@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Deep Learning, Data Mining, Data Science, Data Warehouse, Network Science, Socio Computing, Human Computer Interaction",
    faculty: "Fakultas Teknik",
    thesisRecommendations: ["Forecasting", "Web Semantic", "Data Processing"],
  },
  {
    name: "Sujacka Retno",
    nip: "199606252022031012",
    nidn: "1325069601",
    email: "sujacka@unimal.ac.id",
    expertise:
      "Machine Learning, Game Development, Algorithm Optimization, dan Nature Inspired Algorithm",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Algorithm Optimization atau Nature Inspired Algorithm",
      "Clustering",
      "Game Dev",
    ],
  },
  {
    name: "T. Sukma Achriadi Sukiman",
    nip: "199206102024061001",
    nidn: "1310069201",
    email: "achriadi@unimal.ac.id",
    expertise: "Internet of Things (IoT), Jaringan Komputer, Cyber Security",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [],
  },
  {
    name: "Wahyu Fuadi, ST., M.IT",
    nip: "197808182005011001",
    nidn: "0018087802",
    email: "wahyu.fuadi@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Deep Learning, Natural Language Processing (NLP), Computer Vision, Data Mining, Data Science, Sistem Pendukung Keputusan, Sistem Pakar, Geographic Information System (GIS), Smart City",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Berfokus pada penerapan artificial intelligence diberbagai bidang",
      "Berfokus pada solusi praktis seperti klasifikasi, deteksi dibidang machine learning",
      "Berfokus pada solusi praktis seperti klasifikasi, deteksi, dan segmentasi dibidang computer vision",
    ],
  },
  {
    name: "Zahratul Fitri",
    nip: "199004202022032019",
    nidn: "1320049001",
    email: "zahratulfitri@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Deep Learning, Computer Vision, Data Mining, Data Science, Sistem Pendukung Keputusan, Sistem Pakar, Rekayasa Perangkat Lunak, Pengembangan Web, Pengembangan Mobile, Internet of Things (IoT), Smart City, Multimedia Vision (AR/VR)",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [
      "Generative AI dan LLM untuk pelayanan publik",
      "AI, Edge Computing dan IoT",
      "Quantum Cryptography",
    ],
  },
  {
    name: "Zara Yunizar, S.Kom., M.Kom",
    nip: "198310182019032009",
    nidn: "0118108302",
    email: "zarayunizar@unimal.ac.id",
    expertise:
      "Artificial Intelligence (AI), Machine Learning, Natural Language Processing (NLP), Data Mining, Data Science, Pengembangan Web, Pengembangan Mobile, Internet of Things (IoT), Cyber Security, Geographic Information System (GIS), Multimedia Vision (AR/VR)",
    faculty: "Fakultas Teknik",
    thesisRecommendations: [],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Seed development tidak boleh dijalankan di environment production kecuali ALLOW_PRODUCTION_SEED=true disetel!"
    );
  }

  console.log("Memulai seeding database TemuDosen (23 dosen sesuai data PDF)...");

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

  const [adminHash, lecturerHash, studentHash] = await Promise.all([
    bcrypt.hash("DemoAdmin123!", 10),
    bcrypt.hash("password123", 10),
    bcrypt.hash("DemoMhs123!", 10),
  ]);

  // 1. Administrator
  const admin = await prisma.user.upsert({
    where: { email: "admin@temudosen.ac.id" },
    update: {},
    create: {
      name: "Drs. Wahyu Setiawan",
      email: "admin@temudosen.ac.id",
      passwordHash: adminHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  // 2. Layanan konsultasi
  const serviceDefs = [
    {
      name: "Bimbingan Skripsi / Tugas Akhir",
      description:
        "Konsultasi progres bab, metodologi, implementasi, dan persiapan sidang tugas akhir.",
      durationMinutes: 45,
    },
    {
      name: "Konsultasi Akademik & KRS",
      description:
        "Perencanaan studi semester, pengambilan mata kuliah, dan evaluasi IPK bersama dosen wali.",
      durationMinutes: 30,
    },
    {
      name: "Review Proposal Penelitian",
      description:
        "Penelaahan topik, rumusan masalah, dan tinjauan pustaka untuk proposal penelitian/hibah.",
      durationMinutes: 60,
    },
    {
      name: "Diskusi Magang & Karier",
      description:
        "Bimbingan persiapan kerja praktik/magang industri dan pengembangan portofolio akademik.",
      durationMinutes: 30,
    },
  ];

  const services = [];
  for (const s of serviceDefs) {
    const svc = await prisma.service.upsert({
      where: { name: s.name },
      update: {},
      create: { ...s, isActive: true },
    });
    services.push(svc);
  }

  // 3. Bersihkan akun dosen dummy lama bila ada sebelum mengganti dengan 23 dosen PDF
  const legacyEmails = [
    "budi.santoso@temudosen.ac.id",
    "siti.rahma@temudosen.ac.id",
    "hendra.wijaya@temudosen.ac.id",
  ];
  const legacyUsers = await prisma.user.findMany({
    where: { email: { in: legacyEmails } },
    include: { lecturerProfile: true },
  });
  if (legacyUsers.length > 0) {
    const legacyLecturerIds = legacyUsers
      .map((u) => u.lecturerProfile?.id)
      .filter((id): id is string => Boolean(id));
    if (legacyLecturerIds.length > 0) {
      await prisma.booking.deleteMany({
        where: { lecturerId: { in: legacyLecturerIds } },
      });
    }
    await prisma.user.deleteMany({
      where: { id: { in: legacyUsers.map((u) => u.id) } },
    });
  }

  // 4. Upsert 23 Dosen sesuai PDF
  const lecturers = [];
  for (const spec of PDF_LECTURERS) {
    const existing = await prisma.user.findUnique({
      where: { email: spec.email },
      include: { lecturerProfile: true },
    });

    const bioText =
      spec.thesisRecommendations.length > 0
        ? `Dosen Fakultas Teknik (Unimal). Bidang keahlian: ${spec.expertise}. Menawarkan ${spec.thesisRecommendations.length} rekomendasi topik skripsi.`
        : `Dosen Fakultas Teknik (Unimal). Bidang keahlian: ${spec.expertise}.`;

    let userRecord;
    if (existing && existing.lecturerProfile) {
      // Update accounts still using the legacy default password (or when reset is requested)
      // while preserving passwords that individual lecturers have already customized.
      const shouldSetDefaultPassword =
        process.env.SEED_RESET_PASSWORDS === "true" ||
        (await bcrypt.compare("DemoDosen123!", existing.passwordHash));

      userRecord = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: spec.name,
          status: "ACTIVE",
          ...(shouldSetDefaultPassword ? { passwordHash: lecturerHash } : {}),
          lecturerProfile: {
            update: {
              lecturerNumber: spec.nidn,
              nip: spec.nip,
              expertise: spec.expertise,
              faculty: spec.faculty,
              bio: bioText,
              thesisRecommendations: spec.thesisRecommendations,
            },
          },
        },
        include: { lecturerProfile: true },
      });
    } else {
      userRecord = await prisma.user.create({
        data: {
          name: spec.name,
          email: spec.email,
          passwordHash: lecturerHash,
          role: "LECTURER",
          status: "ACTIVE",
          lecturerProfile: {
            create: {
              lecturerNumber: spec.nidn,
              nip: spec.nip,
              expertise: spec.expertise,
              faculty: spec.faculty,
              bio: bioText,
              thesisRecommendations: spec.thesisRecommendations,
              lecturerServices: {
                create: services.map((svc) => ({ serviceId: svc.id })),
              },
            },
          },
        },
        include: { lecturerProfile: true },
      });
    }

    const profile = userRecord.lecturerProfile!;

    // Pastikan setiap dosen memiliki layanan aktif & ketersediaan jadwal
    const existingSvcCount = await prisma.lecturerService.count({
      where: { lecturerId: profile.id },
    });
    if (existingSvcCount === 0) {
      await prisma.lecturerService.createMany({
        data: services.map((svc) => ({
          lecturerId: profile.id,
          serviceId: svc.id,
        })),
      });
    }

    const existingAvailCount = await prisma.availability.count({
      where: { lecturerId: profile.id },
    });
    if (existingAvailCount === 0) {
      await prisma.availability.createMany({
        data: [
          {
            lecturerId: profile.id,
            startAt: wibDate(-3, 9, 0),
            endAt: wibDate(-3, 12, 0),
            status: "OPEN",
          },
          {
            lecturerId: profile.id,
            startAt: wibDate(1, 9, 0),
            endAt: wibDate(1, 12, 0),
            status: "OPEN",
          },
          {
            lecturerId: profile.id,
            startAt: wibDate(1, 13, 30),
            endAt: wibDate(1, 16, 0),
            status: "OPEN",
          },
          {
            lecturerId: profile.id,
            startAt: wibDate(2, 9, 0),
            endAt: wibDate(2, 12, 0),
            status: "OPEN",
          },
          {
            lecturerId: profile.id,
            startAt: wibDate(3, 10, 0),
            endAt: wibDate(3, 15, 0),
            status: "OPEN",
          },
          {
            lecturerId: profile.id,
            startAt: wibDate(5, 9, 0),
            endAt: wibDate(5, 12, 0),
            status: "OPEN",
          },
        ],
      });
    }

    lecturers.push({ user: userRecord, profile });
  }

  // 5. Mahasiswa (5 akun demo)
  const studentSpecs = [
    {
      name: "Andi Pratama",
      email: "andi.pratama@mhs.temudosen.ac.id",
      studentNumber: "2310511001",
      programStudy: "Teknik Informatika",
      faculty: "Fakultas Teknik",
    },
    {
      name: "Bela Safitri",
      email: "bela.safitri@mhs.temudosen.ac.id",
      studentNumber: "2310511002",
      programStudy: "Teknik Informatika",
      faculty: "Fakultas Teknik",
    },
    {
      name: "Cahyo Nugroho",
      email: "cahyo.nugroho@mhs.temudosen.ac.id",
      studentNumber: "2310512003",
      programStudy: "Sistem Informasi",
      faculty: "Fakultas Teknik",
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
      programStudy: "Teknik Informatika",
      faculty: "Fakultas Teknik",
    },
  ];

  const students = [];
  for (const spec of studentSpecs) {
    const existingStu = await prisma.user.findUnique({
      where: { email: spec.email },
      include: { studentProfile: true },
    });
    const stuUser =
      existingStu ??
      (await prisma.user.create({
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
      }));
    students.push({ user: stuUser, profile: stuUser.studentProfile! });
  }

  // 6. Sample bookings (hanya dibuat bila belum ada)
  const existingSample = await prisma.booking.findUnique({
    where: { bookingCode: "TD-20261109-A101" },
  });

  if (!existingSample) {
    const pendingExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const bCompleted = await prisma.booking.create({
      data: {
        bookingCode: "TD-20261109-A101",
        studentId: students[0].profile.id,
        lecturerId: lecturers[0].profile.id, // Ar Razi, S.T., M.Cs
        serviceId: services[0].id,
        serviceDurationSnapshot: 45,
        startAt: wibDate(-3, 9, 0),
        endAt: wibDate(-3, 9, 45),
        topic: "Review Topik Skripsi Data Mining & NLP",
        additionalNotes: "Sudah melampirkan draf proposal awal.",
        status: "COMPLETED",
        consultation: {
          create: {
            privateNotes:
              "Catatan internal dosen: mahasiswa perlu memperdalam studi literatur NLP 2 tahun terakhir sebelum seminar proposal.",
            studentVisibleNotes:
              "Fokus topik sudah baik. Perkuat latar belakang dengan dataset eksperimen yang terukur.",
            recommendations:
              "Lengkapi studi pustaka dan siapkan baseline model untuk pertemuan berikutnya.",
            followUpDate: wibDate(5, 9, 0),
          },
        },
        statusHistories: {
          create: [
            {
              fromStatus: null,
              toStatus: "PENDING",
              changedBy: students[0].user.id,
              reason: "Pengajuan awal",
            },
            {
              fromStatus: "PENDING",
              toStatus: "CONFIRMED",
              changedBy: lecturers[0].user.id,
              reason: "Disetujui oleh dosen",
            },
            {
              fromStatus: "CONFIRMED",
              toStatus: "COMPLETED",
              changedBy: lecturers[0].user.id,
              reason: "Konsultasi selesai dilaksanakan",
            },
          ],
        },
      },
    });

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
        additionalNotes: "Ingin menanyakan prasyarat mata kuliah Machine Learning.",
        status: "CONFIRMED",
        statusHistories: {
          create: [
            {
              fromStatus: null,
              toStatus: "PENDING",
              changedBy: students[0].user.id,
              reason: "Pengajuan awal",
            },
            {
              fromStatus: "PENDING",
              toStatus: "CONFIRMED",
              changedBy: lecturers[0].user.id,
              reason: "Jadwal dikonfirmasi dosen",
            },
          ],
        },
      },
    });

    const bPending = await prisma.booking.create({
      data: {
        bookingCode: "TD-20261112-C303",
        studentId: students[1].profile.id,
        lecturerId: lecturers[0].profile.id,
        serviceId: services[0].id,
        serviceDurationSnapshot: 45,
        startAt: wibDate(1, 10, 0),
        endAt: wibDate(1, 10, 45),
        topic: "Konsultasi Pengembangan Web & Arsitektur API",
        additionalNotes: "Membawa rancangan ERD untuk diperiksa.",
        status: "PENDING",
        pendingExpiresAt: pendingExpires,
        statusHistories: {
          create: [
            {
              fromStatus: null,
              toStatus: "PENDING",
              changedBy: students[1].user.id,
              reason: "Pengajuan awal",
            },
          ],
        },
      },
    });

    await prisma.booking.create({
      data: {
        bookingCode: "TD-20261112-D404",
        studentId: students[2].profile.id,
        lecturerId: lecturers[1].profile.id, // Dr. Asrianda
        serviceId: services[2].id,
        serviceDurationSnapshot: 60,
        startAt: wibDate(2, 9, 0),
        endAt: wibDate(2, 10, 0),
        topic: "Pemetaan Daerah Rawan Banjir Menggunakan Data Mining dan GIS",
        status: "PENDING",
        pendingExpiresAt: pendingExpires,
        statusHistories: {
          create: [
            {
              fromStatus: null,
              toStatus: "PENDING",
              changedBy: students[2].user.id,
              reason: "Pengajuan awal",
            },
          ],
        },
      },
    });

    await prisma.booking.create({
      data: {
        bookingCode: "TD-20261111-E505",
        studentId: students[3].profile.id,
        lecturerId: lecturers[2].profile.id, // Dr. Eng. Defry Hamdhana
        serviceId: services[2].id,
        serviceDurationSnapshot: 60,
        startAt: wibDate(1, 9, 0),
        endAt: wibDate(1, 10, 0),
        topic: "Analisis Sentimen Ulasan Wisata Aceh dengan Model BERT",
        status: "REJECTED",
        rejectionReason:
          "Mohon lengkapi draf abstrak terlebih dahulu sebelum menjadwalkan sesi review.",
        statusHistories: {
          create: [
            {
              fromStatus: null,
              toStatus: "PENDING",
              changedBy: students[3].user.id,
              reason: "Pengajuan awal",
            },
            {
              fromStatus: "PENDING",
              toStatus: "REJECTED",
              changedBy: lecturers[2].user.id,
              reason: "Mohon lengkapi draf abstrak terlebih dahulu",
            },
          ],
        },
      },
    });

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
            {
              fromStatus: null,
              toStatus: "PENDING",
              changedBy: students[4].user.id,
              reason: "Pengajuan awal",
            },
            {
              fromStatus: "PENDING",
              toStatus: "CANCELLED",
              changedBy: students[4].user.id,
              reason: "Bentrok ujian praktikum",
            },
          ],
        },
      },
    });

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
            {
              fromStatus: null,
              toStatus: "PENDING",
              changedBy: students[2].user.id,
              reason: "Pengajuan awal",
            },
            {
              fromStatus: "PENDING",
              toStatus: "CONFIRMED",
              changedBy: lecturers[1].user.id,
              reason: "Disetujui",
            },
            {
              fromStatus: "CONFIRMED",
              toStatus: "NO_SHOW",
              changedBy: lecturers[1].user.id,
              reason: "Mahasiswa tidak hadir",
            },
          ],
        },
      },
    });

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
  }

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: "SYSTEM_SEED_LECTURERS_PDF",
      entityType: "LecturerProfile",
      entityId: "batch-23",
      metadata: {
        lecturersCount: lecturers.length,
        studentsCount: students.length,
        servicesCount: services.length,
      },
    },
  });

  console.log(`Seeding selesai! Total ${lecturers.length} dosen dari PDF telah tersimpan.`);
}

main()
  .catch((e) => {
    console.error("Gagal menjalankan seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
