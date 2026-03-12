"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useMarket, useMarketBets } from "@/hooks/use-markets";
import { getMarketSettlements } from "@/lib/firestore/markets";
import { getGroup } from "@/lib/firestore/groups";
import { currencySymbol } from "@/lib/currency";
import { OddsBar } from "@/components/odds-bar";
import { BetPlacement } from "@/components/bet-placement";
import { MarketResolution } from "@/components/market-resolution";
import { SettlementSummary } from "@/components/settlement-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Share2, Copy } from "lucide-react";
import type { Currency, Settlement } from "@/types";

export default function MarketDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const groupId = params.groupId as string;
  const marketId = params.marketId as string;

  const { market, loading: marketLoading } = useMarket(marketId);
  const { bets, loading: betsLoading } = useMarketBets(marketId);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementsLoading, setSettlementsLoading] = useState(true);
  const [currency, setCurrency] = useState<Currency>("EUR");

  useEffect(() => {
    async function fetchGroup() {
      try {
        const g = await getGroup(groupId);
        if (g?.currency) setCurrency(g.currency);
      } catch {
        // default currency
      }
    }
    if (groupId) fetchGroup();
  }, [groupId]);

  useEffect(() => {
    async function fetchSettlements() {
      if (!user) {
        setSettlementsLoading(false);
        return;
      }
      try {
        const s = await getMarketSettlements(marketId);
        setSettlements(s);
      } catch {
        // handle silently
      } finally {
        setSettlementsLoading(false);
      }
    }
    if (marketId) fetchSettlements();
  }, [marketId, market?.status, user]);

  if (marketLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        Market not found.
      </div>
    );
  }

  const marketUrl = typeof window !== "undefined" ? window.location.href : "";

  async function handleShare() {
    const shareData = {
      title: market!.title,
      text: `Place your bet: ${market!.title}`,
      url: marketUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(marketUrl);
      toast.success("Link copied!");
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(marketUrl);
    toast.success("Link copied!");
  }

  const resolutionDate = market.resolutionDate?.toDate
    ? market.resolutionDate.toDate()
    : new Date(market.resolutionDate as unknown as string);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <h1 className="text-2xl font-bold flex-1">{market.title}</h1>
              <Badge
                variant={market.status === "resolved" ? "secondary" : "outline"}
                className={cn(
                  market.status === "open" &&
                    "border-emerald-500 text-emerald-600 dark:text-emerald-400",
                  market.status === "closed" &&
                    "border-amber-500 text-amber-600 dark:text-amber-400"
                )}
              >
                {market.status.charAt(0).toUpperCase() + market.status.slice(1)}
              </Badge>
            </div>
            {market.description && (
              <p className="text-muted-foreground">{market.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Resolves: {resolutionDate.toLocaleDateString()}
              </span>
              <span>
                Volume: {currencySymbol(currency)}{(market.totalYesAmount + market.totalNoAmount).toFixed(2)}
              </span>
              <div className="ml-auto flex gap-1">
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-3.5 w-3.5 mr-1" />
                  Share
                </Button>
              </div>
            </div>
            {market.status === "resolved" && market.outcome && (
              <div
                className={cn(
                  "rounded-md p-3 text-sm font-medium",
                  market.outcome === "yes"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                )}
              >
                Resolved: {market.outcome.toUpperCase()}
              </div>
            )}
          </div>

          <OddsBar
            yesAmount={market.totalYesAmount}
            noAmount={market.totalNoAmount}
            size="md"
          />

          <Separator />

          {/* Bet History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bet History</CardTitle>
            </CardHeader>
            <CardContent>
              {betsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : bets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No bets placed yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 font-medium">User</th>
                        <th className="text-left py-2 font-medium">Side</th>
                        <th className="text-right py-2 font-medium">Amount</th>
                        <th className="text-right py-2 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bets.map((bet) => {
                        const placedAt = bet.placedAt?.toDate
                          ? bet.placedAt.toDate()
                          : new Date(bet.placedAt as unknown as string);
                        return (
                          <tr key={bet.id} className="border-b last:border-0">
                            <td className="py-2">{bet.userDisplayName}</td>
                            <td className="py-2">
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
                            </td>
                            <td className="py-2 text-right font-medium">
                              {currencySymbol(currency)}{bet.amount.toFixed(2)}
                            </td>
                            <td className="py-2 text-right text-muted-foreground">
                              {placedAt.toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Settlements (if resolved) */}
          {market.status === "resolved" && user && !settlementsLoading && (
            <SettlementSummary
              settlements={settlements}
              currentUserId={user.uid}
              currency={currency}
            />
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-20">
            {!user ? (
              <Card>
                <CardContent className="py-6 text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sign in to place a bet
                  </p>
                  <Link href={`/login?redirect=/groups/${groupId}/markets/${marketId}`}>
                    <Button className="w-full">Sign In</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                {market.status === "open" && <BetPlacement market={market} currency={currency} />}
                {(market.status === "open" || market.status === "closed") && (
                  <div className="mt-4">
                    <MarketResolution market={market} />
                  </div>
                )}
                {market.status === "resolved" && (
                  <Card>
                    <CardContent className="py-6 text-center text-muted-foreground text-sm">
                      This market has been resolved.
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
