import type { Metadata } from 'next';
import { Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { Avatar, Badge, Card, PageHeader } from '@/web/components/ui/ui/ui';
import { AddTrainerButton, TrainerCardActions } from '@/web/components/trainers/trainers/trainers.forms';
import { createTrainerAction, deleteTrainerAction, updateTrainerAction } from '@/api/actions/trainers/trainers/trainers.actions';
import { can } from '@/api/lib/auth/auth/auth.rbac';
import { listTrainers, trainerUsage } from '@/api/dal/trainers/trainers/trainers.dal';
import { pageGuard } from '@/api/lib/auth/auth/auth.guard';
import { accessDenied } from '@/web/app/layout/layout/layout.access-denied';

export const metadata: Metadata = { title: 'เทรนเนอร์' };

export default async function TrainersPage() {
  const { session, allowed } = await pageGuard('trainers.view');
  if (!allowed) return accessDenied();
  const manage = can(session, 'trainers.manage');
  const [trainers, usage] = await Promise.all([listTrainers(session), manage ? trainerUsage(session) : new Map<string, { classes: number; ptSessions: number }>()]);
  return (
    <>
      <PageHeader kicker={session.branch} title="เทรนเนอร์" />
      <Card
        title="เทรนเนอร์ทั้งหมด"
        subtitle={`${String(trainers.length)} คน${manage ? ' · ย้ายตารางคลาสไปให้เทรนเนอร์คนอื่นได้ · เทรนเนอร์ที่มีประวัติคิว PT ยังลบไม่ได้' : ''}`}
        action={manage ? <AddTrainerButton action={createTrainerAction} /> : undefined}
      >
        {trainers.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-bg/50 px-5 py-10 text-center">
            <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-lime/10 text-lime">
              <Dumbbell aria-hidden className="size-6" />
            </span>
            <p className="font-semibold">{manage ? 'เริ่มเพิ่มเทรนเนอร์คนแรก' : 'ยังไม่มีเทรนเนอร์'}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              {manage ? 'สร้างโปรไฟล์เพื่อให้สมาชิกเห็นในหน้าจองคลาสและ PT' : 'เมื่อมีเทรนเนอร์ รายชื่อจะแสดงที่นี่'}
            </p>
          </div>
        ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {trainers.map(t => (
            <li key={t.id} className="relative flex flex-col gap-3 rounded-2xl border border-line bg-bg p-5 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-lime">
              <div className="flex items-center gap-3">
                <Avatar name={t.name} className="size-12" />
                <div className="min-w-0 flex-1">
                  <Link href={`/trainers/${t.id}`} className="tap block truncate font-display text-lg font-semibold outline-none after:absolute after:inset-0">{t.nickname}</Link>
                  <small className="text-xs text-muted">{t.name}</small>
                </div>
                {manage && (
                  <TrainerCardActions
                    trainer={t}
                    updateAction={updateTrainerAction}
                    deleteAction={deleteTrainerAction.bind(null, t.id)}
                    classCount={usage.get(t.id)?.classes ?? 0}
                    ptSessionCount={usage.get(t.id)?.ptSessions ?? 0}
                    replacementOptions={trainers.filter(option => option.id !== t.id).map(option => ({ id: option.id, nickname: option.nickname }))}
                  />
                )}
              </div>
              <p className="flex flex-wrap gap-1.5">{t.specialties.map(s => <Badge key={s} tone="cyan">{s}</Badge>)}</p>
              <p className="text-sm text-muted">{t.bio}</p>
              <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-line pt-3 text-sm">
                <div><dt className="text-xs text-faint">คลาส 7 วันนี้</dt><dd className="font-display text-xl font-semibold">{t.classesThisWeek}</dd></div>
                <div><dt className="text-xs text-faint">คิว PT ที่รออยู่</dt><dd className="font-display text-xl font-semibold">{t.ptUpcoming}</dd></div>
              </dl>
              {session.trainerId === t.id && <Badge tone="lime">บัญชีของคุณ</Badge>}
            </li>
          ))}
        </ul>
        )}
      </Card>
    </>
  );
}
