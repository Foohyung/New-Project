import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="px-4"><div className="mx-auto mt-10 max-w-md rounded-[26px] bg-cream p-6 text-center">
      <h1 className="font-display text-xl font-semibold">ไม่พบหน้านี้</h1>
      <p className="mt-2 text-sm text-muted">ลิงก์อาจไม่ถูกต้องหรือหน้านี้ถูกย้ายแล้ว</p>
      <Link href="/" className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-terra px-5 font-semibold text-cream">กลับหน้าแรก</Link>
    </div></main>
  );
}
