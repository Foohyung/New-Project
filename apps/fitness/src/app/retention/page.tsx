import { formatBaht, formatThaiMobile } from '@repo/utils';
import { Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionButton } from '@/components/action-button';
import { FollowUpForm } from '@/components/follow-up-form';
import { Avatar, Badge, btn, Card, EmptyState, Forbidden, PageHeader, Stat } from '@/components/ui';
import { messageAction, recordContactAction, winbackAction } from '@/features/retention/actions';
import { RISK_LABEL, RISK_WEIGHTS, STAGE_LABEL, type FollowUpStage } from '@/features/retention/service';
import type { AtRiskDto } from '@/features/retention/types';
import { getRetention } from '@/server/dal/retention';
import { pageGuard } from '@/server/guard';

export const metadata: Metadata = { title: 'ติดตามสมาชิก' };

const STAGE_DOT: Record<FollowUpStage, string> = { todo: 'bg-danger', contacted: 'bg-warn', won: 'bg-lime' };

function Spark({ weekly }: { weekly: number[] }) {
  const max = Math.max(...weekly, 1);
  return (
    <span className="flex h-8 items-end gap-0.5" role="img" aria-label={`เข้ายิมต่อสัปดาห์ 8 สัปดาห์ล่าสุด: ${weekly.join(', ')} ครั้ง`}>
      {weekly.map((v, i) => (
        <span key={i} style={{ height: `${String(Math.max(8, (v / max) * 100))}%` }} className={`w-1.5 rounded-sm ${i >= 5 && v <= max / 3 ? 'bg-danger' : 'bg-cyan/80'}`} />
      ))}
    </span>
  );
}

function RiskRow({ r }: { r: AtRiskDto }) {
  return (
    <li className="grid gap-3 rounded-2xl border border-line bg-bg p-3 sm:p-4 lg:grid-cols-[auto_minmax(0,1.4fr)_auto_minmax(0,1fr)] lg:items-center">
      <div className="flex items-center gap-3 lg:contents">
        <span className={`grid size-12 shrink-0 place-items-center rounded-xl font-display text-lg font-bold ${r.level === 'high' ? 'bg-danger/15 text-danger' : 'bg-warn/15 text-warn'}`} title="คะแนนความเสี่ยง">
          <span className="sr-only">คะแนนเสี่ยง </span>{r.score}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/members/${r.memberId}`} className="tap inline-block font-semibold hover:underline">{r.name}</Link>
            {r.stage && <Badge tone={r.stage === 'won' ? 'lime' : 'muted'}>{STAGE_LABEL[r.stage]}</Badge>}
          </div>
          <p className="text-xs text-muted">{r.packageName} · {r.code}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {r.reasons.map(x => <Badge key={x.key} tone={x.key === 'expiring' || x.key === 'ignored' ? 'warn' : 'danger'}>{x.label}</Badge>)}
          </div>
        </div>
      </div>
      <div className="hidden lg:block"><Spark weekly={r.weekly} /></div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <details className="group w-full sm:w-auto">
          <summary className={`${btn.primary} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}><Phone aria-hidden className="size-4" />โทร / บันทึก</summary>
          <div className="mt-2 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 sm:w-80">
            <a href={`tel:${r.phone}`} className="tap inline-block font-semibold text-lime underline underline-offset-2">โทร {formatThaiMobile(r.phone)}</a>
            <FollowUpForm action={recordContactAction.bind(null, r.memberId)} />
          </div>
        </details>
        {r.canMessage ? <ActionButton action={messageAction.bind(null, r.memberId)} label="ส่งข้อความ" /> : <span className="inline-flex min-h-11 items-center text-xs text-faint">ไม่ยินยอมรับข้อความ</span>}
        <ActionButton action={winbackAction.bind(null, r.memberId)} label="ให้คูปอง 15%" variant="ghost" />
      </div>
    </li>
  );
}

export default async function RetentionPage() {
  const { session, allowed } = await pageGuard('retention.view');
  if (!allowed) return <Forbidden />;
  const data = await getRetention(session);
  const stages: FollowUpStage[] = ['todo', 'contacted', 'won'];

  return (
    <>
      <PageHeader kicker={`${session.branch} · อัปเดตทุกเช้า 06:00`} title="ติดตามสมาชิกเสี่ยงหลุด" />

      <section aria-label="สรุป" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="อัตราต่ออายุเดือนนี้" value={`${String(data.renewalRatePct)}%`} hint="ทั้งยิม" />
        <Stat label="เสี่ยงสูง" value={<span className="text-danger">{data.high}</span>} hint="ควรโทรวันนี้" />
        <Stat label="เสี่ยงปานกลาง" value={<span className="text-warn">{data.medium}</span>} hint="ส่งข้อความก่อน" />
        <Stat tone="lime" label="ดึงกลับมาได้ เดือนนี้" value={`${String(data.recovered)} คน`} hint={formatBaht(data.recoveredSatang)} />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)] xl:gap-5">
        <Card title="ต้องติดตาม" subtitle="เรียงจากคะแนนเสี่ยงมากไปน้อย (ไม่รวมคนที่พักสมาชิกอยู่)">
          {data.atRisk.length === 0 ? <EmptyState>ไม่มีสมาชิกเสี่ยงหลุด เยี่ยมมาก!</EmptyState> : (
            <ul className="flex flex-col gap-3">{data.atRisk.map(r => <RiskRow key={r.memberId} r={r} />)}</ul>
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <section aria-label="บอร์ดติดตาม" className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {stages.map(s => (
              <div key={s} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface/60 p-3">
                <h2 className="flex items-center gap-2 px-1 font-semibold">
                  <span aria-hidden className={`size-2.5 rounded-full ${STAGE_DOT[s]}`} />{STAGE_LABEL[s]}
                  <span className="ml-auto rounded-full bg-surface-2 px-2 text-xs font-normal text-muted">{data.board[s].length}</span>
                </h2>
                {data.board[s].length === 0 ? <p className="px-1 text-sm text-faint">—</p> : data.board[s].map(f => (
                  <div key={f.memberId} className="flex items-center gap-2.5 rounded-xl border border-line bg-bg p-2.5">
                    <Avatar name={f.name} />
                    <div className="min-w-0 text-sm"><Link href={`/members/${f.memberId}`} className="block truncate font-medium hover:underline">{f.name}</Link><p className="line-clamp-2 text-xs text-muted">{f.note}{f.by ? ` · ${f.by}` : ''}</p></div>
                  </div>
                ))}
              </div>
            ))}
          </section>
          <Card title="คะแนนคิดจาก">
            <ul className="flex flex-col gap-1.5 text-sm text-muted">
              <li className="flex justify-between gap-3"><span>ไม่มาเกิน 14 วัน (7–13 วันได้บางส่วน)</span><b className="text-ink">{RISK_WEIGHTS.absent}</b></li>
              <li className="flex justify-between gap-3"><span>ความถี่ลดลง เทียบ 4 สัปดาห์ก่อน</span><b className="text-ink">{RISK_WEIGHTS.drop}</b></li>
              <li className="flex justify-between gap-3"><span>หมดอายุภายใน 7 วัน / เพิ่งหมด</span><b className="text-ink">{RISK_WEIGHTS.expiring}</b></li>
              <li className="flex justify-between gap-3"><span>ตัดบัตรไม่ผ่าน</span><b className="text-ink">{RISK_WEIGHTS.payment}</b></li>
              <li className="flex justify-between gap-3"><span>ไม่เปิดข้อความเตือน</span><b className="text-ink">{RISK_WEIGHTS.ignored}</b></li>
            </ul>
            <p className="mt-3 text-xs text-faint">≥ 70 = {RISK_LABEL.high} · 40–69 = {RISK_LABEL.medium}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
