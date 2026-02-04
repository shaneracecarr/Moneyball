"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  setupDraftAction,
  randomizeDraftOrderAction,
  startDraftAction,
} from "@/lib/actions/draft";

type DraftOrder = {
  memberId: string;
  position: number;
  userName: string | null;
  userEmail: string;
  teamName: string | null;
  isBot?: boolean;
};

type Draft = {
  id: string;
  status: "scheduled" | "in_progress" | "completed";
  numberOfRounds: number;
  currentPick: number;
};

interface DraftSetupCardProps {
  leagueId: string;
  isCommissioner: boolean;
  draft: Draft | null;
  order: DraftOrder[];
  leagueFull: boolean;
}

export function DraftSetupCard({
  leagueId,
  isCommissioner,
  draft,
  order,
  leagueFull,
}: DraftSetupCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentDraft, setCurrentDraft] = useState(draft);
  const [currentOrder, setCurrentOrder] = useState(order);

  async function handleSetupDraft(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("leagueId", leagueId);
    const result = await setupDraftAction(formData);
    if (result.error) {
      setError(result.error);
    } else {
      // Reload to get fresh state
      window.location.reload();
    }
    setLoading(false);
  }

  async function handleRandomize() {
    if (!currentDraft) return;
    setLoading(true);
    setError(null);
    const result = await randomizeDraftOrderAction(currentDraft.id);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
    setLoading(false);
  }

  async function handleStartDraft() {
    if (!currentDraft) return;
    setLoading(true);
    setError(null);
    const result = await startDraftAction(currentDraft.id);
    if (result.error) {
      setError(result.error);
    } else {
      window.location.reload();
    }
    setLoading(false);
  }

  // No draft exists yet
  if (!currentDraft) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Draft</CardTitle>
          <CardDescription>Set up the league draft</CardDescription>
        </CardHeader>
        <CardContent>
          {!leagueFull && (
            <p className="text-sm text-gray-500 mb-4">
              The league must be full before setting up the draft.
            </p>
          )}
          {isCommissioner && leagueFull ? (
            <form action={handleSetupDraft} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Number of Rounds
                </label>
                <Input
                  name="numberOfRounds"
                  type="number"
                  defaultValue={15}
                  min={1}
                  max={20}
                  className="mt-1 w-32"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" disabled={loading}>
                {loading ? "Setting up..." : "Set Up Draft"}
              </Button>
            </form>
          ) : (
            !leagueFull ? null : (
              <p className="text-sm text-gray-500">
                Waiting for the commissioner to set up the draft.
              </p>
            )
          )}
        </CardContent>
      </Card>
    );
  }

  // Draft is in progress or completed
  if (currentDraft.status === "in_progress" || currentDraft.status === "completed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Draft</CardTitle>
          <CardDescription>
            {currentDraft.status === "in_progress" ? "Draft is live!" : "Draft is complete"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`/leagues/${leagueId}/draft`}>
            <Button>
              {currentDraft.status === "in_progress" ? "Go to Draft" : "View Draft Results"}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Draft is scheduled - show order and controls
  return (
    <Card>
      <CardHeader>
        <CardTitle>Draft</CardTitle>
        <CardDescription>
          {currentDraft.numberOfRounds} rounds, snake draft order
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Draft Order</p>
          <div className="space-y-1">
            {currentOrder.map((entry) => (
              <div
                key={entry.memberId}
                className="flex items-center gap-3 py-1.5 px-3 rounded bg-gray-50"
              >
                <span className="text-sm font-semibold text-indigo-600 w-6">
                  {entry.position}.
                </span>
                <span className="text-sm">
                  {entry.isBot
                    ? entry.teamName || "Bot"
                    : entry.teamName || entry.userName || entry.userEmail}
                </span>
                {entry.isBot && (
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                    Bot
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {isCommissioner && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRandomize} disabled={loading}>
              {loading ? "Randomizing..." : "Randomize Order"}
            </Button>
            <Button onClick={handleStartDraft} disabled={loading}>
              {loading ? "Starting..." : "Start Draft"}
            </Button>
          </div>
        )}

        {!isCommissioner && (
          <p className="text-sm text-gray-500">
            Waiting for the commissioner to start the draft.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
