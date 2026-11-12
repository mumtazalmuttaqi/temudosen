import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { createLecturerAvailability } from "@/server/services/availability-service";
import {
  approveBooking,
  createBooking,
  finalizeBookingStatus,
  getBookingDetailForActor,
  rejectBooking,
} from "@/server/services/booking-service";
import { upsertConsultationNotes } from "@/server/services/consultation-service";
import { ConflictError, DomainError, ForbiddenError } from "@/server/services/errors";
import { changeMyPassword } from "@/server/services/profile-service";

describe("Integration Tests — PostgreSQL Booking Flow, Concurrency & Security", () => {
  let student1!: AuthenticatedUser;
  let student2!: AuthenticatedUser;
  let lecturer1!: AuthenticatedUser;
  let lecturer2!: AuthenticatedUser;
  let adminUser!: AuthenticatedUser;
  let serviceId!: string;

  const createdUserIds: string[] = [];
  let createdServiceId: string | null = null;

  const futureBase = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  futureBase.setUTCHours(2, 0, 0, 0); // 09:00 WIB

  function addMinutes(base: Date, mins: number): Date {
    return new Date(base.getTime() + mins * 60_000);
  }

  beforeAll(async () => {
    const hash = await bcrypt.hash("IntegrationTest123!", 8);
    const suffix = Date.now();

    const svc = await prisma.service.create({
      data: {
        name: `Layanan Test Integrasi ${suffix}`,
        durationMinutes: 30,
        isActive: true,
      },
    });
    serviceId = svc.id;
    createdServiceId = svc.id;

    const uStu1 = await prisma.user.create({
      data: {
        name: "Mhs Test 1",
        email: `mhs1.${suffix}@test.ac.id`,
        passwordHash: hash,
        role: "STUDENT",
        status: "ACTIVE",
        studentProfile: {
          create: {
            studentNumber: `TST-M1-${suffix}`,
            programStudy: "Informatika",
            faculty: "FIK",
          },
        },
      },
      include: { studentProfile: true, lecturerProfile: true },
    });
    createdUserIds.push(uStu1.id);
    student1 = uStu1;

    const uStu2 = await prisma.user.create({
      data: {
        name: "Mhs Test 2",
        email: `mhs2.${suffix}@test.ac.id`,
        passwordHash: hash,
        role: "STUDENT",
        status: "ACTIVE",
        studentProfile: {
          create: {
            studentNumber: `TST-M2-${suffix}`,
            programStudy: "Informatika",
            faculty: "FIK",
          },
        },
      },
      include: { studentProfile: true, lecturerProfile: true },
    });
    createdUserIds.push(uStu2.id);
    student2 = uStu2;

    const uLec1 = await prisma.user.create({
      data: {
        name: "Dosen Test 1",
        email: `lec1.${suffix}@test.ac.id`,
        passwordHash: hash,
        role: "LECTURER",
        status: "ACTIVE",
        lecturerProfile: {
          create: {
            lecturerNumber: `TST-L1-${suffix}`,
            expertise: "RPL",
            faculty: "FIK",
            lecturerServices: { create: [{ serviceId: svc.id }] },
          },
        },
      },
      include: { studentProfile: true, lecturerProfile: true },
    });
    createdUserIds.push(uLec1.id);
    lecturer1 = uLec1;

    const uLec2 = await prisma.user.create({
      data: {
        name: "Dosen Test 2",
        email: `lec2.${suffix}@test.ac.id`,
        passwordHash: hash,
        role: "LECTURER",
        status: "ACTIVE",
        lecturerProfile: {
          create: {
            lecturerNumber: `TST-L2-${suffix}`,
            expertise: "AI",
            faculty: "FT",
            lecturerServices: { create: [{ serviceId: svc.id }] },
          },
        },
      },
      include: { studentProfile: true, lecturerProfile: true },
    });
    createdUserIds.push(uLec2.id);
    lecturer2 = uLec2;

    const uAdm = await prisma.user.create({
      data: {
        name: "Admin Test",
        email: `adm.${suffix}@test.ac.id`,
        passwordHash: hash,
        role: "ADMIN",
        status: "ACTIVE",
      },
      include: { studentProfile: true, lecturerProfile: true },
    });
    createdUserIds.push(uAdm.id);
    adminUser = uAdm;

    // Buat availability 09:00 - 12:00 WIB (+7 hari) untuk lecturer1
    await createLecturerAvailability({
      actor: lecturer1,
      startAt: futureBase,
      endAt: addMinutes(futureBase, 180),
      status: "OPEN",
    });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: {
        lecturerId: {
          in: [lecturer1.lecturerProfile!.id, lecturer2.lecturerProfile!.id],
        },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
    if (createdServiceId) {
      await prisma.service.deleteMany({ where: { id: createdServiceId } });
    }
    await prisma.$disconnect();
  });

  it("menolak booking di luar rentang ketersediaan dosen", async () => {
    const outsideStart = addMinutes(futureBase, 240); // 13:00 WIB (di luar 09:00-12:00)
    await expect(
      createBooking({
        actor: student1,
        lecturerId: lecturer1.lecturerProfile!.id,
        serviceId,
        startAt: outsideStart,
        topic: "Tes di luar ketersediaan",
      })
    ).rejects.toThrow(DomainError);
  });

  it("membuat booking valid, menolak bentrok, mencegah IDOR, dan menyembunyikan private_notes dari mahasiswa & admin", async () => {
    const slotStart = futureBase; // 09:00 - 09:30
    const booking = await createBooking({
      actor: student1,
      lecturerId: lecturer1.lecturerProfile!.id,
      serviceId,
      startAt: slotStart,
      topic: "Konsultasi Integrasi Database",
    });

    expect(booking.status).toBe("PENDING");
    expect(booking.serviceDurationSnapshot).toBe(30);

    // Booking bentrok pada slot sama oleh mahasiswa 2 ditolak dengan 409 Conflict
    await expect(
      createBooking({
        actor: student2,
        lecturerId: lecturer1.lecturerProfile!.id,
        serviceId,
        startAt: slotStart,
        topic: "Percobaan slot bentrok",
      })
    ).rejects.toThrow(ConflictError);

    // Dosen lain tidak dapat menyetujui booking milik lecturer1
    await expect(
      approveBooking({
        actor: lecturer2,
        bookingId: booking.id,
      })
    ).rejects.toThrow(ForbiddenError);

    // Mahasiswa lain tidak dapat membaca booking student1
    await expect(getBookingDetailForActor(student2, booking.id)).rejects.toThrow(ForbiddenError);

    // Dosen pemilik menyetujui dan mengisi catatan privat + visible
    await approveBooking({ actor: lecturer1, bookingId: booking.id });
    await finalizeBookingStatus({
      actor: lecturer1,
      bookingId: booking.id,
      targetStatus: "COMPLETED",
    });

    await upsertConsultationNotes({
      actor: lecturer1,
      bookingId: booking.id,
      input: {
        privateNotes: "RAHASIA INTERNAL DOSEN",
        studentVisibleNotes: "Lanjutkan implementasi bab 4",
        recommendations: "Tambahkan unit test",
        followUpDate: null,
      },
    });

    // Mahasiswa tidak boleh melihat privateNotes
    const stuView = await getBookingDetailForActor(student1, booking.id);
    expect(stuView.consultation?.privateNotes).toBeNull();
    expect(stuView.consultation?.studentVisibleNotes).toBe("Lanjutkan implementasi bab 4");

    // Admin default tidak boleh melihat privateNotes
    const admView = await getBookingDetailForActor(adminUser, booking.id);
    expect(admView.consultation?.privateNotes).toBeNull();

    // Dosen pemilik dapat melihat privateNotes
    const lecView = await getBookingDetailForActor(lecturer1, booking.id);
    expect(lecView.consultation?.privateNotes).toBe("RAHASIA INTERNAL DOSEN");

    // Karena booking sudah COMPLETED (terminal), slot 09:00-09:30 tidak lagi diblokir!
    const reuseBooking = await createBooking({
      actor: student2,
      lecturerId: lecturer1.lecturerProfile!.id,
      serviceId,
      startAt: slotStart,
      topic: "Booking ulang setelah status terminal",
    });
    expect(reuseBooking.status).toBe("PENDING");

    // Penolakan dosen melepaskan slot sehingga bisa dipesan kembali
    await rejectBooking({
      actor: lecturer1,
      bookingId: reuseBooking.id,
      reason: "Mohon sesuaikan jadwal ulang",
    });
    const afterReject = await createBooking({
      actor: student1,
      lecturerId: lecturer1.lecturerProfile!.id,
      serviceId,
      startAt: slotStart,
      topic: "Booking setelah penolakan melepaskan slot",
    });
    expect(afterReject.status).toBe("PENDING");
  });

  it("hanya mengizinkan SATU booking sukses saat dua transaksi paralel dikirim pada slot yang sama", async () => {
    const raceSlot = addMinutes(futureBase, 60); // 10:00 - 10:30 WIB

    const results = await Promise.allSettled([
      createBooking({
        actor: student1,
        lecturerId: lecturer1.lecturerProfile!.id,
        serviceId,
        startAt: raceSlot,
        topic: "Transaksi Paralel Mahasiswa 1",
      }),
      createBooking({
        actor: student2,
        lecturerId: lecturer1.lecturerProfile!.id,
        serviceId,
        startAt: raceSlot,
        topic: "Transaksi Paralel Mahasiswa 2",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejected[0]?.status === "rejected") {
      expect(rejected[0].reason).toBeInstanceOf(ConflictError);
    }
  });

  it("menegakkan integritas role-profile di level database (trigger PostgreSQL)", async () => {
    await expect(
      prisma.$executeRaw`
        INSERT INTO "student_profiles" ("id", "user_id", "student_number", "program_study", "faculty", "updated_at")
        VALUES (gen_random_uuid(), ${lecturer1.id}::uuid, 'INVALID-ROLE-NIM', 'IF', 'FIK', NOW())
      `
    ).rejects.toThrow();
  });

  it("mengizinkan dosen dengan password default password123 mengubah kata sandinya sendiri", async () => {
    const suffix = Date.now();
    const defaultHash = await bcrypt.hash("password123", 10);
    const tempLecturer = await prisma.user.create({
      data: {
        name: "Dosen Ubah Password",
        email: `lec.pwd.${suffix}@test.ac.id`,
        passwordHash: defaultHash,
        role: "LECTURER",
        status: "ACTIVE",
        lecturerProfile: {
          create: {
            lecturerNumber: `TST-LP-${suffix}`,
            expertise: "Sistem Informasi",
            faculty: "FT",
          },
        },
      },
      include: { studentProfile: true, lecturerProfile: true },
    });
    createdUserIds.push(tempLecturer.id);

    await expect(
      changeMyPassword({
        actor: tempLecturer,
        currentPassword: "salah-password",
        newPassword: "DosenCustom99!",
      })
    ).rejects.toThrow(DomainError);

    const res = await changeMyPassword({
      actor: tempLecturer,
      currentPassword: "password123",
      newPassword: "DosenCustom99!",
    });
    expect(res).toEqual({ changed: true });

    const refreshed = await prisma.user.findUniqueOrThrow({
      where: { id: tempLecturer.id },
      select: { passwordHash: true },
    });
    expect(await verifyPassword("password123", refreshed.passwordHash)).toBe(false);
    expect(await verifyPassword("DosenCustom99!", refreshed.passwordHash)).toBe(true);
  });
});

