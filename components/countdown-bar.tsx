"use client";

import { useEffect, useState, useRef } from "react";

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
  
  const onDoneRef = useRef(onDone);
  
  useEffect(() => {
     onDoneRef.current = onDone;
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
        onDoneRef.current?.();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [durationSeconds, isRunning, resetKey]);

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
