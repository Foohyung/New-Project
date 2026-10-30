'use client';

/** ข้อความกลาง ๆ ไม่เปิดเผยรายละเอียด error (§4.3) */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="px-4"><div role="alert" className="mx-auto mt-10 max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
      <h1 className="text-xl font-semibold">โหลดข้อมูลไม่สำเร็จ</h1>
      <p className="mt-2 text-sm text-muted">ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้ง ถ้ายังไม่ได้ให้แจ้งผู้ดูแลระบบ</p>
      <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-full bg-accent px-5 font-semibold text-white">ลองใหม่</button>
    </div></main>
  );
}
