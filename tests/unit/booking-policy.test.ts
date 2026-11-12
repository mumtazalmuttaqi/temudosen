import { describe, expect, it } from "vitest";
import {
  canTransitionBookingStatus,
  DEFAULT_CAMPUS_POLICY,
  evaluateScheduleChangeRequest,
  evaluateStudentCancellation,
  generateBookableSlots,
  intervalsOverlap,
  isBookingBlockingSlot,
  isTerminalStatus,
  isValidTimeRange,
  isWithinInterval,
} from "@/server/policies/booking-policy";
import {
  canAccessBooking,
  canDecideScheduleChange,
  canLecturerOwnBooking,
  canStudentOwnBooking,
  sanitizeConsultationForActor,
} from "@/server/policies/access-policy";

describe("Booking Policy — Validasi Rentang Waktu & Deteksi Bentrok", () => {
  it("memvalidasi rentang waktu start < end", () => {
    const t1 = new Date("2026-11-20T09:00:00Z");
    const t2 = new Date("2026-11-20T10:00:00Z");
    expect(isValidTimeRange(t1, t2)).toBe(true);
    expect(isValidTimeRange(t2, t1)).toBe(false);
    expect(isValidTimeRange(t1, t1)).toBe(false);
  });

  it("mendeteksi interval bentrok sesuai aturan A.start < B.end AND A.end > B.start", () => {
    const aStart = new Date("2026-11-20T09:00:00Z");
    const aEnd = new Date("2026-11-20T10:00:00Z");

    // Beririsan sebagian
    expect(
      intervalsOverlap(
        aStart,
        aEnd,
        new Date("2026-11-20T09:30:00Z"),
        new Date("2026-11-20T10:30:00Z")
      )
    ).toBe(true);

    // Sama persis
    expect(intervalsOverlap(aStart, aEnd, aStart, aEnd)).toBe(true);

    // Berdampingan persis (touching boundary) TIDAK bentrok
    expect(
      intervalsOverlap(
        aStart,
        aEnd,
        new Date("2026-11-20T10:00:00Z"),
        new Date("2026-11-20T10:30:00Z")
      )
    ).toBe(false);

    expect(
      intervalsOverlap(
        aStart,
        aEnd,
        new Date("2026-11-20T08:30:00Z"),
        new Date("2026-11-20T09:00:00Z")
      )
    ).toBe(false);
  });

  it("memeriksa ketercakupan interval dalam availability", () => {
    const availStart = new Date("2026-11-20T09:00:00Z");
    const availEnd = new Date("2026-11-20T12:00:00Z");

    expect(
      isWithinInterval(
        new Date("2026-11-20T09:00:00Z"),
        new Date("2026-11-20T09:45:00Z"),
        availStart,
        availEnd
      )
    ).toBe(true);

    expect(
      isWithinInterval(
        new Date("2026-11-20T11:30:00Z"),
        new Date("2026-11-20T12:15:00Z"),
        availStart,
        availEnd
      )
    ).toBe(false);
  });
});

describe("Booking Policy — Transisi Status, Slot Blocking & Kebijakan", () => {
  it("mengizinkan transisi status yang sah dan memblokir transisi dari status terminal", () => {
    expect(canTransitionBookingStatus("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionBookingStatus("PENDING", "REJECTED")).toBe(true);
    expect(canTransitionBookingStatus("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionBookingStatus("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransitionBookingStatus("CONFIRMED", "NO_SHOW")).toBe(true);

    expect(canTransitionBookingStatus("PENDING", "COMPLETED")).toBe(false);
    expect(canTransitionBookingStatus("REJECTED", "CONFIRMED")).toBe(false);
    expect(canTransitionBookingStatus("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransitionBookingStatus("COMPLETED", "NO_SHOW")).toBe(false);

    expect(isTerminalStatus("REJECTED")).toBe(true);
    expect(isTerminalStatus("CANCELLED")).toBe(true);
    expect(isTerminalStatus("COMPLETED")).toBe(true);
    expect(isTerminalStatus("NO_SHOW")).toBe(true);
    expect(isTerminalStatus("PENDING")).toBe(false);
    expect(isTerminalStatus("CONFIRMED")).toBe(false);
  });

  it("mengabaikan booking terminal dan pending kedaluwarsa dalam pemblokiran slot", () => {
    const now = new Date("2026-11-20T08:00:00Z");
    expect(
      isBookingBlockingSlot(
        { status: "PENDING", pendingExpiresAt: new Date("2026-11-21T08:00:00Z") },
        now
      )
    ).toBe(true);

    expect(
      isBookingBlockingSlot(
        { status: "PENDING", pendingExpiresAt: new Date("2026-11-20T07:59:00Z") },
        now
      )
    ).toBe(false);

    expect(isBookingBlockingSlot({ status: "CONFIRMED" }, now)).toBe(true);
    expect(isBookingBlockingSlot({ status: "REJECTED" }, now)).toBe(false);
    expect(isBookingBlockingSlot({ status: "CANCELLED" }, now)).toBe(false);
    expect(isBookingBlockingSlot({ status: "COMPLETED" }, now)).toBe(false);
    expect(isBookingBlockingSlot({ status: "NO_SHOW" }, now)).toBe(false);
  });

  it("menghasilkan slot tersedia yang mengecualikan booking aktif namun tetap membuka slot terminal", () => {
    const now = new Date("2026-11-20T01:00:00Z");
    const slots = generateBookableSlots({
      availabilities: [
        {
          id: "av-1",
          startAt: new Date("2026-11-20T02:00:00Z"),
          endAt: new Date("2026-11-20T04:00:00Z"),
          status: "OPEN",
        },
      ],
      blockingBookings: [
        {
          startAt: new Date("2026-11-20T02:00:00Z"),
          endAt: new Date("2026-11-20T02:30:00Z"),
          status: "CONFIRMED",
        },
        {
          startAt: new Date("2026-11-20T03:00:00Z"),
          endAt: new Date("2026-11-20T03:30:00Z"),
          status: "REJECTED",
        },
      ],
      durationMinutes: 30,
      now,
    });

    const starts = slots.map((s) => s.startAt);
    expect(starts).not.toContain("2026-11-20T02:00:00.000Z");
    expect(starts).toContain("2026-11-20T02:30:00.000Z");
    expect(starts).toContain("2026-11-20T03:00:00.000Z");
    expect(starts).toContain("2026-11-20T03:30:00.000Z");
  });

  it("menegakkan batas cutoff pembatalan dan aturan pengajuan perubahan jadwal", () => {
    const now = new Date("2026-11-20T00:00:00Z");
    const policy = { ...DEFAULT_CAMPUS_POLICY, cancellationCutoffHours: 12 };

    // 24 jam ke depan -> boleh batal
    expect(
      evaluateStudentCancellation(
        { status: "CONFIRMED", startAt: new Date("2026-11-21T00:00:00Z") },
        policy,
        now
      ).allowed
    ).toBe(true);

    // 4 jam ke depan -> ditolak karena < 12 jam
    expect(
      evaluateStudentCancellation(
        { status: "CONFIRMED", startAt: new Date("2026-11-20T04:00:00Z") },
        policy,
        now
      ).allowed
    ).toBe(false);

    // Perubahan jadwal hanya boleh saat PENDING/CONFIRMED di masa depan
    expect(
      evaluateScheduleChangeRequest(
        { status: "CONFIRMED", startAt: new Date("2026-11-21T00:00:00Z") },
        now
      ).allowed
    ).toBe(true);
    expect(
      evaluateScheduleChangeRequest(
        { status: "COMPLETED", startAt: new Date("2026-11-21T00:00:00Z") },
        now
      ).allowed
    ).toBe(false);
  });
});

describe("Access Policy — RBAC, Ownership & Privasi Catatan Konsultasi", () => {
  const target = { studentId: "stu-1", lecturerId: "lec-1" };
  const studentOwner = {
    id: "u-stu-1",
    role: "STUDENT" as const,
    studentProfile: { id: "stu-1" },
  };
  const studentOther = {
    id: "u-stu-2",
    role: "STUDENT" as const,
    studentProfile: { id: "stu-2" },
  };
  const lecturerOwner = {
    id: "u-lec-1",
    role: "LECTURER" as const,
    lecturerProfile: { id: "lec-1" },
  };
  const lecturerOther = {
    id: "u-lec-2",
    role: "LECTURER" as const,
    lecturerProfile: { id: "lec-2" },
  };
  const adminUser = { id: "u-adm-1", role: "ADMIN" as const };

  it("memastikan kepemilikan booking mahasiswa dan dosen", () => {
    expect(canAccessBooking(studentOwner, target)).toBe(true);
    expect(canAccessBooking(studentOther, target)).toBe(false);
    expect(canAccessBooking(lecturerOwner, target)).toBe(true);
    expect(canAccessBooking(lecturerOther, target)).toBe(false);
    expect(canAccessBooking(adminUser, target)).toBe(true);

    expect(canStudentOwnBooking(studentOwner, target)).toBe(true);
    expect(canStudentOwnBooking(studentOther, target)).toBe(false);
    expect(canLecturerOwnBooking(lecturerOwner, target)).toBe(true);
    expect(canLecturerOwnBooking(lecturerOther, target)).toBe(false);
  });

  it("menegakkan penyetuju perubahan jadwal sesuai konfigurasi kebijakan kampus", () => {
    expect(
      canDecideScheduleChange(lecturerOwner, target, {
        ...DEFAULT_CAMPUS_POLICY,
        scheduleChangeApprover: "LECTURER",
      })
    ).toBe(true);
    expect(
      canDecideScheduleChange(adminUser, target, {
        ...DEFAULT_CAMPUS_POLICY,
        scheduleChangeApprover: "LECTURER",
      })
    ).toBe(false);
    expect(
      canDecideScheduleChange(adminUser, target, {
        ...DEFAULT_CAMPUS_POLICY,
        scheduleChangeApprover: "ADMIN",
      })
    ).toBe(true);
  });

  it("menyembunyikan private_notes dari mahasiswa dan admin secara default", () => {
    const rawConsultation = {
      id: "cons-1",
      bookingId: "bk-1",
      privateNotes: "Rahasia evaluasi dosen",
      studentVisibleNotes: "Revisi Bab 2",
      recommendations: "Tambah 5 referensi",
      followUpDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const forStudent = sanitizeConsultationForActor({
      actor: studentOwner,
      booking: target,
      consultation: rawConsultation,
      policy: DEFAULT_CAMPUS_POLICY,
    });
    expect(forStudent?.privateNotes).toBeNull();
    expect(forStudent?.studentVisibleNotes).toBe("Revisi Bab 2");

    const forAdminDefault = sanitizeConsultationForActor({
      actor: adminUser,
      booking: target,
      consultation: rawConsultation,
      policy: DEFAULT_CAMPUS_POLICY,
    });
    expect(forAdminDefault?.privateNotes).toBeNull();

    const forLecturer = sanitizeConsultationForActor({
      actor: lecturerOwner,
      booking: target,
      consultation: rawConsultation,
      policy: DEFAULT_CAMPUS_POLICY,
    });
    expect(forLecturer?.privateNotes).toBe("Rahasia evaluasi dosen");
  });
});

