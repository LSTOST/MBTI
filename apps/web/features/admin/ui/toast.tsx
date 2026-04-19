"use client";

import { Check, AlertTriangle, Info } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type Tone = "success" | "error" | "info";
type ToastMsg = { id: number; text: string; tone: Tone };

type ToastApi = {
  show: (text: string, tone?: Tone) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

/** 顶层挂在 Shell 里，整个后台共用。 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastMsg[]>([]);

  const show = useCallback((text: string, tone: Tone = "success") => {
    const id = Date.now() + Math.random();
    setQueue((q) => [...q, { id, text, tone }]);
    setTimeout(() => setQueue((q) => q.filter((m) => m.id !== id)), 2400);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (t) => show(t, "success"),
      error: (t) => show(t, "error"),
      info: (t) => show(t, "info"),
    }),
    [show],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2">
        {queue.map((m) => (
          <div
            key={m.id}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#1A1A24] px-4 py-2.5 text-[13px] text-[#F5F5F7] shadow-lg ring-1 ring-[#2A2A36]"
            role="status"
          >
            {m.tone === "success" ? (
              <Check className="h-4 w-4 text-[#34C759]" strokeWidth={2} />
            ) : m.tone === "error" ? (
              <AlertTriangle className="h-4 w-4 text-[#FF453A]" strokeWidth={2} />
            ) : (
              <Info className="h-4 w-4 text-[#7C5CFC]" strokeWidth={2} />
            )}
            <span>{m.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
