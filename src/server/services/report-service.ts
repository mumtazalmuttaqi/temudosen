import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  BOOKING_STATUS_META,
  escapeCsvCell,
  formatDateTime,
  getLocalDateKey,
} from "@/lib/utils";
import { getCampusPolicy } from "@/server/policies/settings-service";

export interface ReportFilter {
  from?: Date;
  to?: Date;
  status?: BookingStatus;
  lecturerId?: string;
  serviceId?: string;
}

export async function getAdminReportData(filter: ReportFilter) {
  const policy = await getCampusPolicy();

  const where: Prisma.BookingWhereInput = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.lecturerId ? { lecturerId: filter.lecturerId } : {}),
    ...(filter.serviceId ? { serviceId: filter.serviceId } : {}),
    ...(filter.from || filter.to
      ? {
          startAt: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : {}),
  };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      service: { select: { id: true, name: true } },
      lecturer: { include: { user: { select: { name: true } } } },
      student: { include: { user: { select: { name: true } } } },
    },
    orderBy: { startAt: "asc" },
  });

  const statusMap = new Map<BookingStatus, number>();
  const serviceMap = new Map<string, { name: string; count: number }>();
  const lecturerMap = new Map<string, { name: string; count: number }>();
  const trendMap = new Map<string, { date: string; total: number; confirmed: number; completed: number }>();

  for (const b of bookings) {
    statusMap.set(b.status, (statusMap.get(b.status) ?? 0) + 1);

    const svcEntry = serviceMap.get(b.serviceId) ?? { name: b.service.name, count: 0 };
    svcEntry.count += 1;
    serviceMap.set(b.serviceId, svcEntry);

    const lecEntry = lecturerMap.get(b.lecturerId) ?? { name: b.lecturer.user.name, count: 0 };
    lecEntry.count += 1;
    lecturerMap.set(b.lecturerId, lecEntry);

    const dateKey = getLocalDateKey(b.startAt, policy.campusTimezone);
    const tEntry = trendMap.get(dateKey) ?? {
      date: dateKey,
      total: 0,
      confirmed: 0,
      completed: 0,
    };
    tEntry.total += 1;
    if (b.status === "CONFIRMED") tEntry.confirmed += 1;
    if (b.status === "COMPLETED") tEntry.completed += 1;
    trendMap.set(dateKey, tEntry);
  }

  const byStatus = (
    ["PENDING", "CONFIRMED", "COMPLETED", "REJECTED", "CANCELLED", "NO_SHOW"] as BookingStatus[]
  ).map((st) => ({
    status: st,
    label: BOOKING_STATUS_META[st].label,
    count: statusMap.get(st) ?? 0,
  }));

  const byService = Array.from(serviceMap.values()).sort((a, b) => b.count - a.count);
  const byLecturer = Array.from(lecturerMap.values()).sort((a, b) => b.count - a.count);
  const trend = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary: {
      totalBookings: bookings.length,
      pending: statusMap.get("PENDING") ?? 0,
      confirmed: statusMap.get("CONFIRMED") ?? 0,
      completed: statusMap.get("COMPLETED") ?? 0,
      rejectedOrCancelled:
        (statusMap.get("REJECTED") ?? 0) + (statusMap.get("CANCELLED") ?? 0),
      noShow: statusMap.get("NO_SHOW") ?? 0,
    },
    byStatus,
    byService,
    byLecturer,
    trend,
    campusTimezone: policy.campusTimezone,
    rows: bookings.map((b) => ({
      id: b.id,
      bookingCode: b.bookingCode,
      studentName: b.student.user.name,
      studentNumber: b.student.studentNumber,
      lecturerName: b.lecturer.user.name,
      serviceName: b.service.name,
      durationMinutes: b.serviceDurationSnapshot,
      startAt: b.startAt,
      endAt: b.endAt,
      status: b.status,
      topic: b.topic,
    })),
  };
}

export async function generateAdminReportCsv(filter: ReportFilter): Promise<string> {
  const report = await getAdminReportData(filter);
  const headers = [
    "Kode Booking",
    "Mahasiswa",
    "NIM",
    "Dosen",
    "Layanan",
    "Durasi (Menit)",
    "Waktu Mulai",
    "Waktu Selesai",
    "Status",
    "Topik",
  ];

  const lines = [headers.map((h) => escapeCsvCell(h)).join(",")];

  for (const row of report.rows) {
    lines.push(
      [
        escapeCsvCell(row.bookingCode),
        escapeCsvCell(row.studentName),
        escapeCsvCell(row.studentNumber),
        escapeCsvCell(row.lecturerName),
        escapeCsvCell(row.serviceName),
        escapeCsvCell(row.durationMinutes),
        escapeCsvCell(formatDateTime(row.startAt, report.campusTimezone)),
        escapeCsvCell(formatDateTime(row.endAt, report.campusTimezone)),
        escapeCsvCell(BOOKING_STATUS_META[row.status].label),
        escapeCsvCell(row.topic),
      ].join(",")
    );
  }

  return lines.join("\r\n");
}

