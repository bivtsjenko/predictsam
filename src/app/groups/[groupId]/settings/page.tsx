"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getGroup } from "@/lib/firestore/groups";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import type { Group, User } from "@/types";

export default function GroupSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchGroupData() {
      try {
        const g = await getGroup(groupId);
        if (!g) {
          setLoading(false);
          return;
        }
        setGroup(g);

        // Fetch member profiles
        const memberDocs = await Promise.all(
          g.memberIds.map(async (uid) => {
            try {
              const userDoc = await getDoc(doc(db, "users", uid));
              if (userDoc.exists()) {
                return userDoc.data() as User;
              }
            } catch {
              // skip
            }
            return null;
          })
        );
        setMembers(memberDocs.filter((m): m is User => m !== null));
      } catch {
        // handle silently
      } finally {
        setLoading(false);
      }
    }

    if (groupId) fetchGroupData();
  }, [groupId]);

  function getInviteUrl() {
    if (!group) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/invite/${group.inviteCode}`;
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(getInviteUrl());
    toast.success("Invite link copied!");
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        Group not found.
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Group Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <p className="text-sm">{group.name}</p>
          </div>
          {group.description && (
            <div className="space-y-1">
              <Label>Description</Label>
              <p className="text-sm">{group.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Share this link to invite others to your group.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={getInviteUrl()} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copyInviteLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member, idx) => (
            <div key={member.uid}>
              {idx > 0 && <Separator className="mb-3" />}
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.photoURL || undefined} />
                  <AvatarFallback>
                    {(member.displayName || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{member.displayName}</p>
                  {member.email && (
                    <p className="text-xs text-muted-foreground">
                      {member.email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
