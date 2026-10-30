import 'server-only';
import { filterLedger, kindOf, withholdingFor, isCommission, type LedgerCategory, type LedgerEntry, type LedgerFilter } from '@/features/ledger/service';
import { audit } from '../agent/audit';
import { authorize, type Session } from '../agent/auth';
import { nextId, store } from '../agent/store';
import { inScope, notFound, visibleProperties } from './agent-stock';

/** บัญชีรายรับ-รายจ่าย — agent เห็นเฉพาะรายการของตัวเอง · admin เห็นทั้งบริษัท */

export function listLedger(session: Session, filter: LedgerFilter = { range: null }): Promise<LedgerEntry[]> {
  authorize(session, 'ledger.view');
  return Promise.resolve(filterLedger(store().ledger.filter(e => inScope(session, e.agentId)), filter));
}

export function addLedgerEntry(
  session: Session,
  input: { date: string; category: LedgerCategory; description: string; amount: number; withholding: boolean; status: LedgerEntry['status']; propertyId: string | null },
): Promise<LedgerEntry> {
  authorize(session, 'ledger.manage');
  if (input.propertyId && !visibleProperties(session).some(p => p.id === input.propertyId)) return Promise.reject(notFound());
  const kind = kindOf(input.category);
  const entry: LedgerEntry = {
    id: nextId('l'), date: input.date, kind, category: input.category, description: input.description, amount: input.amount,
    // หัก ณ ที่จ่ายมีเฉพาะค่าคอม (ผู้จ่ายค่าคอมหัก 3%)
    withholding: kind === 'income' && isCommission(input.category) && input.withholding ? withholdingFor(input.amount) : 0,
    status: input.status, propertyId: input.propertyId, agentId: session.userId,
  };
  store().ledger.push(entry);
  audit(session, 'ledger.create', 'ledger', entry.id);
  return Promise.resolve(entry);
}

/** เปลี่ยนค่าคอมค้างรับเป็นรับแล้ว */
export function settleEntry(session: Session, id: string): Promise<void> {
  authorize(session, 'ledger.manage');
  const entry = store().ledger.find(e => e.id === id);
  if (!entry || !inScope(session, entry.agentId)) return Promise.reject(notFound());
  entry.status = 'settled';
  audit(session, 'ledger.settle', 'ledger', id);
  return Promise.resolve();
}

export function propertyCodes(session: Session): Map<string, string> {
  return new Map(visibleProperties(session).map(p => [p.id, p.code]));
}
