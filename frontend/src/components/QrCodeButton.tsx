// QrCodeButton — renders a QR code (data: part id) in a popover.
import { useState, useEffect, useRef } from "react";
import { QrCode } from "lucide-react";
import QRCode from "qrcode";

interface Props {
  partId: string;
  label?: string;
  size?: number;
}

export default function QrCodeButton({ partId, label, size = 160 }: Props) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, partId, { width: size, margin: 1 }).catch(() => {});
    }
  }, [open, partId, size]);

  return (
    <div className="relative inline-block" dir="rtl">
      <button
        onClick={() => setOpen((o) => !o)}
        title="عرض رمز QR"
        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
      >
        <QrCode className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur p-4 shadow-2xl">
            <canvas ref={canvasRef} className="bg-white rounded" />
            <div className="text-center text-xs text-slate-300 mt-2 font-mono">{partId}</div>
            {label && <div className="text-center text-[11px] text-slate-500 mt-1">{label}</div>}
          </div>
        </>
      )}
    </div>
  );
}
