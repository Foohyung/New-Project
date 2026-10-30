import { addDays, bahtText, formatThaiDate } from '@repo/utils';

/**
 * แม่แบบสัญญา (pure) — รับข้อมูลทรัพย์/เจ้าของ/ลูกค้าที่ดึงจากระบบ + ช่องที่ agent กรอกเพิ่ม
 * แล้วคืนเป็นโครงสร้างข้อความ ให้หน้าเว็บแสดงเป็น A4 และไฮไลต์ช่องที่ยังว่าง
 */

export const CONTRACT_TYPES = ['lease', 'sale', 'agency'] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  lease: 'สัญญาเช่า',
  sale: 'สัญญาจะซื้อจะขาย',
  agency: 'สัญญาแต่งตั้งนายหน้า',
};
export const CONTRACT_TYPE_HINT: Record<ContractType, string> = {
  lease: 'ผู้ให้เช่า = เจ้าของ · ผู้เช่า = ลูกค้า',
  sale: 'ผู้จะขาย = เจ้าของ · ผู้จะซื้อ = ลูกค้า',
  agency: 'เจ้าของแต่งตั้ง agent เป็นนายหน้า',
};
export const CONTRACT_PREFIX: Record<ContractType, string> = { lease: 'L', sale: 'S', agency: 'A' };

export const isContractType = (v: unknown): v is ContractType => typeof v === 'string' && (CONTRACT_TYPES as readonly string[]).includes(v);

export interface ContractParty {
  name: string;
  idNumber: string;
  address: string;
}

export interface ContractContext {
  owner: ContractParty;
  /** ลูกค้า (ผู้เช่า/ผู้จะซื้อ) — สัญญาแต่งตั้งนายหน้าไม่ใช้ */
  client: ContractParty | null;
  agent: ContractParty & { license: string };
  property: { name: string; unitLabel: string; detail: string; location: string; deed: string };
}

/** ช่องที่ agent กรอกเอง — เงินเป็นสตางค์ วันที่ YYYY-MM-DD */
export interface ContractFields {
  place?: string;
  signDate?: string;
  startDate?: string;
  months?: number;
  rent?: number;
  deposit?: number;
  advance?: number;
  payDay?: number;
  price?: number;
  transferDate?: string;
  exclusive?: boolean;
  purpose?: string;
  commissionText?: string;
}
export type FieldKey = keyof ContractFields;
export type FieldKind = 'text' | 'date' | 'money' | 'number' | 'toggle';

export const FIELD_SPECS: Record<ContractType, { key: FieldKey; label: string; kind: FieldKind; hint?: string }[]> = {
  lease: [
    { key: 'place', label: 'ทำที่', kind: 'text' },
    { key: 'signDate', label: 'วันทำสัญญา', kind: 'date' },
    { key: 'startDate', label: 'วันเริ่มเช่า', kind: 'date' },
    { key: 'months', label: 'ระยะเวลาเช่า (เดือน)', kind: 'number' },
    { key: 'rent', label: 'ค่าเช่าต่อเดือน (บาท)', kind: 'money' },
    { key: 'payDay', label: 'ชำระทุกวันที่', kind: 'number', hint: '1–28 ของเดือน' },
    { key: 'deposit', label: 'เงินประกัน (บาท)', kind: 'money', hint: 'ปกติ 2 เดือน' },
    { key: 'advance', label: 'ค่าเช่าล่วงหน้า (บาท)', kind: 'money' },
    { key: 'purpose', label: 'ใช้เพื่อ', kind: 'text' },
  ],
  sale: [
    { key: 'place', label: 'ทำที่', kind: 'text' },
    { key: 'signDate', label: 'วันทำสัญญา', kind: 'date' },
    { key: 'price', label: 'ราคาซื้อขาย (บาท)', kind: 'money' },
    { key: 'deposit', label: 'เงินมัดจำ (บาท)', kind: 'money' },
    { key: 'transferDate', label: 'วันโอนกรรมสิทธิ์', kind: 'date' },
  ],
  agency: [
    { key: 'place', label: 'ทำที่', kind: 'text' },
    { key: 'signDate', label: 'วันทำสัญญา', kind: 'date' },
    { key: 'purpose', label: 'แต่งตั้งเพื่อ', kind: 'text', hint: 'เช่น ขาย / ให้เช่า' },
    { key: 'price', label: 'ราคาไม่ต่ำกว่า (บาท)', kind: 'money' },
    { key: 'startDate', label: 'เริ่มแต่งตั้ง', kind: 'date' },
    { key: 'months', label: 'ระยะเวลา (เดือน)', kind: 'number' },
    { key: 'commissionText', label: 'ค่าบำเหน็จที่ตกลง', kind: 'text' },
    { key: 'exclusive', label: 'แต่งตั้งรายเดียว (Exclusive)', kind: 'toggle' },
  ],
};

/** ข้อความหนึ่งช่วง: ข้อความธรรมดา หรือช่องข้อมูล (value = null คือยังว่าง) */
export type Segment = string | { key: string; label: string; value: string | null };

export interface ContractDocument {
  type: ContractType;
  title: string;
  number: string;
  heading: Segment[];
  parties: Segment[];
  clauses: Segment[][];
  signers: { role: string; name: string }[];
  /** ชื่อช่องที่ยังว่าง */
  missing: string[];
}

/** บวกเดือนแบบปฏิทิน (31 ม.ค. + 1 เดือน = 28/29 ก.พ.) */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${String(ny)}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** วันสิ้นสุดสัญญาเช่า = วันเริ่ม + n เดือน - 1 วัน */
export function leaseEndDate(start: string, months: number): string {
  return addDays(addMonths(start, months), -1);
}

export const moneyText = (satang: number) => `${(satang / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท (${bahtText(satang)})`;
const date = (v: string | undefined) => (v ? formatThaiDate(v, 'long') : null);
const money = (v: number | undefined) => (v === undefined ? null : moneyText(v));
const text = (v: string | number | undefined) => (v === undefined || v === '' ? null : String(v));

export function buildContract(type: ContractType, ctx: ContractContext, f: ContractFields, number: string): ContractDocument {
  const missing: string[] = [];
  const field = (key: string, label: string, value: string | null): Segment => {
    if (value === null) missing.push(label);
    return { key, label, value };
  };
  const fixed = (key: string, label: string, value: string) => field(key, label, value.trim() ? value : null);
  const { owner, client, agent, property } = ctx;
  const whole = ['ทั้งหลัง', 'แปลงเดียว', '-'].includes(property.unitLabel);
  const propertyText = `${property.name}${whole ? '' : ` ห้อง/ยูนิต ${property.unitLabel}`} (${property.detail}) ตั้งอยู่ที่ ${property.location} เอกสารสิทธิ์ ${property.deed}`;

  const party = (who: ContractParty | null, prefix: string, label: string): Segment[] => [
    fixed(`${prefix}.name`, `ชื่อ${label}`, who?.name ?? ''),
    ' เลขประจำตัว ',
    fixed(`${prefix}.id`, `เลขประจำตัว${label}`, who?.idNumber ?? ''),
    ' ที่อยู่ ',
    fixed(`${prefix}.address`, `ที่อยู่${label}`, who?.address ?? ''),
  ];

  const heading: Segment[] = ['ทำที่ ', field('place', 'สถานที่ทำสัญญา', text(f.place)), ' วันที่ ', field('signDate', 'วันทำสัญญา', date(f.signDate))];
  const closing: Segment[] = ['คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญานี้โดยตลอดแล้ว เห็นว่าถูกต้องตรงตามเจตนา จึงลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน'];

  if (type === 'lease') {
    const end = f.startDate && f.months ? leaseEndDate(f.startDate, f.months) : undefined;
    return {
      type, number, title: CONTRACT_TYPE_LABEL.lease, heading, missing,
      parties: ['สัญญานี้ทำขึ้นระหว่าง ', ...party(owner, 'owner', 'ผู้ให้เช่า'), ' ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้ให้เช่า” ฝ่ายหนึ่ง กับ ', ...party(client, 'client', 'ผู้เช่า'), ' ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้เช่า” อีกฝ่ายหนึ่ง ทั้งสองฝ่ายตกลงทำสัญญากันดังต่อไปนี้'],
      clauses: [
        ['ข้อ 1 ผู้ให้เช่าตกลงให้เช่าและผู้เช่าตกลงเช่าทรัพย์ ', fixed('property', 'ทรัพย์', propertyText), ' เพื่อใช้เป็น', field('purpose', 'วัตถุประสงค์การเช่า', text(f.purpose))],
        ['ข้อ 2 กำหนดระยะเวลาเช่า ', field('months', 'ระยะเวลาเช่า', f.months ? `${String(f.months)} เดือน` : null), ' เริ่มตั้งแต่วันที่ ', field('startDate', 'วันเริ่มเช่า', date(f.startDate)), ' ถึงวันที่ ', field('endDate', 'วันสิ้นสุดการเช่า', date(end))],
        ['ข้อ 3 ผู้เช่าตกลงชำระค่าเช่าเดือนละ ', field('rent', 'ค่าเช่า', money(f.rent)), ' ภายในวันที่ ', field('payDay', 'วันชำระค่าเช่า', text(f.payDay)), ' ของทุกเดือน หากชำระล่าช้าเกิน 7 วัน ผู้ให้เช่ามีสิทธิ์บอกเลิกสัญญาได้'],
        ['ข้อ 4 ในวันทำสัญญานี้ ผู้เช่าได้วางเงินประกันการเช่าเป็นจำนวน ', field('deposit', 'เงินประกัน', money(f.deposit)), ' และชำระค่าเช่าล่วงหน้า ', field('advance', 'ค่าเช่าล่วงหน้า', money(f.advance)), ' ผู้ให้เช่าจะคืนเงินประกันภายใน 30 วันนับแต่สัญญาสิ้นสุดและส่งมอบทรัพย์คืน หลังหักค่าเสียหายหรือค่าใช้จ่ายค้างชำระ (ถ้ามี)'],
        ['ข้อ 5 ผู้เช่าจะไม่นำทรัพย์ที่เช่าออกให้ผู้อื่นเช่าช่วง ไม่ดัดแปลงต่อเติมโดยไม่ได้รับอนุญาตเป็นหนังสือ และจะดูแลรักษาทรัพย์ที่เช่าเสมือนวิญญูชนพึงรักษาทรัพย์สินของตนเอง'],
        ['ข้อ 6 ค่าน้ำประปา ค่าไฟฟ้า ค่าอินเทอร์เน็ต และค่าใช้จ่ายจากการใช้ทรัพย์ที่เช่า ผู้เช่าเป็นผู้ชำระ ส่วนภาษีที่ดินและสิ่งปลูกสร้าง ผู้ให้เช่าเป็นผู้ชำระ'],
        closing,
      ],
      signers: [{ role: 'ผู้ให้เช่า', name: owner.name }, { role: 'ผู้เช่า', name: client?.name ?? '' }],
    };
  }

  if (type === 'sale') {
    const balance = f.price !== undefined && f.deposit !== undefined ? f.price - f.deposit : undefined;
    return {
      type, number, title: CONTRACT_TYPE_LABEL.sale, heading, missing,
      parties: ['สัญญานี้ทำขึ้นระหว่าง ', ...party(owner, 'owner', 'ผู้จะขาย'), ' ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้จะขาย” ฝ่ายหนึ่ง กับ ', ...party(client, 'client', 'ผู้จะซื้อ'), ' ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้จะซื้อ” อีกฝ่ายหนึ่ง ทั้งสองฝ่ายตกลงทำสัญญากันดังต่อไปนี้'],
      clauses: [
        ['ข้อ 1 ผู้จะขายตกลงจะขาย และผู้จะซื้อตกลงจะซื้อทรัพย์ ', fixed('property', 'ทรัพย์', propertyText), ' ในราคา ', field('price', 'ราคาซื้อขาย', money(f.price))],
        ['ข้อ 2 ในวันทำสัญญานี้ ผู้จะซื้อได้ชำระเงินมัดจำจำนวน ', field('deposit', 'เงินมัดจำ', money(f.deposit)), ' ส่วนที่เหลือจำนวน ', field('balance', 'ยอดคงเหลือ', balance !== undefined && balance >= 0 ? moneyText(balance) : null), ' ผู้จะซื้อจะชำระในวันจดทะเบียนโอนกรรมสิทธิ์ ณ สำนักงานที่ดิน'],
        ['ข้อ 3 คู่สัญญาตกลงไปจดทะเบียนโอนกรรมสิทธิ์ภายในวันที่ ', field('transferDate', 'วันโอนกรรมสิทธิ์', date(f.transferDate)), ' ค่าธรรมเนียมการโอนคู่สัญญาออกฝ่ายละครึ่ง ส่วนภาษีเงินได้ ภาษีธุรกิจเฉพาะหรืออากรแสตมป์ ผู้จะขายเป็นผู้ชำระ'],
        ['ข้อ 4 ผู้จะขายรับรองว่าทรัพย์ไม่มีภาระผูกพันใด ๆ ในวันโอน หากมีการจำนองอยู่ ผู้จะขายจะไถ่ถอนให้แล้วเสร็จก่อนหรือในวันโอนกรรมสิทธิ์'],
        ['ข้อ 5 หากผู้จะซื้อผิดสัญญา ผู้จะขายมีสิทธิ์ริบเงินมัดจำทั้งหมด หากผู้จะขายผิดสัญญา ผู้จะขายต้องคืนเงินมัดจำพร้อมเบี้ยปรับเท่ากับจำนวนเงินมัดจำ'],
        closing,
      ],
      signers: [{ role: 'ผู้จะขาย', name: owner.name }, { role: 'ผู้จะซื้อ', name: client?.name ?? '' }],
    };
  }

  return {
    type, number, title: CONTRACT_TYPE_LABEL.agency, heading, missing,
    parties: ['สัญญานี้ทำขึ้นระหว่าง ', ...party(owner, 'owner', 'ผู้แต่งตั้ง'), ' ซึ่งต่อไปในสัญญานี้เรียกว่า “ผู้แต่งตั้ง” ฝ่ายหนึ่ง กับ ', ...party(agent, 'agent', 'นายหน้า'), ' ทะเบียนนายหน้า ', fixed('agent.license', 'ทะเบียนนายหน้า', agent.license), ' ซึ่งต่อไปในสัญญานี้เรียกว่า “นายหน้า” อีกฝ่ายหนึ่ง'],
    clauses: [
      ['ข้อ 1 ผู้แต่งตั้งตกลงแต่งตั้งนายหน้าให้เป็นผู้ชี้ช่องและจัดการให้ได้', field('purpose', 'วัตถุประสงค์การแต่งตั้ง', text(f.purpose)), 'ทรัพย์ ', fixed('property', 'ทรัพย์', propertyText), ' ในราคาไม่ต่ำกว่า ', field('price', 'ราคาขั้นต่ำ', money(f.price))],
      ['ข้อ 2 การแต่งตั้งนี้เป็นแบบ', field('exclusive', 'รูปแบบการแต่งตั้ง', f.exclusive === undefined ? null : f.exclusive ? 'ผู้แต่งตั้งรายเดียว (Exclusive) ผู้แต่งตั้งจะไม่แต่งตั้งนายหน้ารายอื่นในระยะเวลาสัญญา' : 'ไม่ผูกขาด (Open)'), ' มีกำหนด ', field('months', 'ระยะเวลาแต่งตั้ง', f.months ? `${String(f.months)} เดือน` : null), ' นับแต่วันที่ ', field('startDate', 'วันเริ่มแต่งตั้ง', date(f.startDate))],
      ['ข้อ 3 เมื่อมีการทำสัญญาซื้อขายหรือเช่าสำเร็จ ผู้แต่งตั้งตกลงชำระค่าบำเหน็จนายหน้า ', field('commissionText', 'ค่าบำเหน็จ', text(f.commissionText)), ' ภายในวันที่จดทะเบียนโอนกรรมสิทธิ์หรือวันทำสัญญาเช่า'],
      ['ข้อ 4 หากภายในระยะเวลาตามสัญญา หรือภายใน 6 เดือนหลังสัญญาสิ้นสุด ผู้แต่งตั้งขายหรือให้เช่าทรัพย์แก่บุคคลที่นายหน้าแนะนำ ให้ถือว่านายหน้ามีสิทธิ์ได้รับค่าบำเหน็จเต็มจำนวน'],
      ['ข้อ 5 นายหน้ามีหน้าที่ลงประกาศ ถ่ายภาพ พาผู้สนใจเข้าชม และรายงานความคืบหน้าให้ผู้แต่งตั้งทราบอย่างสม่ำเสมอ โดยค่าใช้จ่ายในการโฆษณาเป็นของนายหน้า'],
      closing,
    ],
    signers: [{ role: 'ผู้แต่งตั้ง', name: owner.name }, { role: 'นายหน้า', name: agent.name }],
  };
}

/** ค่าตั้งต้นที่ดึงจากยูนิต — agent แก้ต่อได้ */
export function contractDefaults(type: ContractType, unit: { salePrice: number | null; rentPrice: number | null; exclusive: boolean; commissionText: string }, today: string): ContractFields {
  const base: ContractFields = { place: 'สำนักงาน BaanHub สาขาพญาไท กรุงเทพมหานคร', signDate: today };
  if (type === 'lease') {
    const rent = unit.rentPrice ?? undefined;
    return { ...base, startDate: addDays(today, 7), months: 12, rent, payDay: 5, deposit: rent && rent * 2, advance: rent, purpose: 'ที่อยู่อาศัย' };
  }
  if (type === 'sale') {
    const price = unit.salePrice ?? undefined;
    // มัดจำทั่วไป 10% ปัดเป็นหลักพันบาท
    return { ...base, price, deposit: price && Math.round(price / 10 / 100_000) * 100_000, transferDate: addDays(today, 45) };
  }
  return { ...base, purpose: unit.salePrice ? 'ขาย' : 'ให้เช่า', price: unit.salePrice ?? unit.rentPrice ?? undefined, startDate: today, months: 6, commissionText: unit.commissionText, exclusive: unit.exclusive };
}
