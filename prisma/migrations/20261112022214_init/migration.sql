-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'LECTURER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ScheduleChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "student_number" TEXT NOT NULL,
    "program_study" TEXT NOT NULL,
    "faculty" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecturer_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "lecturer_number" TEXT NOT NULL,
    "expertise" TEXT NOT NULL,
    "faculty" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lecturer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecturer_services" (
    "id" UUID NOT NULL,
    "lecturer_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecturer_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availabilities" (
    "id" UUID NOT NULL,
    "lecturer_id" UUID NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "booking_code" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "lecturer_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "service_duration_snapshot" INTEGER NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "topic" TEXT NOT NULL,
    "additional_notes" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "cancellation_reason" TEXT,
    "pending_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "private_notes" TEXT,
    "student_visible_notes" TEXT,
    "recommendations" TEXT,
    "follow_up_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_change_requests" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "requested_by_user_id" UUID NOT NULL,
    "proposed_start_at" TIMESTAMPTZ(6) NOT NULL,
    "proposed_end_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ScheduleChangeStatus" NOT NULL DEFAULT 'PENDING',
    "decision_reason" TEXT,
    "decided_by" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "schedule_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_outboxes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "notification_outboxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_histories" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pending_hold_hours" INTEGER NOT NULL DEFAULT 24,
    "cancellation_cutoff_hours" INTEGER NOT NULL DEFAULT 12,
    "allow_student_cancel_confirmed" BOOLEAN NOT NULL DEFAULT true,
    "confirmed_cancel_requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "schedule_change_approver" TEXT NOT NULL DEFAULT 'LECTURER',
    "student_can_view_all_notes" BOOLEAN NOT NULL DEFAULT false,
    "admin_can_view_private_notes" BOOLEAN NOT NULL DEFAULT false,
    "campus_timezone" TEXT NOT NULL DEFAULT 'Asia/Jakarta',
    "allow_open_student_registration" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_student_number_key" ON "student_profiles"("student_number");

-- CreateIndex
CREATE INDEX "student_profiles_faculty_program_study_idx" ON "student_profiles"("faculty", "program_study");

-- CreateIndex
CREATE UNIQUE INDEX "lecturer_profiles_user_id_key" ON "lecturer_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lecturer_profiles_lecturer_number_key" ON "lecturer_profiles"("lecturer_number");

-- CreateIndex
CREATE INDEX "lecturer_profiles_faculty_idx" ON "lecturer_profiles"("faculty");

-- CreateIndex
CREATE INDEX "lecturer_profiles_expertise_idx" ON "lecturer_profiles"("expertise");

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE INDEX "services_is_active_idx" ON "services"("is_active");

-- CreateIndex
CREATE INDEX "lecturer_services_service_id_idx" ON "lecturer_services"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "lecturer_services_lecturer_id_service_id_key" ON "lecturer_services"("lecturer_id", "service_id");

-- CreateIndex
CREATE INDEX "availabilities_lecturer_id_start_at_end_at_idx" ON "availabilities"("lecturer_id", "start_at", "end_at");

-- CreateIndex
CREATE INDEX "availabilities_lecturer_id_status_idx" ON "availabilities"("lecturer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_booking_code_key" ON "bookings"("booking_code");

-- CreateIndex
CREATE INDEX "bookings_lecturer_id_start_at_end_at_status_idx" ON "bookings"("lecturer_id", "start_at", "end_at", "status");

-- CreateIndex
CREATE INDEX "bookings_student_id_status_start_at_idx" ON "bookings"("student_id", "status", "start_at");

-- CreateIndex
CREATE INDEX "bookings_status_pending_expires_at_idx" ON "bookings"("status", "pending_expires_at");

-- CreateIndex
CREATE INDEX "bookings_service_id_idx" ON "bookings"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "consultations_booking_id_key" ON "consultations"("booking_id");

-- CreateIndex
CREATE INDEX "schedule_change_requests_booking_id_status_idx" ON "schedule_change_requests"("booking_id", "status");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "notification_outboxes_status_created_at_idx" ON "notification_outboxes"("status", "created_at");

-- CreateIndex
CREATE INDEX "booking_status_histories_booking_id_created_at_idx" ON "booking_status_histories"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturer_profiles" ADD CONSTRAINT "lecturer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturer_services" ADD CONSTRAINT "lecturer_services_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturer_services" ADD CONSTRAINT "lecturer_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "lecturer_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_change_requests" ADD CONSTRAINT "schedule_change_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_outboxes" ADD CONSTRAINT "notification_outboxes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_histories" ADD CONSTRAINT "booking_status_histories_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Enable btree_gist for exclusion constraints combining UUID equality and tstzrange overlap
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Check constraints for time ranges & snapshots
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_start_before_end" CHECK ("start_at" < "end_at");
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_start_before_end" CHECK ("start_at" < "end_at");
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_duration_positive" CHECK ("service_duration_snapshot" > 0);
ALTER TABLE "schedule_change_requests" ADD CONSTRAINT "schedule_change_start_before_end" CHECK ("proposed_start_at" < "proposed_end_at");

-- Prevent overlapping availability windows for the same lecturer
ALTER TABLE "availabilities"
ADD CONSTRAINT "availabilities_no_overlap_per_lecturer"
EXCLUDE USING gist (
  "lecturer_id" WITH =,
  tstzrange("start_at", "end_at", '[)') WITH &&
);

-- Prevent double-booking active slots (PENDING or CONFIRMED) for the same lecturer
ALTER TABLE "bookings"
ADD CONSTRAINT "bookings_no_overlap_active"
EXCLUDE USING gist (
  "lecturer_id" WITH =,
  tstzrange("start_at", "end_at", '[)') WITH &&
)
WHERE ("status" IN ('PENDING', 'CONFIRMED'));

-- Ensure role-profile integrity at the database level
CREATE OR REPLACE FUNCTION enforce_student_profile_role()
RETURNS TRIGGER AS $$
DECLARE
  u_role "UserRole";
BEGIN
  SELECT "role" INTO u_role FROM "users" WHERE "id" = NEW."user_id";
  IF u_role IS DISTINCT FROM 'STUDENT'::"UserRole" THEN
    RAISE EXCEPTION 'Profil mahasiswa hanya boleh dimiliki oleh user dengan role STUDENT';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_profile_role
BEFORE INSERT OR UPDATE ON "student_profiles"
FOR EACH ROW EXECUTE FUNCTION enforce_student_profile_role();

CREATE OR REPLACE FUNCTION enforce_lecturer_profile_role()
RETURNS TRIGGER AS $$
DECLARE
  u_role "UserRole";
BEGIN
  SELECT "role" INTO u_role FROM "users" WHERE "id" = NEW."user_id";
  IF u_role IS DISTINCT FROM 'LECTURER'::"UserRole" THEN
    RAISE EXCEPTION 'Profil dosen hanya boleh dimiliki oleh user dengan role LECTURER';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lecturer_profile_role
BEFORE INSERT OR UPDATE ON "lecturer_profiles"
FOR EACH ROW EXECUTE FUNCTION enforce_lecturer_profile_role();
