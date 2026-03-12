import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  runTransaction,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Market, Bet, Settlement, BetSide } from "@/types";

const marketsRef = collection(db, "markets");
const betsRef = collection(db, "bets");
const settlementsRef = collection(db, "settlements");

export async function createMarket(
  groupId: string,
  title: string,
  description: string,
  resolutionDate: Date,
  userId: string
): Promise<string> {
  const market: Omit<Market, "id"> = {
    groupId,
    title,
    description,
    createdBy: userId,
    createdAt: Timestamp.now(),
    resolutionDate: Timestamp.fromDate(resolutionDate),
    status: "open",
    outcome: null,
    resolvedBy: null,
    totalYesAmount: 0,
    totalNoAmount: 0,
  };
  const docRef = await addDoc(marketsRef, market);
  return docRef.id;
}

export async function getMarket(marketId: string): Promise<Market | null> {
  const docSnap = await getDoc(doc(db, "markets", marketId));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Market;
}

export async function getGroupMarkets(groupId: string): Promise<Market[]> {
  const q = query(
    marketsRef,
    where("groupId", "==", groupId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Market);
}

export async function getMarketBets(marketId: string): Promise<Bet[]> {
  const q = query(
    betsRef,
    where("marketId", "==", marketId),
    orderBy("placedAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Bet);
}

export async function getUserBets(userId: string): Promise<Bet[]> {
  const q = query(betsRef, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Bet);
}

export async function placeBet(
  marketId: string,
  groupId: string,
  userId: string,
  userDisplayName: string,
  side: BetSide,
  amount: number
): Promise<string> {
  const betId = await runTransaction(db, async (transaction) => {
    const marketRef = doc(db, "markets", marketId);
    const marketDoc = await transaction.get(marketRef);

    if (!marketDoc.exists()) throw new Error("Market not found");
    const market = marketDoc.data() as Market;
    if (market.status !== "open") throw new Error("Market is not open");

    const betRef = doc(collection(db, "bets"));
    const bet: Omit<Bet, "id"> = {
      marketId,
      groupId,
      userId,
      userDisplayName,
      side,
      amount,
      placedAt: Timestamp.now(),
      payout: 0,
    };

    transaction.set(betRef, bet);
    transaction.update(marketRef, {
      [side === "yes" ? "totalYesAmount" : "totalNoAmount"]:
        (side === "yes" ? market.totalYesAmount : market.totalNoAmount) +
        amount,
    });

    return betRef.id;
  });

  return betId;
}

export async function resolveMarket(
  marketId: string,
  outcome: "yes" | "no",
  resolvedBy: string
): Promise<void> {
  const marketRef = doc(db, "markets", marketId);
  const marketSnap = await getDoc(marketRef);
  if (!marketSnap.exists()) throw new Error("Market not found");

  const market = { id: marketSnap.id, ...marketSnap.data() } as Market;
  if (market.status !== "open" && market.status !== "closed") {
    throw new Error("Market already resolved");
  }

  // Get all bets for this market
  const betsQuery = query(betsRef, where("marketId", "==", marketId));
  const betsSnap = await getDocs(betsQuery);
  const bets = betsSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Bet
  );

  const totalPool = market.totalYesAmount + market.totalNoAmount;
  const winnerSide = outcome;
  const winningSideBets = bets.filter((b) => b.side === winnerSide);
  const winningSideTotal =
    winnerSide === "yes" ? market.totalYesAmount : market.totalNoAmount;

  // Calculate payouts
  const batch = writeBatch(db);
  const payoutMap: Record<string, number> = {};

  for (const bet of bets) {
    const betRef = doc(db, "bets", bet.id!);
    let payout = 0;
    if (bet.side === winnerSide && winningSideTotal > 0) {
      payout = (bet.amount / winningSideTotal) * totalPool;
    }
    // We can't update bets per rules (immutable), so payouts are tracked in settlements
    payoutMap[bet.userId] = (payoutMap[bet.userId] || 0) + payout;
  }

  // Calculate net positions and generate settlements
  const netPositions: Record<string, number> = {};
  for (const bet of bets) {
    const payout = payoutMap[bet.userId] || 0;
    // Net = total payout - total wagered
    if (!netPositions[bet.userId]) {
      netPositions[bet.userId] = 0;
    }
  }

  // Group by user: total wagered and total payout
  const userTotals: Record<string, { wagered: number; payout: number }> = {};
  for (const bet of bets) {
    if (!userTotals[bet.userId]) {
      userTotals[bet.userId] = { wagered: 0, payout: 0 };
    }
    userTotals[bet.userId].wagered += bet.amount;
  }
  for (const [userId, payout] of Object.entries(payoutMap)) {
    if (!userTotals[userId]) {
      userTotals[userId] = { wagered: 0, payout: 0 };
    }
    userTotals[userId].payout = payout;
  }

  // Net position: positive = won money, negative = lost money
  const winners: { userId: string; net: number }[] = [];
  const losers: { userId: string; net: number }[] = [];

  for (const [userId, totals] of Object.entries(userTotals)) {
    const net = totals.payout - totals.wagered;
    if (net > 0) winners.push({ userId, net });
    else if (net < 0) losers.push({ userId, net: Math.abs(net) });
  }

  // Generate settlements (minimize transfers via netting)
  let wi = 0;
  let li = 0;
  let winnerRemaining = winners[wi]?.net || 0;
  let loserRemaining = losers[li]?.net || 0;

  while (wi < winners.length && li < losers.length) {
    const transferAmount = Math.min(winnerRemaining, loserRemaining);
    if (transferAmount > 0.01) {
      const settlement: Omit<Settlement, "id"> = {
        groupId: market.groupId,
        marketId: marketId,
        fromUserId: losers[li].userId,
        toUserId: winners[wi].userId,
        amount: Math.round(transferAmount * 100) / 100,
        settled: false,
        createdAt: Timestamp.now(),
      };
      const settlementRef = doc(collection(db, "settlements"));
      batch.set(settlementRef, settlement);
    }

    winnerRemaining -= transferAmount;
    loserRemaining -= transferAmount;

    if (winnerRemaining < 0.01) {
      wi++;
      winnerRemaining = winners[wi]?.net || 0;
    }
    if (loserRemaining < 0.01) {
      li++;
      loserRemaining = losers[li]?.net || 0;
    }
  }

  // Update market status
  batch.update(marketRef, {
    status: "resolved",
    outcome,
    resolvedBy,
  });

  await batch.commit();
}

export async function closeMarket(marketId: string): Promise<void> {
  const marketRef = doc(db, "markets", marketId);
  await updateDoc(marketRef, { status: "closed" });
}

export async function getUserSettlements(
  userId: string
): Promise<Settlement[]> {
  const fromQuery = query(
    settlementsRef,
    where("fromUserId", "==", userId)
  );
  const toQuery = query(settlementsRef, where("toUserId", "==", userId));

  const [fromSnap, toSnap] = await Promise.all([
    getDocs(fromQuery),
    getDocs(toQuery),
  ]);

  const settlements = [
    ...fromSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Settlement
    ),
    ...toSnap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Settlement
    ),
  ];

  return settlements;
}

export async function getMarketSettlements(
  marketId: string
): Promise<Settlement[]> {
  const q = query(settlementsRef, where("marketId", "==", marketId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Settlement
  );
}

export async function markSettled(settlementId: string): Promise<void> {
  const ref = doc(db, "settlements", settlementId);
  await updateDoc(ref, { settled: true });
}
