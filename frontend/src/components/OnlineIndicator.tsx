// ═══════════════════════════════════════════════════════════════
//   OnlineIndicator.tsx — small badge that polls /api/health every 30s
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { pingBackend } from "../services/apiClient";

export default function OnlineIndicator() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const ok = await pingBackend();
      if (!cancelled) setBackendOk(ok);
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const isOnline = online && backendOk !== false;
  const label = isOnline ? "متصل" : "غير متصل — وضع التخزين المؤقت";

  return (
    <div
      title={isOnline ? "Backend reachable" : "Offline / cached mode"}
      className={
        "flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold border " +
        (isOnline
          ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
          : "bg-amber-500/15 text-amber-300 border-amber-400/30")
      }
      dir="rtl"
    >
      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );
}
