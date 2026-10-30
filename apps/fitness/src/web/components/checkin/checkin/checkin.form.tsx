'use client';

import { formatThaiDate } from '@/api/lib/utils/utils/utils';
import { Camera, CircleAlert, Check, ScanLine, X } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CheckInState } from '@/api/actions/checkin/checkin/checkin.actions';
import { checkInAction } from '@/api/actions/checkin/checkin/checkin.actions';

/** BarcodeDetector ยังไม่อยู่ใน lib.dom ของ TypeScript — ประกาศเฉพาะส่วนที่ใช้ */
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const noop = () => () => undefined;
function useCanScan() {
  return useSyncExternalStore(noop, () => 'BarcodeDetector' in window && 'mediaDevices' in navigator, () => false);
}

/** สแกน QR บัตรสมาชิกด้วยกล้อง (Chrome/Edge/Android รองรับ — Safari ใช้วิธีพิมพ์รหัสแทน) */
function CameraScanner({ onResult, onClose }: { onResult: (value: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    let stopped = false;
    const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
    const detector = new Detector({ formats: ['qr_code'] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async s => {
        stream = s;
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = s;
        await video.play();
        timer = window.setInterval(() => {
          detector
            .detect(video)
            .then(codes => {
              const value = codes[0]?.rawValue;
              if (value && !stopped) {
                stopped = true;
                onResult(value);
              }
            })
            .catch(() => undefined);
        }, 300);
      })
      .catch(() => {
        setError('เปิดกล้องไม่ได้ ตรวจสิทธิ์การใช้กล้องของเบราว์เซอร์ หรือพิมพ์รหัสแทน');
      });
    return () => {
      stopped = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach(t => {
        t.stop();
      });
    };
  }, [onResult]);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-bg p-3">
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
        <span aria-hidden className="absolute inset-[18%] rounded-2xl border-2 border-lime/80" />
      </div>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : <p className="text-sm text-muted">หันกล้องไปที่ QR บนบัตรสมาชิก ระบบจะเช็กอินให้ทันที</p>}
      <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line font-semibold">
        <X aria-hidden className="size-4" />ปิดกล้อง
      </button>
    </div>
  );
}

export function CheckInForm() {
  const [state, action, pending] = useActionState<CheckInState, FormData>(checkInAction, null);
  const [scanning, setScanning] = useState(false);
  const canScan = useCanScan();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onScan = useCallback((value: string) => {
    setScanning(false);
    if (inputRef.current) inputRef.current.value = value;
    formRef.current?.requestSubmit();
  }, []);
  const closeScanner = useCallback(() => {
    setScanning(false);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={action} className="rounded-2xl bg-gradient-to-br from-[#2a3a12] to-surface p-5 ring-1 ring-lime/25 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-lime text-bg"><ScanLine aria-hidden className="size-6" /></span>
          <div>
            <h2 className="font-display text-xl font-semibold">เช็กอินสมาชิก</h2>
            <p className="text-sm text-muted">สแกน QR จากบัตรสมาชิก หรือพิมพ์เบอร์โทร / รหัสสมาชิก</p>
          </div>
        </div>
        <label htmlFor="query" className="mt-5 mb-1.5 block text-sm font-semibold">เบอร์โทรหรือรหัสสมาชิก</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            id="query"
            name="query"
            required
            minLength={3}
            maxLength={60}
            autoComplete="off"
            inputMode="text"
            placeholder="เช่น 080-000-0101 หรือ FF-002318"
            aria-describedby="query-help"
            className="min-h-12 flex-1 rounded-xl border border-line bg-bg px-4 text-ink outline-none placeholder:text-faint focus:border-lime"
          />
          <button type="submit" disabled={pending} className="min-h-12 rounded-xl bg-lime px-6 font-semibold text-bg disabled:opacity-60">
            {pending ? 'กำลังตรวจ…' : 'เช็กอิน'}
          </button>
        </div>
        {canScan && !scanning && (
          <button type="button" onClick={() => {
            setScanning(true);
          }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-lime/40 px-4 font-semibold text-lime">
            <Camera aria-hidden className="size-5" />สแกน QR ด้วยกล้อง
          </button>
        )}
        <p id="query-help" className="mt-3 text-xs text-muted">ข้อมูลตัวอย่าง: ลอง 080-000-0101 (ใช้งาน), 080-000-0105 (หมดอายุ), 080-000-0104 (พักสมาชิก)</p>
      </form>

      {scanning && <CameraScanner onResult={onScan} onClose={closeScanner} />}

      <div aria-live="polite">
        {state?.ok === true && (
          <div className="ff-pop-in rounded-2xl border border-lime/40 bg-lime/10 p-5">
            <p className="flex items-center gap-2 font-semibold text-lime"><Check aria-hidden className="ff-pop size-5" />เช็กอินสำเร็จ</p>
            <Link href={`/members/${state.member.id}`} className="tap mt-2 inline-block font-display text-2xl font-semibold hover:underline">{state.member.name}</Link>
            <p className="text-sm text-muted">{state.member.code} · {state.member.packageName} · เหลือ {state.member.daysLeft} วัน (ถึง {formatThaiDate(state.member.expiresOn)})</p>
          </div>
        )}
        {state?.ok === false && (
          <div role="alert" className="ff-shake rounded-2xl border border-danger/40 bg-danger/10 p-5">
            <p className="flex items-center gap-2 font-semibold text-danger"><CircleAlert aria-hidden className="size-5" />เช็กอินไม่ได้</p>
            {state.member && <Link href={`/members/${state.member.id}`} className="tap mt-2 inline-block font-display text-2xl font-semibold hover:underline">{state.member.name}</Link>}
            <p className="mt-1 text-sm">{state.message}</p>
            {state.member && (state.code === 'expired' || state.code === 'frozen') && (
              <Link href={`/members/${state.member.id}`} className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-danger px-4 font-semibold text-bg">{state.code === 'expired' ? 'ต่ออายุให้สมาชิก' : 'จัดการการพัก'}</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
