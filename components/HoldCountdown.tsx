"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface HoldCountdownProps {
  initialSeconds: number;
  onExpire?: () => void;
}

export default function HoldCountdown({ initialSeconds, onExpire }: HoldCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (onExpire) onExpire();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onExpire) onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Total reservation duration is 600 seconds (10 minutes)
  const percentage = Math.max(0, Math.min(100, (secondsLeft / 600) * 100));

  const isCritical = secondsLeft <= 120; // 2 minutes or less
  const isWarning = secondsLeft <= 300 && !isCritical; // 5 minutes or less

  return (
    <div
      className={`p-4 rounded-2xl border transition-all ${
        isCritical
          ? "bg-red-50/80 border-red-200 text-red-900"
          : isWarning
          ? "bg-amber-50/80 border-amber-200 text-amber-900"
          : "bg-surface border-primary-200/60 text-primary"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {isCritical ? (
            <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse flex-shrink-0" />
          ) : (
            <Clock className="w-5 h-5 text-accent flex-shrink-0" />
          )}
          <div>
            <h4 className="text-sm font-semibold">
              {secondsLeft > 0 ? "Tickets Reserved for 10 Minutes" : "Reservation Hold Expired"}
            </h4>
            <p className="text-xs opacity-80">
              {secondsLeft > 0
                ? "Complete checkout before timer ends to guarantee your tickets."
                : "Your reserved tickets have been released back to the event pool."}
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <span
            className={`font-mono font-bold text-2xl tracking-wider ${
              isCritical ? "text-red-600" : isWarning ? "text-amber-700" : "text-primary"
            }`}
          >
            {formattedTime}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {secondsLeft > 0 && (
        <div className="w-full bg-black/10 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-accent"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}
