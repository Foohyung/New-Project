import 'server-only';
import { buildContract, CONTRACT_PREFIX, CONTRACT_TYPE_LABEL, type ContractContext, type ContractDocument, type ContractFields, type ContractType } from '@/features/contracts/template';
import { commissionLabel } from '@/features/stock/service';
import type { Client, UnitRow } from '@/features/stock/types';
import { accountById } from '../agent/accounts';
import { audit } from '../agent/audit';
import { authorize, type Session } from '../agent/auth';
import { today } from '../agent/clock';
import { nextId, store, type ContractRecord } from '../agent/store';
import { getUnit, inScope, notFound } from './agent-stock';

/** สัญญา: ดึงข้อมูลทรัพย์/เจ้าของ/ลูกค้า/agent มาเติมแม่แบบ — ลูกค้าต้องอยู่ในขอบเขตของ agent ด้วย */

function clientInScope(session: Session, clientId: string | null): Client | null {
  if (!clientId) return null;
  const client = store().clients.find(c => c.id === clientId);
  if (!client || !inScope(session, client.agentId)) throw notFound();
  return client;
}

function contextFor(session: Session, unit: UnitRow, client: Client | null, agentId: string): ContractContext {
  const owner = store().owners.find(o => o.id === unit.ownerId);
  const agent = accountById(agentId) ?? accountById(session.userId);
  if (!owner || !agent) throw notFound();
  const size = [unit.bedrooms ? `${String(unit.bedrooms)} ห้องนอน` : '', `พื้นที่ ${String(unit.areaSqm)} ตารางเมตร`, unit.landSqWah ? `ที่ดิน ${String(unit.landSqWah)} ตารางวา` : ''].filter(Boolean).join(' ');
  return {
    owner: { name: owner.name, idNumber: owner.taxId, address: owner.address },
    client: client && { name: client.name, idNumber: client.idNumber, address: client.address },
    agent: { name: agent.name, idNumber: agent.idNumber, address: agent.address, license: agent.license },
    property: { name: unit.property.name, unitLabel: unit.label, detail: size, location: unit.property.location, deed: unit.property.deed },
  };
}

/** ข้อมูลที่หน้าสร้างสัญญาใช้ดึงอัตโนมัติ */
export interface BuilderUnit {
  id: string;
  title: string;
  detail: string;
  salePrice: number | null;
  rentPrice: number | null;
  exclusive: boolean;
  commissionText: string;
  context: Omit<ContractContext, 'client'>;
}

export function builderData(session: Session, units: UnitRow[]): Promise<{ units: BuilderUnit[]; clients: (Client & { context: NonNullable<ContractContext['client']> })[] }> {
  authorize(session, 'contracts.manage');
  const clients = store().clients.filter(c => inScope(session, c.agentId));
  return Promise.resolve({
    units: units.map(u => {
      const { client: _client, ...context } = contextFor(session, u, null, session.userId);
      return { id: u.id, title: `${u.property.code} ${u.property.name} · ${u.label}`, detail: u.owner.name, salePrice: u.salePrice, rentPrice: u.rentPrice, exclusive: u.exclusive, commissionText: commissionLabel(u.commission), context };
    }),
    clients: clients.map(c => ({ ...c, context: { name: c.name, idNumber: c.idNumber, address: c.address } })),
  });
}

export interface ContractRow extends ContractRecord {
  title: string;
  unitTitle: string;
  clientName: string | null;
  ownerName: string;
}

export async function listContracts(session: Session): Promise<ContractRow[]> {
  authorize(session, 'contracts.manage');
  const rows: ContractRow[] = [];
  for (const k of store().contracts.filter(c => inScope(session, c.agentId))) {
    const unit = await getUnit(session, k.unitId).catch(() => null);
    if (!unit) continue;
    rows.push({ ...k, title: CONTRACT_TYPE_LABEL[k.type], unitTitle: `${unit.property.name} · ${unit.label}`, clientName: store().clients.find(c => c.id === k.clientId)?.name ?? null, ownerName: unit.owner.name });
  }
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number.localeCompare(a.number));
}

export async function getContract(session: Session, id: string): Promise<{ record: ContractRecord; doc: ContractDocument; unit: UnitRow }> {
  authorize(session, 'contracts.manage');
  const record = store().contracts.find(c => c.id === id);
  if (!record || !inScope(session, record.agentId)) throw notFound();
  const unit = await getUnit(session, record.unitId);
  const client = record.clientId ? (store().clients.find(c => c.id === record.clientId) ?? null) : null;
  return { record, unit, doc: buildContract(record.type, contextFor(session, unit, client, record.agentId), record.fields, record.number) };
}

/** เลขที่สัญญา: BH-{L|S|A}-{ปี พ.ศ.}-{ลำดับ 3 หลัก} */
export function nextContractNumber(type: ContractType, date: string): string {
  const year = String(Number(date.slice(0, 4)) + 543);
  const prefix = `BH-${CONTRACT_PREFIX[type]}-${year}-`;
  const max = store().contracts.reduce((m, c) => (c.number.slice(-8, -4) === year ? Math.max(m, Number(c.number.slice(-3))) : m), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export async function saveContract(session: Session, input: { type: ContractType; unitId: string; clientId: string | null; fields: ContractFields }): Promise<ContractRecord> {
  authorize(session, 'contracts.manage');
  await getUnit(session, input.unitId);
  const clientId = input.type === 'agency' ? null : input.clientId;
  clientInScope(session, clientId);
  const record: ContractRecord = { id: nextId('k'), number: nextContractNumber(input.type, today()), type: input.type, unitId: input.unitId, clientId, fields: input.fields, createdAt: today(), agentId: session.userId };
  store().contracts.push(record);
  audit(session, 'contract.create', 'contract', record.id);
  return record;
}
