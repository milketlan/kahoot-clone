"use client";

import { useEffect, useState } from "react";

function formatCountdown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  return `${totalSeconds}s`;
}

export function CountdownBar({
  durationSeconds,
  isRunning,
  resetKey,
  onDone
}: {
  durationSeconds: number;
  isRunning: boolean;
  resetKey: string;
  onDone?: () => void;
}) {
  const [remainingMs, setRemainingMs] = useState(durationSeconds * 1000);
  
  // Keep the latest callback reference to avoid dependency tearing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDoneRef = import("react").then(r => r.useRef(onDone));
  const [doneRef, setDoneRef] = useState<any>(null);
  
  useEffect(() => {
     let ref: any;
     setDoneRef((current: any) => {
        if (!current) ref = { current: onDone };
        else { current.current = onDone; ref = current; }
        return ref;
     });
  }, [onDone]);

  useEffect(() => {
    setRemainingMs(durationSeconds * 1000);
  }, [durationSeconds, resetKey]);

  useEffect(() => {
    if (!isRunning) return;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const next = durationSeconds * 1000 - (Date.now() - startedAt);
      setRemainingMs(next);
      if (next <= 0) {
        clearInterval(timer);
        if (doneRef?.current) doneRef.current();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [durationSeconds, isRunning, resetKey, doneRef]);

  const percentage = Math.max(0, Math.min(100, (remainingMs / (durationSeconds * 1000)) * 100));

  return (
    <div className="space-y-3 w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between text-2xl font-black uppercase tracking-widest text-slate-600">
        <span>Time Left</span>
        <span className={remainingMs < 5000 ? "text-red-500 animate-pulse" : ""}>{formatCountdown(remainingMs)}</span>
      </div>
      <div className="h-6 overflow-hidden rounded-full bg-slate-300 shadow-inner">
        <div
          className={`h-full rounded-full transition-[width] duration-75 ${percentage < 20 ? 'bg-red-500' : 'bg-indigo-500'} shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
