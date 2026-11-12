import { Suspense } from "react";
import Link from "next/link";
import { Calendar, History } from "lucide-react";
import { BookingStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageUser } from "@/lib/permissions/rbac";
import { formatDateOnly, formatDateTime } from "@/lib/utils";
import { getCampusPolicy } from "@/server/policies/settings-service";
import { listStudentConsultationHistory } from "@/server/services/consultation-service";

async function StudentHistoryContent() {
  const user = await requirePageUser(["STUDENT"]);
  const [policy, history] = await Promise.all([
    getCampusPolicy(),
    listStudentConsultationHistory(user),
  ]);

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" />}
        title="Belum Ada Riwayat Bimbingan"
        description="Konsultasi yang telah selesai beserta catatan rekomendasi dosen akan muncul di halaman ini."
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
                {item.lecturer.user.name} • {item.service.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <BookingStatusBadge status={item.status} />
              <Button asChild size="sm" variant="outline">
                <Link href={`/student/bookings/${item.id}`}>Detail</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateTime(item.startAt, policy.campusTimezone)}</span>
            </div>

            {item.consultation ? (
              <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3.5 space-y-2">
                {item.consultation.studentVisibleNotes ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Catatan Bimbingan:</p>
                    <p className="text-slate-800 whitespace-pre-line">
                      {item.consultation.studentVisibleNotes}
                    </p>
                  </div>
                ) : null}
                {item.consultation.recommendations ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-600">Rekomendasi:</p>
                    <p className="text-slate-800 whitespace-pre-line">
                      {item.consultation.recommendations}
                    </p>
                  </div>
                ) : null}
                {item.consultation.followUpDate ? (
                  <p className="text-xs font-medium text-[#143359]">
                    Target tindak lanjut:{" "}
                    {formatDateOnly(item.consultation.followUpDate, policy.campusTimezone)}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                Belum ada catatan bimbingan yang dibagikan untuk sesi ini.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function StudentHistoryPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <StudentHistoryContent />
    </Suspense>
  );
}

