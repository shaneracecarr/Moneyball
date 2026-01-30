"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMockLeagueAction } from "@/lib/actions/mock-league";

export function MockLeagueSetup() {
  const [numberOfTeams, setNumberOfTeams] = useState(10);
  const [numberOfRounds, setNumberOfRounds] = useState(15);
  const [teamName, setTeamName] = useState("");
  const [draftPosition, setDraftPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("teamName", teamName || "My Team");
    formData.set("numberOfTeams", String(numberOfTeams));
    formData.set("numberOfRounds", String(numberOfRounds));
    formData.set("draftPosition", String(draftPosition));

    startTransition(async () => {
      const result = await createMockLeagueAction(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.leagueId) {
        router.push(`/mock-league/${result.leagueId}`);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Create Mock League</CardTitle>
          <CardDescription>
            Play a full fantasy season against AI opponents. Draft your team,
            manage your roster week-by-week, and compete across 17 weeks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Team Name
              </label>
              <Input
                type="text"
                placeholder="My Team"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Teams
              </label>
              <Input
                type="number"
                min={4}
                max={14}
                value={numberOfTeams}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNumberOfTeams(val);
                  if (draftPosition > val) setDraftPosition(0);
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Between 4 and 14</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Draft Rounds
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={numberOfRounds}
                onChange={(e) => setNumberOfRounds(parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-gray-500 mt-1">Between 1 and 20</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Draft Position
              </label>
              <Input
                type="number"
                min={0}
                max={numberOfTeams}
                value={draftPosition}
                onChange={(e) => setDraftPosition(parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-gray-500 mt-1">
                1 to {numberOfTeams}, or 0 for random
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Creating..." : "Create Mock League"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
