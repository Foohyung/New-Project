'use client';

import { Download, LoaderCircle, Printer } from 'lucide-react';
import { useState } from 'react';
import { btn } from '@/web/components/ui/ui/ui';
import { toast } from '@/web/components/ui/ui/ui.toast';

export function PrintButton({ label = 'พิมพ์ใบเสร็จ', downloadable = true }: { label?: string; downloadable?: boolean }) {
  const [downloading, setDownloading] = useState(false);
  const print = () => {
    window.print();
  };
  const downloadPdf = async () => {
    const receipt = document.querySelector<HTMLElement>('[data-receipt-document]');
    if (!receipt) {
      toast('ไม่พบเอกสารใบเสร็จสำหรับดาวน์โหลด', 'error');
      return;
    }

    setDownloading(true);
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(receipt.querySelectorAll('img'), image => image.decode()));
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(receipt, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        windowWidth: Math.max(window.innerWidth, 800),
        onclone: clonedDocument => {
          clonedDocument.documentElement.dataset.theme = 'light';
          clonedDocument.documentElement.dataset.mode = 'light';
          const clonedReceipt = clonedDocument.querySelector<HTMLElement>('[data-receipt-document]');
          if (!clonedReceipt) throw new Error('Receipt element was not cloned');
          clonedReceipt.style.width = '793px';
          clonedReceipt.style.maxWidth = 'none';
          clonedReceipt.style.margin = '0';
          clonedReceipt.style.borderRadius = '0';
          clonedReceipt.style.boxShadow = 'none';
        },
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
      const margin = 10;
      const printableWidth = 210 - margin * 2;
      const printableHeight = 297 - margin * 2;
      const imageScale = printableWidth / canvas.width;
      const sourcePageHeight = Math.floor(printableHeight / imageScale);
      const pageCount = Math.ceil(canvas.height / sourcePageHeight);

      for (let page = 0; page < pageCount; page += 1) {
        const sourceY = page * sourcePageHeight;
        const sliceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const context = pageCanvas.getContext('2d');
        if (!context) throw new Error('Could not create PDF canvas context');
        context.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        if (page > 0) pdf.addPage();
        pdf.addImage(pageCanvas.toDataURL('image/jpeg', 0.94), 'JPEG', margin, margin, printableWidth, sliceHeight * imageScale);
      }

      const receiptNo = receipt.dataset.receiptNo?.replace(/[^a-zA-Z0-9_-]/g, '-') ?? 'receipt';
      pdf.save(`FitFlow-${receiptNo}.pdf`);
    } catch (error) {
      toast(error instanceof Error ? `สร้าง PDF ไม่สำเร็จ: ${error.message}` : 'สร้าง PDF ไม่สำเร็จ กรุณาลองใหม่', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={print} className={btn.secondary}>
        <Printer aria-hidden className="size-5" />
        {label}
      </button>
      {downloadable && (
        <button type="button" onClick={() => { void downloadPdf(); }} disabled={downloading} className={btn.primary}>
          {downloading ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : <Download aria-hidden className="size-5" />}
          {downloading ? 'กำลังสร้าง PDF…' : 'Download PDF'}
        </button>
      )}
    </div>
  );
}
