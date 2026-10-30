import 'server-only';
import { nextPropertyCode } from '@/features/stock/service';
import type { Client, Owner, Property, Unit, UnitRow, UnitStatus } from '@/features/stock/types';
import type { ClientInput, OwnerInput, PropertyInput, UnitInput } from '@/features/stock/schema';
import { audit } from '../agent/audit';
import { authorize, can, type Session } from '../agent/auth';
import { today } from '../agent/clock';
import { nextId, store } from '../agent/store';

/*
 * สต็อกทรัพย์ เจ้าของ และลูกค้า — ทุกฟังก์ชันตรวจสิทธิ์และขอบเขตข้อมูล (§10.2)
 * agent เห็นเฉพาะทรัพย์/ลูกค้าที่ตัวเองดูแล · admin เห็นทุกคน
 * ข้อมูลติดต่อเจ้าของและลูกค้าเป็น Confidential (§A.3)
 */

export const notFound = () => new Error('NOT_FOUND');

/** ข้อมูลของ agent คนนี้หรือไม่ (admin เห็นทุกคน) */
export function inScope(session: Session, agentId: string): boolean {
  return can(session, 'agents.all') || agentId === session.userId;
}

export function visibleProperties(session: Session): Property[] {
  return store().properties.filter(p => inScope(session, p.agentId));
}

function visibleOwnerIds(session: Session): Set<string> {
  const props = new Set(visibleProperties(session).map(p => p.id));
  const fromUnits = store().units.filter(u => props.has(u.propertyId)).map(u => u.ownerId);
  return new Set([...fromUnits, ...store().owners.filter(o => inScope(session, o.agentId)).map(o => o.id)]);
}

function toRow(u: Unit): UnitRow {
  const s = store();
  const property = s.properties.find(p => p.id === u.propertyId);
  const owner = s.owners.find(o => o.id === u.ownerId);
  if (!property || !owner) throw notFound();
  return { ...u, property, owner: { id: owner.id, name: owner.name } };
}

export function listUnits(session: Session): Promise<UnitRow[]> {
  authorize(session, 'stock.view');
  const props = new Set(visibleProperties(session).map(p => p.id));
  return Promise.resolve(
    store().units.filter(u => props.has(u.propertyId)).map(toRow)
      .sort((a, b) => a.property.code.localeCompare(b.property.code) || a.label.localeCompare(b.label)),
  );
}

export function getUnit(session: Session, unitId: string): Promise<UnitRow> {
  authorize(session, 'stock.view');
  const unit = store().units.find(u => u.id === unitId);
  const row = unit && toRow(unit);
  if (!row || !inScope(session, row.property.agentId)) return Promise.reject(notFound());
  return Promise.resolve(row);
}

export interface PropertyDetail {
  property: Property;
  units: UnitRow[];
  owners: Owner[];
}

export function getProperty(session: Session, code: string): Promise<PropertyDetail> {
  authorize(session, 'stock.view');
  const property = store().properties.find(p => p.code === code);
  if (!property || !inScope(session, property.agentId)) return Promise.reject(notFound());
  const units = store().units.filter(u => u.propertyId === property.id).map(toRow);
  const ownerIds = new Set(units.map(u => u.ownerId));
  return Promise.resolve({ property, units, owners: store().owners.filter(o => ownerIds.has(o.id)) });
}

export function createProperty(session: Session, input: PropertyInput & UnitInput): Promise<Property> {
  authorize(session, 'stock.manage');
  const s = store();
  if (!visibleOwnerIds(session).has(input.ownerId)) return Promise.reject(notFound());
  const property: Property = { id: nextId('p'), code: nextPropertyCode(s.properties.map(p => p.code)), name: input.name, type: input.type, location: input.location, province: input.province, deed: input.deed, agentId: session.userId, createdAt: today() };
  s.properties.push(property);
  s.units.push(unitFrom(property.id, input));
  audit(session, 'property.create', 'property', property.id);
  return Promise.resolve(property);
}

function unitFrom(propertyId: string, input: UnitInput): Unit {
  return { id: nextId('u'), propertyId, label: input.label, bedrooms: input.bedrooms, areaSqm: input.areaSqm, landSqWah: input.landSqWah ?? null, ownerId: input.ownerId, salePrice: input.salePrice ?? null, rentPrice: input.rentPrice ?? null, status: input.status, commission: input.commission, exclusive: input.exclusive, leaseEnd: null, note: input.note };
}

export function addUnit(session: Session, propertyId: string, input: UnitInput): Promise<Unit> {
  authorize(session, 'stock.manage');
  const property = store().properties.find(p => p.id === propertyId);
  if (!property || !inScope(session, property.agentId) || !visibleOwnerIds(session).has(input.ownerId)) return Promise.reject(notFound());
  if (store().units.some(u => u.propertyId === propertyId && u.label === input.label)) return Promise.reject(new Error('UNIT_TAKEN'));
  const unit = unitFrom(propertyId, input);
  store().units.push(unit);
  audit(session, 'unit.create', 'unit', unit.id);
  return Promise.resolve(unit);
}

export function updateUnitStatus(session: Session, unitId: string, status: UnitStatus, leaseEnd: string | null): Promise<void> {
  authorize(session, 'stock.manage');
  const unit = store().units.find(u => u.id === unitId);
  const property = unit && store().properties.find(p => p.id === unit.propertyId);
  if (!unit || !property || !inScope(session, property.agentId)) return Promise.reject(notFound());
  unit.status = status;
  unit.leaseEnd = status === 'rented' ? leaseEnd : null;
  audit(session, 'unit.status', 'unit', unit.id);
  return Promise.resolve();
}

/* ---------- เจ้าของทรัพย์ ---------- */

export interface OwnerRow extends Owner {
  units: UnitRow[];
}

export function listOwners(session: Session): Promise<OwnerRow[]> {
  authorize(session, 'owners.view');
  const ids = visibleOwnerIds(session);
  const props = new Set(visibleProperties(session).map(p => p.id));
  const units = store().units.filter(u => props.has(u.propertyId));
  return Promise.resolve(store().owners.filter(o => ids.has(o.id)).map(o => ({ ...o, units: units.filter(u => u.ownerId === o.id).map(toRow) })));
}

export async function getOwner(session: Session, id: string): Promise<OwnerRow> {
  const owner = (await listOwners(session)).find(o => o.id === id);
  if (!owner) throw notFound();
  return owner;
}

export function createOwner(session: Session, input: OwnerInput): Promise<Owner> {
  authorize(session, 'owners.manage');
  const owner: Owner = { id: nextId('o'), ...input, agentId: session.userId };
  store().owners.push(owner);
  audit(session, 'owner.create', 'owner', owner.id);
  return Promise.resolve(owner);
}

export async function updateOwner(session: Session, id: string, input: OwnerInput): Promise<void> {
  authorize(session, 'owners.manage');
  await getOwner(session, id);
  const owner = store().owners.find(o => o.id === id);
  if (!owner) throw notFound();
  Object.assign(owner, input);
  audit(session, 'owner.update', 'owner', id);
}

/* ---------- ลูกค้า ---------- */

export function listClients(session: Session): Promise<Client[]> {
  authorize(session, 'clients.manage');
  return Promise.resolve(store().clients.filter(c => inScope(session, c.agentId)));
}

export function createClient(session: Session, input: ClientInput): Promise<Client> {
  authorize(session, 'clients.manage');
  const client: Client = { id: nextId('c'), ...input, agentId: session.userId };
  store().clients.push(client);
  audit(session, 'client.create', 'client', client.id);
  return Promise.resolve(client);
}
