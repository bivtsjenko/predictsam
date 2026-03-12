"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getGroup } from "@/lib/firestore/groups";
import { useGroupMarkets } from "@/hooks/use-markets";
import { MarketList } from "@/components/market-list";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Settings, Users } from "lucide-react";
import type { Group } from "@/types";

export default function GroupPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [groupLoading, setGroupLoading] = useState(true);
  const { markets, loading: marketsLoading } = useGroupMarkets(groupId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const g = await getGroup(groupId);
        setGroup(g);
      } catch {
        // handle error silently
      } finally {
        setGroupLoading(false);
      }
    }
    if (groupId) fetchGroup();
  }, [groupId]);

  if (authLoading || groupLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p>Group not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground">{group.description}</p>
          )}
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Users className="mr-1 h-4 w-4" />
            {group.memberIds.length} member
            {group.memberIds.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/groups/${groupId}/settings`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
          <Link href={`/groups/${groupId}/markets/new`} className={buttonVariants({ size: "sm" })}>
            <Plus className="mr-2 h-4 w-4" />
            Create Market
          </Link>
        </div>
      </div>

      <MarketList
        markets={markets}
        groupId={groupId}
        loading={marketsLoading}
      />
    </div>
  );
}
