"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { getGroupByInviteCode, joinGroup } from "@/lib/firestore/groups";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users } from "lucide-react";
import type { Group } from "@/types";

export default function InvitePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const inviteCode = params.inviteCode as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function fetchGroup() {
      try {
        const g = await getGroupByInviteCode(inviteCode);
        setGroup(g);
      } catch {
        // handle silently
      } finally {
        setLoading(false);
      }
    }
    if (inviteCode) fetchGroup();
  }, [inviteCode]);

  const isMember = user && group?.memberIds.includes(user.uid);

  async function handleJoin() {
    if (!user || !group?.id) {
      router.push("/login");
      return;
    }

    setJoining(true);
    try {
      await joinGroup(group.id, user.uid);
      toast.success("Joined the group!");
      router.push(`/groups/${group.id}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to join group.";
      toast.error(message);
    } finally {
      setJoining(false);
    }
  }

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md text-center">
        <Card>
          <CardContent className="py-8 text-muted-foreground">
            <p>Invalid or expired invite link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">You have been invited to join</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">{group.name}</h2>
          {group.description && (
            <p className="text-muted-foreground">{group.description}</p>
          )}
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Users className="mr-1 h-4 w-4" />
            {group.memberIds.length} member
            {group.memberIds.length !== 1 ? "s" : ""}
          </div>

          {!user ? (
            <Link href="/login" className={buttonVariants({ className: "w-full" })}>
              Sign in to join
            </Link>
          ) : isMember ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                You are already a member of this group.
              </p>
              <Link href={`/groups/${group.id}`} className={buttonVariants({ className: "w-full" })}>
                Go to Group
              </Link>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "Joining..." : "Join Group"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
