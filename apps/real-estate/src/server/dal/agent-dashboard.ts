import 'server-only';
import { addDays, daysBetween } from '@repo/utils';
import { expiryState } from '@/features/documents/service';
import { ledgerTotals, monthlySummary, type MonthSummary } from '@/features/ledger/service';
import { monthStart } from '@/features/shared/date-range';
import { countByStatus, leasesEndingSoon } from '@/features/stock/service';
import type { UnitRow, UnitStatus } from '@/features/stock/types';
import { authorize, type Session } from '../agent/auth';
import { today } from '../agent/clock';
import { listContracts } from './agent-contracts';
import { listDocuments, type DocumentRow } from './agent-documents';
import { listLedger } from './agent-ledger';
import { listUnits } from './agent-stock';

export interface Dashboard {
  today: string;
  propertyCount: number;
  unitCount: number;
  byStatus: Record<UnitStatus, number>;
  commissionThisMonth: number;
  netThisMonth: number;
  pendingCommission: number;
  months: MonthSummary[];
  expiringDocs: DocumentRow[];
  leasesEnding: UnitRow[];
  /** ยูนิตที่จองแล้วแต่ยังไม่มีสัญญา */
  needContract: UnitRow[];
}

export async function getDashboard(session: Session): Promise<Dashboard> {
  authorize(session, 'dashboard.view');
  const day = today();
  const [units, ledger, docs, contracts] = await Promise.all([listUnits(session), listLedger(session), listDocuments(session), listContracts(session)]);
  const month = ledgerTotals(ledger.filter(e => e.date >= monthStart(day) && e.date <= day));
  const contracted = new Set(contracts.filter(c => c.type !== 'agency').map(c => c.unitId));
  const sixMonthsAgo = monthStart(addDays(monthStart(day), -150));
  return {
    today: day,
    propertyCount: new Set(units.map(u => u.propertyId)).size,
    unitCount: units.length,
    byStatus: countByStatus(units),
    commissionThisMonth: month.commission,
    netThisMonth: month.net,
    pendingCommission: ledgerTotals(ledger).pending,
    months: monthlySummary(ledger, { from: sixMonthsAgo, to: day }),
    expiringDocs: docs.filter(d => ['expired', 'soon'].includes(expiryState(d.expiresAt, day))).sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? '')),
    leasesEnding: leasesEndingSoon(units, day, 90, daysBetween),
    needContract: units.filter(u => u.status === 'reserved' && !contracted.has(u.id)),
  };
}
