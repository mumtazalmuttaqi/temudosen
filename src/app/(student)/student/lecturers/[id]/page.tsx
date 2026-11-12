import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import { LecturerDetailSlots } from "@/features/lecturers/lecturer-detail-slots";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requirePageUser } from "@/lib/permissions/rbac";
import { getInitials } from "@/lib/utils";
import { getCampusPolicy } from "@/server/policies/settings-service";
import { getLecturerById } from "@/server/services/lecturer-service";
import { NotFoundError } from "@/server/services/errors";

async function LecturerDetailContent({ id }: { id: string }) {
  await requirePageUser(["STUDENT"]);
  const policy = await getCampusPolicy();

  let lecturer;
  try {
    lecturer = await getLecturerById(id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const services = lecturer.lecturerServices.map((ls) => ls.service);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/student/lecturers">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Cari Dosen
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#143359] text-lg font-bold text-white">
              {getInitials(lecturer.user.name)}
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-slate-900">{lecturer.user.name}</h2>
              <p className="text-sm text-slate-600 flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-slate-400" />
                {lecturer.faculty} • NIDN/NIP: {lecturer.lecturerNumber}
              </p>
              <p className="text-sm font-medium text-blue-700">{lecturer.expertise}</p>
              {lecturer.bio ? <p className="text-sm text-slate-600 max-w-2xl pt-1">{lecturer.bio}</p> : null}
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link href={`/student/book?lecturerId=${lecturer.id}`}>
              <BookOpen className="h-4 w-4" />
              Ajukan Booking
            </Link>
          </Button>
        </CardContent>
      </Card>

      <LecturerDetailSlots
        lecturerId={lecturer.id}
        services={services}
        timezone={policy.campusTimezone}
      />
    </div>
  );
}

export default async function StudentLecturerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <LecturerDetailContent id={id} />
    </Suspense>
  );
}

