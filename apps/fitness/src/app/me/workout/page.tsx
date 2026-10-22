import { formatThaiDate } from '@repo/utils';
import type { Metadata } from 'next';
import { Forbidden, PageHeader } from '@/components/ui';
import { PlanItem, WorkoutPicker } from '@/components/workout';
import { MUSCLE_LABEL } from '@/features/workouts/catalog';
import { addToPlanAction, removeFromPlanAction, toggleDoneAction } from '@/features/workouts/actions';
import { planMinutes } from '@/features/workouts/service';
import { getMyWorkout } from '@/server/dal/workouts';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'ฝึก' };

/** ตัวช่วยออกกำลังกาย (แบบ A Body Map): เลือกกล้ามเนื้อทีละมัด → ได้ท่าฝึก → เพิ่มลงโปรแกรมวันนี้แล้วติ๊กตามที่ทำ */
export default async function MyWorkoutPage() {
  const { session, allowed } = await pageGuard('coach.use');
  if (!allowed) return <Forbidden />;
  const workout = await getMyWorkout(session);
  const done = workout.items.filter(i => i.done).length;
  const total = workout.items.length;

  return (
    <>
      <PageHeader title="ฝึกวันนี้" kicker={formatThaiDate(workout.date, 'long')} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <WorkoutPicker addAction={addToPlanAction} planned={workout.items.map(i => i.id)} />

        <section aria-labelledby="plan-title" className="rounded-2xl border border-line bg-surface p-4 sm:p-5 lg:sticky lg:top-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="plan-title" className="font-display text-lg font-semibold">โปรแกรมวันนี้</h2>
            {total > 0 && <span className="text-sm text-muted">เสร็จ {done}/{total} ท่า · ราว {planMinutes(total)} นาที</span>}
          </div>
          {total > 0 && (
            <div role="progressbar" aria-label="ความคืบหน้าวันนี้" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-lime transition-[width]" style={{ width: `${String(Math.round((done / total) * 100))}%` }} />
            </div>
          )}
          {total === 0 ? (
            <p className="mt-3 text-sm text-muted">ยังไม่มีท่าในโปรแกรม เลือกกล้ามเนื้อที่อยากได้ แล้วกด “เพิ่มลงโปรแกรมวันนี้”</p>
          ) : (
            <ul className="mt-2 flex flex-col divide-y divide-line">
              {workout.items.map(i => (
                <PlanItem
                  key={i.id}
                  name={i.name}
                  detail={`${i.muscles.map(m => MUSCLE_LABEL[m]).join(' · ')} · ${i.equipment}`}
                  sets={i.sets}
                  done={i.done}
                  toggleAction={toggleDoneAction.bind(null, i.id, !i.done)}
                  removeAction={removeFromPlanAction.bind(null, i.id)}
                />
              ))}
            </ul>
          )}
          {total > 0 && done === total && <p role="status" className="mt-3 rounded-xl bg-lime/10 p-3 text-sm font-semibold text-lime">ครบทุกท่าแล้ว เยี่ยมมาก! อย่าลืมกินโปรตีนหลังฝึก</p>}
        </section>
      </div>
    </>
  );
}
