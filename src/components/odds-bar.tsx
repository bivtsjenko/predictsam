"use client";

import { cn } from "@/lib/utils";

interface OddsBarProps {
  yesAmount: number;
  noAmount: number;
  size?: "sm" | "md";
}

export function OddsBar({ yesAmount, noAmount, size = "md" }: OddsBarProps) {
  const total = yesAmount + noAmount;
  const yesPercent = total === 0 ? 50 : Math.round((yesAmount / total) * 100);
  const noPercent = 100 - yesPercent;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-emerald-600 dark:text-emerald-400">
          YES {yesPercent}%
        </span>
        <span className="font-medium text-rose-600 dark:text-rose-400">
          NO {noPercent}%
        </span>
      </div>
      <div
        className={cn(
          "w-full flex rounded-full overflow-hidden",
          size === "sm" ? "h-2" : "h-3"
        )}
      >
        <div
          className="bg-emerald-500 transition-all duration-300"
          style={{ width: `${yesPercent}%` }}
        />
        <div
          className="bg-rose-500 transition-all duration-300"
          style={{ width: `${noPercent}%` }}
        />
      </div>
    </div>
  );
}
