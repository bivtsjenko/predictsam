"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markSettled } from "@/lib/firestore/markets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { currencySymbol } from "@/lib/currency";
import type { Currency, Settlement } from "@/types";

interface SettlementSummaryProps {
  settlements: Settlement[];
  currentUserId: string;
  currency?: Currency;
}

export function SettlementSummary({
  settlements,
  currentUserId,
  currency,
}: SettlementSummaryProps) {
  const sym = currencySymbol(currency);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [settlingIds, setSettlingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const userIds = new Set<string>();
    settlements.forEach((s) => {
      userIds.add(s.fromUserId);
      userIds.add(s.toUserId);
    });

    async function fetchNames() {
      const names: Record<string, string> = {};
      await Promise.all(
        Array.from(userIds).map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
              names[uid] = userDoc.data().displayName || "Unknown";
            } else {
              names[uid] = "Unknown";
            }
          } catch {
            names[uid] = "Unknown";
          }
        })
      );
      setUserNames(names);
    }

    if (userIds.size > 0) {
      fetchNames();
    }
  }, [settlements]);

  async function handleMarkSettled(settlementId: string) {
    setSettlingIds((prev) => new Set(prev).add(settlementId));
    try {
      await markSettled(settlementId);
      toast.success("Marked as settled.");
    } catch {
      toast.error("Failed to mark as settled.");
    } finally {
      setSettlingIds((prev) => {
        const next = new Set(prev);
        next.delete(settlementId);
        return next;
      });
    }
  }

  if (settlements.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No settlements.
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Settlements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {settlements.map((settlement, idx) => {
          const isOwing = settlement.fromUserId === currentUserId;
          const otherUserId = isOwing
            ? settlement.toUserId
            : settlement.fromUserId;
          const otherName = userNames[otherUserId] || "...";

          return (
            <div key={settlement.id}>
              {idx > 0 && <Separator className="mb-3" />}
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    {isOwing ? (
                      <>
                        You owe{" "}
                        <span className="text-rose-600 dark:text-rose-400">
                          {otherName}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {otherName}
                        </span>{" "}
                        owes you
                      </>
                    )}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold",
                      isOwing
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    )}
                  >
                    {sym}{settlement.amount.toFixed(2)}
                  </p>
                </div>
                {settlement.settled ? (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Settled
                  </span>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkSettled(settlement.id!)}
                    disabled={settlingIds.has(settlement.id!)}
                  >
                    {settlingIds.has(settlement.id!)
                      ? "Settling..."
                      : "Mark Settled"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
