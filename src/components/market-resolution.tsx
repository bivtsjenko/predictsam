"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { resolveMarket } from "@/lib/firestore/markets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Market } from "@/types";

interface MarketResolutionProps {
  market: Market;
  onResolved?: () => void;
}

export function MarketResolution({
  market,
  onResolved,
}: MarketResolutionProps) {
  const { user } = useAuth();
  const [confirmOutcome, setConfirmOutcome] = useState<"yes" | "no" | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  if (!user || user.uid !== market.createdBy) {
    return null;
  }

  async function handleResolve() {
    if (!confirmOutcome || !user) return;

    setLoading(true);
    try {
      await resolveMarket(market.id!, confirmOutcome, user.uid);
      toast.success(
        `Market resolved as ${confirmOutcome.toUpperCase()}.`
      );
      setConfirmOutcome(null);
      onResolved?.();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to resolve market.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resolve Market</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            As the market creator, you can resolve this market.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setConfirmOutcome("yes")}
            >
              Resolve YES
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => setConfirmOutcome("no")}
            >
              Resolve NO
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={confirmOutcome !== null}
        onOpenChange={() => setConfirmOutcome(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Resolution</DialogTitle>
            <DialogDescription>
              Are you sure you want to resolve this market as{" "}
              <span className="font-bold">
                {confirmOutcome?.toUpperCase()}
              </span>
              ? This action cannot be undone. All bets will be settled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOutcome(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={loading}
              className={
                confirmOutcome === "yes"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }
            >
              {loading ? "Resolving..." : `Confirm ${confirmOutcome?.toUpperCase()}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
