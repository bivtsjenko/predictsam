"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { placeBet } from "@/lib/firestore/markets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Market, BetSide } from "@/types";

interface BetPlacementProps {
  market: Market;
  onBetPlaced?: () => void;
}

export function BetPlacement({ market, onBetPlaced }: BetPlacementProps) {
  const { user, userProfile } = useAuth();
  const [side, setSide] = useState<BetSide>("yes");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const amountNum = parseFloat(amount) || 0;
  const totalYes = market.totalYesAmount + (side === "yes" ? amountNum : 0);
  const totalNo = market.totalNoAmount + (side === "no" ? amountNum : 0);
  const totalPool = totalYes + totalNo;
  const sideTotal = side === "yes" ? totalYes : totalNo;
  const potentialPayout =
    sideTotal > 0 ? (amountNum / sideTotal) * totalPool : 0;

  async function handleSubmit() {
    if (!user || !userProfile) {
      toast.error("You must be signed in to place a bet.");
      return;
    }
    if (amountNum < 1) {
      toast.error("Minimum bet amount is 1.");
      return;
    }

    setLoading(true);
    try {
      await placeBet(
        market.id!,
        market.groupId,
        user.uid,
        userProfile.displayName,
        side,
        amountNum
      );
      toast.success("Bet placed successfully!");
      setAmount("");
      onBetPlaced?.();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to place bet.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Place a Bet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={side === "yes" ? "default" : "outline"}
            className={cn(
              side === "yes" &&
                "bg-emerald-600 hover:bg-emerald-700 text-white"
            )}
            onClick={() => setSide("yes")}
          >
            YES
          </Button>
          <Button
            variant={side === "no" ? "default" : "outline"}
            className={cn(
              side === "no" && "bg-rose-600 hover:bg-rose-700 text-white"
            )}
            onClick={() => setSide("no")}
          >
            NO
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bet-amount">Amount ($)</Label>
          <Input
            id="bet-amount"
            type="number"
            min={1}
            step={1}
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {amountNum > 0 && (
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Potential payout</span>
              <span className="font-medium">${potentialPayout.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net profit</span>
              <span
                className={cn(
                  "font-medium",
                  potentialPayout - amountNum > 0
                    ? "text-emerald-600"
                    : "text-rose-600"
                )}
              >
                ${(potentialPayout - amountNum).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={loading || amountNum < 1}
        >
          {loading ? "Placing..." : "Place Bet"}
        </Button>
      </CardContent>
    </Card>
  );
}
