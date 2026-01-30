"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { simulateWeekAction, deleteMockLeagueAction } from "@/lib/actions/mock-league";
import { WeekResults } from "./week-results";
import Link from "next/link";

type Standing = {
  memberId: string;
  teamName: string;
  isBot: boolean;
  isUser: boolean;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
};

type WeekResult = {
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
};

interface MockLeagueHubProps {
  leagueId: string;
  leagueName: string;
  currentWeek: number;
  numberOfTeams: number;
  draftStatus: string;
  standings: Standing[];
}

export function MockLeagueHub({
  leagueId,
  leagueName,
  currentWeek,
  numberOfTeams,
  draftStatus,
  standings,
}: MockLeagueHubProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [weekResults, setWeekResults] = useState<{ results: WeekResult[]; week: number } | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const seasonOver = currentWeek > 17;
  const seasonActive = currentWeek >= 1 && currentWeek <= 17 && draftStatus === "completed";

  function handleSimulateWeek() {
    startTransition(async () => {
      const result = await simulateWeekAction(leagueId);
      if (result.success && result.results) {
        setWeekResults({ results: result.results, week: result.week! });
        // Refresh page after a moment to update standings
        setTimeout(() => router.refresh(), 500);
      }
    });
  }

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this mock league?")) return;
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteMockLeagueAction(leagueId);
      if (result.success) {
        router.push("/mock-league");
      }
      setIsDeleting(false);
    });
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/mock-league">
              <Button variant="outline" size="sm">
                ← Back
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{leagueName}</h1>
          </div>
          <p className="text-sm text-gray-500">
            {numberOfTeams} teams
            {seasonActive && ` | Week ${currentWeek}`}
            {seasonOver && " | Season Complete"}
            {draftStatus === "in_progress" && " | Draft In Progress"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDelete} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete League"}
        </Button>
      </div>

      {/* Draft in progress */}
      {draftStatus === "in_progress" && (
        <Card>
          <CardHeader>
            <CardTitle>Draft In Progress</CardTitle>
            <CardDescription>Complete the draft to start the season.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/mock-league/${leagueId}/draft`}>
              <Button>Go to Draft</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Season Controls */}
      {seasonActive && (
        <Card>
          <CardHeader>
            <CardTitle>Week {currentWeek}</CardTitle>
            <CardDescription>
              Simulate this week&apos;s matchups to advance the season.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <Button onClick={handleSimulateWeek} disabled={isPending}>
                {isPending ? "Simulating..." : `Simulate Week ${currentWeek}`}
              </Button>
              <Link href={`/mock-league/${leagueId}/team`}>
                <Button variant="outline">Manage Roster</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Season Complete */}
      {seasonOver && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle>Season Complete!</CardTitle>
            <CardDescription>
              The 17-week season is over. Check the final standings below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/mock-league/${leagueId}/team`}>
              <Button variant="outline">View Final Roster</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Week Results */}
      {weekResults && (
        <WeekResults
          week={weekResults.week}
          results={weekResults.results}
          onClose={() => setWeekResults(null)}
        />
      )}

      {/* Standings */}
      {standings.length > 0 && (draftStatus === "completed") && (
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Team</th>
                    <th className="pb-2 pr-4 text-center">W</th>
                    <th className="pb-2 pr-4 text-center">L</th>
                    <th className="pb-2 pr-4 text-center">T</th>
                    <th className="pb-2 pr-4 text-right">PF</th>
                    <th className="pb-2 text-right">PA</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, index) => (
                    <tr
                      key={team.memberId}
                      className={`border-b last:border-b-0 ${
                        team.isUser ? "bg-blue-50 font-medium" : ""
                      }`}
                    >
                      <td className="py-2 pr-4 text-gray-400">{index + 1}</td>
                      <td className="py-2 pr-4">
                        {team.teamName}
                        {team.isUser && (
                          <span className="ml-1 text-xs text-blue-600">(You)</span>
                        )}
                        {team.isBot && (
                          <span className="ml-1 text-xs text-gray-400">(Bot)</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-center">{team.wins}</td>
                      <td className="py-2 pr-4 text-center">{team.losses}</td>
                      <td className="py-2 pr-4 text-center">{team.ties}</td>
                      <td className="py-2 pr-4 text-right">{team.pointsFor.toFixed(1)}</td>
                      <td className="py-2 text-right">{team.pointsAgainst.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
