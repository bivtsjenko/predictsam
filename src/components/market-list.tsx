"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketCard } from "@/components/market-card";
import type { Currency, Market, MarketStatus } from "@/types";

interface MarketListProps {
  markets: Market[];
  groupId: string;
  loading: boolean;
  currency?: Currency;
}

const tabs: { value: string; label: string; status?: MarketStatus }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open", status: "open" },
  { value: "closed", label: "Closed", status: "closed" },
  { value: "resolved", label: "Resolved", status: "resolved" },
];

export function MarketList({ markets, groupId, loading, currency }: MarketListProps) {
  const [activeTab, setActiveTab] = useState("all");

  const filteredMarkets =
    activeTab === "all"
      ? markets
      : markets.filter((m) => m.status === activeTab);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3 p-4 border rounded-lg">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No {tab.value === "all" ? "" : tab.value} markets yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  groupId={groupId}
                  currency={currency}
                />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
