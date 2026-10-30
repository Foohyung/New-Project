import type { Metadata } from 'next';
import { ClassCreateForm } from '@/web/components/classes/classes/classes.booking-forms';
import { Forbidden, PageHeader } from '@/web/components/ui/ui/ui';
import { createClassAction } from '@/api/actions/classes/classes/classes.actions';
import { today } from '@/api/lib/clock/clock/clock';
import { listRooms } from '@/api/dal/classes/classes/classes.dal';
import { listTrainers } from '@/api/dal/trainers/trainers/trainers.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';

export const metadata: Metadata = { title: 'เพิ่มคลาส' };

export default async function NewClassPage() {
  const { session, allowed } = await pageGuard('classes.manage');
  if (!allowed) return <Forbidden />;
  const [trainers, rooms] = await Promise.all([listTrainers(session), listRooms(session)]);
  return (
    <>
      <PageHeader back={{ href: '/classes', label: 'ตารางคลาส' }} kicker={session.branch} title="เพิ่มคลาส" />
      <ClassCreateForm action={createClassAction} trainers={trainers} rooms={rooms} today={today()} />
    </>
  );
}
