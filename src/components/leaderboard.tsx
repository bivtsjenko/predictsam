"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Bet, Market } from "@/types";

interface LeaderboardProps {
  bets: Bet[];
  markets: Market[];
}

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  totalPnL: number;
}

export function Leaderboard({ bets, markets }: LeaderboardProps) {
  const entries = useMemo(() => {
    const resolvedMarkets = markets.filter((m) => m.status === "resolved");
    const resolvedMarketMap = new Map(resolvedMarkets.map((m) => [m.id, m]));

    const userPnL: Record<string, { displayName: string; pnl: number }> = {};

    for (const bet of bets) {
      const market = resolvedMarketMap.get(bet.marketId);
      if (!market) continue;

      if (!userPnL[bet.userId]) {
        userPnL[bet.userId] = { displayName: bet.userDisplayName, pnl: 0 };
      }

      const totalPool = market.totalYesAmount + market.totalNoAmount;
      const winningSideTotal =
        market.outcome === "yes"
          ? market.totalYesAmount
          : market.totalNoAmount;

      if (bet.side === market.outcome && winningSideTotal > 0) {
        const payout = (bet.amount / winningSideTotal) * totalPool;
        userPnL[bet.userId].pnl += payout - bet.amount;
      } else {
        userPnL[bet.userId].pnl -= bet.amount;
      }
    }

    const leaderboard: LeaderboardEntry[] = Object.entries(userPnL).map(
      ([userId, data]) => ({
        userId,
        displayName: data.displayName,
        totalPnL: Math.round(data.pnl * 100) / 100,
      })
    );

    leaderboard.sort((a, b) => b.totalPnL - a.totalPnL);
    return leaderboard;
  }, [bets, markets]);

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No resolved markets yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Leaderboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div
              key={entry.userId}
              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-muted-foreground w-6 text-center">
                  #{idx + 1}
                </span>
                <span className="text-sm font-medium">
                  {entry.displayName}
                </span>
              </div>
              <span
                className={cn(
                  "text-sm font-bold",
                  entry.totalPnL > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : entry.totalPnL < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground"
                )}
              >
                {entry.totalPnL >= 0 ? "+" : ""}${entry.totalPnL.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
