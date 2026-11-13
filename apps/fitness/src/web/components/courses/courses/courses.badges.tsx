import { ENROLLMENT_STATUS_LABEL, type EnrollmentStatus } from '@/api/services/courses/courses/courses.service';
import { Badge, type Tone } from '@/web/components/ui/ui/ui';

const TONE: Record<EnrollmentStatus, Tone> = { pending: 'cyan', review: 'warn', paid: 'lime', cancelled: 'muted' };

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return <Badge tone={TONE[status]}>{ENROLLMENT_STATUS_LABEL[status]}</Badge>;
}
