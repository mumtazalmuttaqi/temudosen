import type { BookingStatus, ScheduleChangeStatus, UserStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  BOOKING_STATUS_META,
  SCHEDULE_CHANGE_STATUS_META,
  USER_STATUS_META,
  cn,
} from "@/lib/utils";

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const meta = BOOKING_STATUS_META[status];
  return (
    <Badge className={meta.badgeClass}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} />
      {meta.label}
    </Badge>
  );
}

export function ScheduleChangeStatusBadge({ status }: { status: ScheduleChangeStatus }) {
  const meta = SCHEDULE_CHANGE_STATUS_META[status];
  return <Badge className={meta.badgeClass}>{meta.label}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const meta = USER_STATUS_META[status];
  return <Badge className={meta.badgeClass}>{meta.label}</Badge>;
}

