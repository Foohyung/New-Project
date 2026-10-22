import { formatThaiTime } from '@repo/utils';
import type { Metadata } from 'next';
import { ActionButton } from '@/components/action-button';
import { CustomMealForm, HealthProfileForm } from '@/components/nutrition';
import { Card, Forbidden, PageHeader } from '@/components/ui';
import { deleteMealAction, logCustomMealAction, logMenuMealAction, saveHealthProfileAction, withdrawHealthConsentAction } from '@/features/nutrition/actions';
import { GOAL_INFO, SLOT_LABEL, type Macros } from '@/features/nutrition/service';
import { getMyNutrition } from '@/server/dal/nutrition';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'อาหาร' };

const fmt = new Intl.NumberFormat('th-TH');

/** วงแหวนพลังงานที่เหลือของวันนี้ */
function KcalRing({ eaten, target }: { eaten: number; target: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, eaten / target);
  const left = target - eaten;
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={`กินไปแล้ว ${fmt.format(eaten)} จาก ${fmt.format(target)} กิโลแคลอรี`} className="size-32 shrink-0">
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" className="stroke-surface-2" />
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${String(ratio * c)} ${String(c)}`} transform="rotate(-90 60 60)" className={left < 0 ? 'stroke-warn' : 'stroke-lime'} />
      <text x="60" y="58" textAnchor="middle" className="fill-ink font-display text-[22px] font-semibold">{fmt.format(Math.abs(left))}</text>
      <text x="60" y="76" textAnchor="middle" className="fill-muted text-[11px]">{left < 0 ? 'kcal เกินเป้า' : 'kcal เหลือ'}</text>
    </svg>
  );
}

function MacroBar({ label, value, target, tone }: { label: string; value: number; target: number; tone: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between gap-2 text-xs"><span className="text-muted">{label}</span><b className="font-semibold">{fmt.format(value)}/{fmt.format(target)} g</b></div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className={`h-full rounded-full ${tone}`} style={{ width: `${String(Math.min(100, Math.round((value / Math.max(1, target)) * 100)))}%` }} /></div>
    </div>
  );
}

function TargetCard({ target, eaten, goal }: { target: Macros; eaten: Macros; goal: string }) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        <KcalRing eaten={eaten.kcal} target={target.kcal} />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <MacroBar label="โปรตีน" value={eaten.proteinG} target={target.proteinG} tone="bg-lime" />
          <MacroBar label="คาร์บ" value={eaten.carbG} target={target.carbG} tone="bg-cyan" />
          <MacroBar label="ไขมัน" value={eaten.fatG} target={target.fatG} tone="bg-warn" />
        </div>
      </div>
      <p className="mt-3 text-xs text-faint">เป้า {fmt.format(target.kcal)} kcal/วัน · {goal} · คำนวณจากข้อมูลร่างกายและการออกกำลังของคุณ (ค่าประมาณ ไม่ใช่คำแนะนำทางการแพทย์)</p>
    </Card>
  );
}

/** ตัวช่วยเรื่องการกิน: เป้าพลังงาน/โปรตีนต่อวัน + เมนูไทยแนะนำ + บันทึกมื้อที่กิน (ต้องยินยอมเก็บข้อมูลสุขภาพก่อน) */
export default async function MyFoodPage() {
  const { session, allowed } = await pageGuard('coach.use');
  if (!allowed) return <Forbidden />;
  const n = await getMyNutrition(session);

  if (!n.profile || !n.target) {
    return (
      <>
        <PageHeader title="อาหารวันนี้" kicker="ตั้งค่าครั้งแรก ใช้เวลาไม่ถึง 1 นาที" />
        <Card title="บอกเราเกี่ยวกับตัวคุณ" subtitle="ระบบจะคำนวณว่าควรกินวันละกี่แคลอรีและโปรตีนเท่าไร แล้วแนะนำเมนูไทยที่หาง่าย" className="max-w-2xl">
          <HealthProfileForm action={saveHealthProfileAction} />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="อาหารวันนี้" kicker={`เป้าหมาย: ${GOAL_INFO[n.profile.goal].label}`} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <TargetCard target={n.target} eaten={n.eaten} goal={GOAL_INFO[n.profile.goal].label} />
          <Card title={`${SLOT_LABEL[n.slot]} — แนะนำ`} subtitle="เรียงจากโปรตีนสูงเทียบกับแคลอรี และไม่เกินพลังงานที่เหลือ">
            {n.suggestions.length === 0 ? (
              <p className="text-sm text-muted">วันนี้กินถึงเป้าแล้ว ถ้าหิว เลือกผักหรือน้ำเปล่าแทนนะ</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {n.suggestions.map(m => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5">
                    <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl">{m.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <b className="block font-semibold">{m.name}</b>
                      <small className="block text-xs text-muted">{m.detail} · {fmt.format(m.kcal)} kcal · โปรตีน {m.proteinG} g</small>
                    </span>
                    <ActionButton action={logMenuMealAction.bind(null, m.id)} label="กินแล้ว" pendingLabel="…" className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Card title="กินไปแล้ววันนี้" subtitle={`${fmt.format(n.eaten.kcal)} kcal · โปรตีน ${fmt.format(n.eaten.proteinG)} g`}>
            {n.logs.length === 0 ? <p className="text-sm text-muted">ยังไม่มีบันทึก กด “กินแล้ว” จากเมนูแนะนำ หรือบันทึกเองด้านล่าง</p> : (
              <ul className="flex flex-col divide-y divide-line">
                {n.logs.map(l => (
                  <li key={l.id} className="flex items-center gap-3 py-2">
                    <span className="w-12 shrink-0 text-xs text-muted">{formatThaiTime(l.loggedAt)}</span>
                    <span className="min-w-0 flex-1 text-sm">{l.name}</span>
                    <span className="shrink-0 font-display text-sm font-semibold">{fmt.format(l.kcal)}</span>
                    <ActionButton action={deleteMealAction.bind(null, l.id)} label="ลบ" pendingLabel="…" variant="ghost" className="shrink-0" />
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-3 rounded-xl border border-line p-3 open:pb-4">
              <summary className="min-h-8 cursor-pointer font-semibold">+ บันทึกเมนูอื่น</summary>
              <div className="mt-3"><CustomMealForm action={logCustomMealAction} /></div>
            </details>
          </Card>

          <Card title="ข้อมูลของฉัน" subtitle="ข้อมูลสุขภาพ — เห็นได้เฉพาะคุณ">
            <details className="rounded-xl border border-line p-3 open:pb-4">
              <summary className="min-h-8 cursor-pointer font-semibold">แก้น้ำหนัก / เป้าหมาย</summary>
              <div className="mt-3"><HealthProfileForm action={saveHealthProfileAction} initial={n.profile} /></div>
            </details>
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              <p className="text-sm text-muted">ถอนความยินยอมแล้ว ระบบจะลบข้อมูลร่างกายและบันทึกอาหารทั้งหมดทันที</p>
              <ActionButton action={withdrawHealthConsentAction} label="ถอนความยินยอมและลบข้อมูล" variant="danger" confirm="ลบข้อมูลร่างกายและบันทึกอาหารทั้งหมด? กู้คืนไม่ได้" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
