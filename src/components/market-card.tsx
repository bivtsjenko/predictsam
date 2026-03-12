"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OddsBar } from "@/components/odds-bar";
import { currencySymbol } from "@/lib/currency";
import type { Currency, Market } from "@/types";

interface MarketCardProps {
  market: Market;
  groupId: string;
  currency?: Currency;
}

const statusConfig: Record<
  string,
  { label: string; variant: "outline" | "secondary" }
> = {
  open: { label: "Open", variant: "outline" },
  closed: { label: "Closed", variant: "outline" },
  resolved: { label: "Resolved", variant: "secondary" },
};

export function MarketCard({ market, groupId, currency }: MarketCardProps) {
  const sym = currencySymbol(currency);
  const config = statusConfig[market.status] || statusConfig.open;
  const totalPool = market.totalYesAmount + market.totalNoAmount;
  const resolutionDate = market.resolutionDate?.toDate
    ? market.resolutionDate.toDate()
    : new Date(market.resolutionDate as unknown as string);

  return (
    <Link href={`/groups/${groupId}/markets/${market.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-tight line-clamp-2">
              {market.title}
            </CardTitle>
            <Badge
              variant={config.variant}
              className={
                market.status === "open"
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 shrink-0"
                  : market.status === "closed"
                  ? "border-amber-500 text-amber-600 dark:text-amber-400 shrink-0"
                  : "shrink-0"
              }
            >
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {market.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {market.description}
            </p>
          )}
          <OddsBar
            yesAmount={market.totalYesAmount}
            noAmount={market.totalNoAmount}
            size="sm"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Volume: {sym}{totalPool.toFixed(2)}</span>
            <span>
              Resolves:{" "}
              {resolutionDate.toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
