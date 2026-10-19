import type { Metadata } from 'next';
import { ClassCreateForm } from '@/components/booking-forms';
import { Forbidden, PageHeader } from '@/components/ui';
import { createClassAction } from '@/features/classes/actions';
import { today } from '@/server/clock';
import { listRooms } from '@/server/dal/classes';
import { listTrainers } from '@/server/dal/trainers';
import { pageGuard } from '@/server/guard';

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
