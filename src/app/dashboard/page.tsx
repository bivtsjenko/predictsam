"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getUserBets, getUserSettlements } from "@/lib/firestore/markets";
import { getMarket } from "@/lib/firestore/markets";
import { getGroup } from "@/lib/firestore/groups";
import { currencySymbol } from "@/lib/currency";
import { SettlementSummary } from "@/components/settlement-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OddsBar } from "@/components/odds-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Bet, Currency, Market, Settlement } from "@/types";

export default function DashboardPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [markets, setMarkets] = useState<Record<string, Market>>({});
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [groupCurrencies, setGroupCurrencies] = useState<Record<string, Currency>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    async function fetchData() {
      try {
        const [userBets, userSettlements] = await Promise.all([
          getUserBets(user!.uid),
          getUserSettlements(user!.uid),
        ]);

        setBets(userBets);
        setSettlements(userSettlements);

        // Fetch unique markets for bets
        const marketIds = [...new Set(userBets.map((b) => b.marketId))];
        const marketDocs = await Promise.all(
          marketIds.map((id) => getMarket(id))
        );
        const marketMap: Record<string, Market> = {};
        marketDocs.forEach((m) => {
          if (m) marketMap[m.id!] = m;
        });
        setMarkets(marketMap);

        // Fetch group currencies
        const groupIds = [...new Set(userBets.map((b) => b.groupId))];
        const groupDocs = await Promise.all(
          groupIds.map((id) => getGroup(id))
        );
        const currencyMap: Record<string, Currency> = {};
        groupDocs.forEach((g) => {
          if (g?.id) currencyMap[g.id] = g.currency || "EUR";
        });
        setGroupCurrencies(currencyMap);
      } catch {
        // errors handled silently
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, authLoading, router]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const activeBets = bets.filter((b) => {
    const market = markets[b.marketId];
    return market && market.status === "open";
  });

  const pendingSettlements = settlements.filter((s) => !s.settled);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">
        Welcome, {userProfile?.displayName || "Trader"}
      </h1>

      {/* Active Bets */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Active Bets</h2>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : activeBets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No active bets. Browse your groups to place bets.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeBets.map((bet) => {
              const market = markets[bet.marketId];
              if (!market) return null;
              return (
                <Link
                  key={bet.id}
                  href={`/groups/${bet.groupId}/markets/${bet.marketId}`}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm leading-tight line-clamp-2">
                        {market.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            bet.side === "yes"
                              ? "border-emerald-500 text-emerald-600"
                              : "border-rose-500 text-rose-600"
                          )}
                        >
                          {bet.side.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium">
                          {currencySymbol(groupCurrencies[bet.groupId])}{bet.amount.toFixed(2)}
                        </span>
                      </div>
                      <OddsBar
                        yesAmount={market.totalYesAmount}
                        noAmount={market.totalNoAmount}
                        size="sm"
                      />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending Settlements */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pending Settlements</h2>
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : pendingSettlements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No pending settlements.</p>
            </CardContent>
          </Card>
        ) : (
          <SettlementSummary
            settlements={pendingSettlements}
            currentUserId={user!.uid}
          />
        )}
      </section>
    </div>
  );
}
