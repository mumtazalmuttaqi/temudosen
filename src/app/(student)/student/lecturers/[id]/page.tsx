import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, GraduationCap, Lightbulb } from "lucide-react";
import { LecturerDetailSlots } from "@/features/lecturers/lecturer-detail-slots";
import { DashboardSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
              <p className="text-sm text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  {lecturer.faculty}
                </span>
                <span>• NIDN: {lecturer.lecturerNumber}</span>
                {lecturer.nip ? <span>• NIP: {lecturer.nip}</span> : null}
                <span>• {lecturer.user.email}</span>
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

      {lecturer.thesisRecommendations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-600" />
              Rekomendasi Topik / Judul Skripsi
            </CardTitle>
            <CardDescription>
              Topik riset dan skripsi yang ditawarkan oleh {lecturer.user.name}. Klik topik untuk langsung mengajukan konsultasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {lecturer.thesisRecommendations.map((rec, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-[#143359]">
                    Rekomendasi {idx + 1}
                  </span>
                  <p className="mt-2 text-sm text-slate-800 leading-relaxed">{rec}</p>
                </div>
                <Button asChild size="sm" variant="outline" className="w-fit">
                  <Link
                    href={`/student/book?lecturerId=${lecturer.id}&topic=${encodeURIComponent(rec.slice(0, 200))}`}
                  >
                    Ajukan Topik Ini
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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

