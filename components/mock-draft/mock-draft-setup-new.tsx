"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMockLeagueAction } from "@/lib/actions/mock-league";

export function MockDraftSetupNew() {
  const [numberOfTeams, setNumberOfTeams] = useState(12);
  const [numberOfRounds, setNumberOfRounds] = useState(15);
  const [userPosition, setUserPosition] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("teamName", "My Team");
    formData.set("leagueName", "Mock Draft");
    formData.set("numberOfTeams", String(numberOfTeams));
    formData.set("numberOfRounds", String(numberOfRounds));
    formData.set("draftPosition", String(userPosition));

    startTransition(async () => {
      const result = await createMockLeagueAction(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.leagueId) {
        router.push(`/mock-league/${result.leagueId}/draft`);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Mock Draft Setup</CardTitle>
          <CardDescription>
            Draft against AI teams using the full draft board. Your draft will be saved so you can review it afterward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                  if (userPosition > val) setUserPosition(val);
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Between 4 and 14</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Rounds
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
                Your Draft Position
              </label>
              <Input
                type="number"
                min={1}
                max={numberOfTeams}
                value={userPosition}
                onChange={(e) => setUserPosition(parseInt(e.target.value, 10))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Pick 1 to {numberOfTeams} (snake draft)
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Setting up draft..." : "Start Mock Draft"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
