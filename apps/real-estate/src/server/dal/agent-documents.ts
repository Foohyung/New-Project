import 'server-only';
import { checkUpload, safeFileName, type DocCategory, type LinkType, type StoredDocument } from '@/features/documents/service';
import { audit } from '../agent/audit';
import { authorize, type Session } from '../agent/auth';
import { today } from '../agent/clock';
import { nextId, store } from '../agent/store';
import { inScope, notFound, visibleProperties } from './agent-stock';

/** คลังเอกสาร — เอกสารผูกกับทรัพย์/เจ้าของ/ลูกค้า/สัญญา ที่ agent มีสิทธิ์เท่านั้น (ข้อมูล Confidential §11) */

export interface LinkOption {
  type: LinkType;
  id: string;
  label: string;
}

/** สิ่งที่ผูกเอกสารได้ (อยู่ในขอบเขตของ agent) */
export function linkOptions(session: Session): LinkOption[] {
  authorize(session, 'documents.manage');
  const s = store();
  const props = visibleProperties(session);
  const propIds = new Set(props.map(p => p.id));
  const units = s.units.filter(u => propIds.has(u.propertyId));
  const ownerIds = new Set([...units.map(u => u.ownerId), ...s.owners.filter(o => inScope(session, o.agentId)).map(o => o.id)]);
  return [
    ...props.map(p => ({ type: 'property' as const, id: p.id, label: `${p.code} ${p.name}` })),
    ...s.owners.filter(o => ownerIds.has(o.id)).map(o => ({ type: 'owner' as const, id: o.id, label: o.name })),
    ...s.clients.filter(c => inScope(session, c.agentId)).map(c => ({ type: 'client' as const, id: c.id, label: c.name })),
    ...s.contracts.filter(k => inScope(session, k.agentId)).map(k => ({ type: 'contract' as const, id: k.id, label: k.number })),
  ];
}

export interface DocumentRow extends StoredDocument {
  linkLabel: string;
}

export function listDocuments(session: Session, filter: { category?: DocCategory; link?: string } = {}): Promise<DocumentRow[]> {
  authorize(session, 'documents.manage');
  const links = new Map(linkOptions(session).map(l => [`${l.type}:${l.id}`, l.label]));
  return Promise.resolve(
    store().documents
      .filter(d => inScope(session, d.agentId) && links.has(`${d.linkType}:${d.linkId}`))
      .filter(d => (!filter.category || d.category === filter.category) && (!filter.link || `${d.linkType}:${d.linkId}` === filter.link))
      .map(d => ({ ...d, linkLabel: links.get(`${d.linkType}:${d.linkId}`) ?? '' }))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || b.id.localeCompare(a.id)),
  );
}

export function uploadDocument(session: Session, meta: { name: string; category: DocCategory; linkType: LinkType; linkId: string; expiresAt: string | null }, bytes: Uint8Array): Promise<StoredDocument> {
  authorize(session, 'documents.manage');
  if (!linkOptions(session).some(l => l.type === meta.linkType && l.id === meta.linkId)) return Promise.reject(notFound());
  const check = checkUpload(bytes);
  if (!check.ok) return Promise.reject(new Error(`UPLOAD:${check.reason}`));
  const doc: StoredDocument = { id: nextId('f'), name: safeFileName(meta.name, check.mime), category: meta.category, linkType: meta.linkType, linkId: meta.linkId, mime: check.mime, size: bytes.byteLength, uploadedAt: today(), expiresAt: meta.expiresAt, agentId: session.userId };
  store().documents.push(doc);
  store().files.set(doc.id, bytes);
  audit(session, 'document.upload', 'document', doc.id);
  return Promise.resolve(doc);
}

/** อ่านไฟล์ (ตรวจสิทธิ์ทุกครั้ง และบันทึก audit การเปิดดูข้อมูลส่วนบุคคล) */
export async function getDocumentFile(session: Session, id: string): Promise<{ doc: StoredDocument; bytes: Uint8Array }> {
  const doc = (await listDocuments(session)).find(d => d.id === id);
  const bytes = doc && store().files.get(doc.id);
  if (!doc || !bytes) throw notFound();
  audit(session, 'document.view', 'document', id);
  return { doc, bytes };
}

export async function deleteDocument(session: Session, id: string): Promise<void> {
  const doc = (await listDocuments(session)).find(d => d.id === id);
  if (!doc) throw notFound();
  const s = store();
  s.documents = s.documents.filter(d => d.id !== id);
  s.files.delete(id);
  audit(session, 'document.delete', 'document', id);
}
