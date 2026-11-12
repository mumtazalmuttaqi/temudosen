import { Suspense } from "react";
import Link from "next/link";
import { Calendar, History, Lock } from "lucide-react";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/permissions/rbac";
import { formatDateOnly, formatDateTime } from "@/lib/utils";
import { getCampusPolicy } from "@/server/policies/settings-service";
import { listLecturerConsultationHistory } from "@/server/services/consultation-service";

async function LecturerHistoryContent() {
  const user = await requirePageUser(["LECTURER"]);
  const [policy, history] = await Promise.all([
    getCampusPolicy(),
    listLecturerConsultationHistory(user),
  ]);

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title="Belum Ada Riwayat Mahasiswa"
        description="Konsultasi yang telah selesai atau ditandai tidak hadir akan tampil di sini."
      />
    );
  }

  return (
    <div className="space-y-4">
      {history.map((item) => (
        <Card key={item.id}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
            <div>
              <span className="font-mono text-xs text-slate-500">{item.bookingCode}</span>
              <CardTitle className="text-base mt-0.5">{item.topic}</CardTitle>
              <p className="text-sm text-slate-600 mt-0.5">
                {item.student.user.name} (NIM {item.student.studentNumber}) • {item.service.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BookingStatusBadge status={item.status} />
              <Button asChild size="sm" variant="outline">
                <Link href={`/lecturer/bookings/${item.id}`}>Kelola Catatan</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateTime(item.startAt, policy.campusTimezone)}</span>
            </div>

            {item.consultation ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
                {item.consultation.privateNotes ? (
                  <p className="text-amber-900 flex items-start gap-1.5">
                    <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      <strong>Privat:</strong> {item.consultation.privateNotes}
                    </span>
                  </p>
                ) : null}
                {item.consultation.studentVisibleNotes ? (
                  <p className="text-slate-700">
                    <strong>Catatan Mahasiswa:</strong> {item.consultation.studentVisibleNotes}
                  </p>
                ) : null}
                {item.consultation.followUpDate ? (
                  <p className="text-[#143359] font-medium">
                    Follow-up: {formatDateOnly(item.consultation.followUpDate, policy.campusTimezone)}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">Belum ada catatan konsultasi.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function LecturerHistoryPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerHistoryContent />
    </Suspense>
  );
}

