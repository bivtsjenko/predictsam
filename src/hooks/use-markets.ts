"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Market, Bet } from "@/types";

export function useGroupMarkets(groupId: string | null) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setMarkets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "markets"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Market
      );
      setMarkets(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [groupId]);

  return { markets, loading };
}

export function useMarket(marketId: string | null) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!marketId) {
      setMarket(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "markets", marketId),
      (snap) => {
        if (snap.exists()) {
          setMarket({ id: snap.id, ...snap.data() } as Market);
        } else {
          setMarket(null);
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [marketId]);

  return { market, loading };
}

export function useMarketBets(marketId: string | null) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!marketId) {
      setBets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "bets"),
      where("marketId", "==", marketId),
      orderBy("placedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Bet
      );
      setBets(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [marketId]);

  return { bets, loading };
}
