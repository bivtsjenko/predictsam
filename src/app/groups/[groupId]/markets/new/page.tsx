"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createMarket } from "@/lib/firestore/markets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewMarketPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resolutionDate, setResolutionDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!resolutionDate) {
      toast.error("Resolution date is required.");
      return;
    }

    setLoading(true);
    try {
      const marketId = await createMarket(
        groupId,
        title.trim(),
        description.trim(),
        new Date(resolutionDate),
        user.uid
      );
      toast.success("Market created!");
      router.push(`/groups/${groupId}/markets/${marketId}`);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create market.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Market</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Question / Title</Label>
              <Input
                id="title"
                placeholder="Will X happen by Y date?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                placeholder="Additional details or resolution criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolutionDate">Resolution Date</Label>
              <Input
                id="resolutionDate"
                type="date"
                value={resolutionDate}
                onChange={(e) => setResolutionDate(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Market"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
