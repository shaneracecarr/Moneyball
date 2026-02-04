import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction, getLeagueActivityAction } from "@/lib/actions/leagues";
import { getDraftStateAction } from "@/lib/actions/draft";
import { getLeagueScheduleAction } from "@/lib/actions/matchups";
import { setActiveLeagueAction } from "@/lib/actions/roster";
import { getLeagueSettingsAction } from "@/lib/actions/settings";
import { getStandingsAction } from "@/lib/actions/standings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyInviteCode } from "@/components/leagues/copy-invite-code";
import { DraftSetupCard } from "@/components/draft/draft-setup-card";
import { SetActiveLeague } from "@/components/leagues/set-active-league";
import { GenerateScheduleButton } from "@/components/matchup/generate-schedule-button";
import { ActivityFeed } from "@/components/leagues/activity-feed";
import { LeaguePhaseControls } from "@/components/leagues/league-phase-controls";
import { StandingsTable } from "@/components/leagues/standings-table";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function LeagueDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const result = await getLeagueDetailsAction(params.id);

  if (result.error || !result.league || !result.members) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{result.error || "Failed to load league"}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { league, members } = result;
  const currentUserMember = members.find((m) => m.userId === session.user.id);
  const leagueFull = members.length >= league.numberOfTeams;

  const draftResult = await getDraftStateAction(params.id);
  const draftState = draftResult.draft ? {
    draft: draftResult.draft,
    order: draftResult.order || [],
    isCommissioner: draftResult.isCommissioner ?? false,
  } : null;

  const draftCompleted = draftState?.draft?.status === "completed";
  const scheduleResult = await getLeagueScheduleAction(params.id);
  const hasSchedule = scheduleResult.hasSchedule ?? false;

  // Fetch activity feed and settings
  const activityResult = await getLeagueActivityAction(params.id);
  const activity = activityResult.activity || [];

  const settingsResult = await getLeagueSettingsAction(params.id);
  const leagueSettings = settingsResult.settings;

  // Fetch standings if season has started
  const seasonActive = ["pre_week", "week_active", "complete"].includes(league.phase);
  let standings: Awaited<ReturnType<typeof getStandingsAction>> | null = null;
  if (seasonActive) {
    standings = await getStandingsAction(params.id);
  }

  // Build member ID -> user ID map for standings highlighting
  const memberUserIds: Record<string, string | null> = {};
  for (const m of members) {
    memberUserIds[m.id] = m.userId;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SetActiveLeague leagueId={league.id} leagueName={league.name} />
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">← Back to Dashboard</Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* League Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>{league.name}</CardTitle>
              {league.isMock && (
                <span className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 ring-1 ring-inset ring-purple-700/10">
                  Mock
                </span>
              )}
            </div>
            <CardDescription>League Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Number of Teams</p>
              <p className="text-lg">{league.numberOfTeams}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Current Members</p>
              <p className="text-lg">
                {members.length} / {league.numberOfTeams}
              </p>
            </div>

            {leagueSettings && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Scoring Format</p>
                  <p className="text-lg">
                    {leagueSettings.scoringFormat === "standard"
                      ? "Standard"
                      : leagueSettings.scoringFormat === "half_ppr"
                        ? "Half PPR"
                        : "Full PPR"}
                  </p>
                </div>
                {!league.isMock && leagueSettings.waiverType && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Waivers</p>
                    <p className="text-lg">
                      {leagueSettings.waiverType === "faab"
                        ? `FAAB ($${leagueSettings.faabBudget || 100})`
                        : "Standard"}
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <p className="text-sm font-medium text-gray-500 mb-2">Invite Code</p>
              <CopyInviteCode code={league.inviteCode} />
            </div>

            <div className="pt-2 flex items-center gap-2 flex-wrap">
              {currentUserMember?.isCommissioner && (
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                  You are the Commissioner
                </span>
              )}
              <Link href={`/leagues/${league.id}/settings`}>
                <Button variant="outline" size="sm">Settings</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>League participants</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 border-b last:border-b-0"
                >
                  <div>
                    <p className="font-medium">
                      {member.isBot
                        ? member.teamName || "Bot"
                        : member.userName || member.userEmail}
                      {member.userId === session.user.id && (
                        <span className="text-sm text-gray-500 ml-2">(You)</span>
                      )}
                    </p>
                    {!member.isBot && member.teamName && (
                      <p className="text-sm text-gray-500">Team: {member.teamName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {member.isBot && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        Bot
                      </span>
                    )}
                    {member.isCommissioner && (
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
                        Commissioner
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {members.length < league.numberOfTeams && (
                <div className="pt-4 text-sm text-gray-500">
                  {league.numberOfTeams - members.length} spot(s) remaining
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Draft Section */}
      <div className="mt-6">
        <DraftSetupCard
          leagueId={league.id}
          isCommissioner={currentUserMember?.isCommissioner ?? false}
          draft={draftState?.draft ? {
            id: draftState.draft.id,
            status: draftState.draft.status as "scheduled" | "in_progress" | "completed",
            numberOfRounds: draftState.draft.numberOfRounds,
            currentPick: draftState.draft.currentPick,
          } : null}
          order={(draftState?.order || []).map((o: any) => ({
            memberId: o.memberId,
            position: o.position,
            userName: o.userName,
            userEmail: o.userEmail,
            teamName: o.teamName,
            isBot: o.isBot ?? false,
          }))}
          leagueFull={leagueFull}
        />
      </div>

      {/* Schedule Section */}
      {draftCompleted && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Season Schedule</CardTitle>
              <CardDescription>
                {hasSchedule
                  ? "The season schedule has been generated."
                  : "Generate the weekly matchup schedule."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasSchedule ? (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Schedule Generated
                  </span>
                  <Link href={`/leagues/${league.id}/matchup`}>
                    <Button variant="outline" size="sm">View Matchups</Button>
                  </Link>
                  <Link href={`/leagues/${league.id}/team`}>
                    <Button variant="outline" size="sm">My Team</Button>
                  </Link>
                </div>
              ) : currentUserMember?.isCommissioner ? (
                <GenerateScheduleButton leagueId={league.id} />
              ) : (
                <p className="text-sm text-gray-500">
                  Waiting for the commissioner to generate the schedule.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* League Phase Controls */}
      {seasonActive && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Season Status</CardTitle>
              <CardDescription>
                {league.phase === "complete"
                  ? "The season has ended."
                  : "Current week status and league phase."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaguePhaseControls
                phase={league.phase}
                currentWeek={league.currentWeek}
                leagueId={league.id}
                isCommissioner={currentUserMember?.isCommissioner ?? false}
                isMock={league.isMock ?? false}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Standings */}
      {standings?.standings && standings.standings.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Standings</CardTitle>
              <CardDescription>
                {standings.completedWeeks
                  ? "Updated after each scored week"
                  : "No weeks have been scored yet"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StandingsTable
                standings={standings.standings}
                currentUserId={session.user.id}
                memberUserIds={memberUserIds}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Feed Section */}
      <div className="mt-6">
        <ActivityFeed activity={activity} />
      </div>
    </div>
  );
}
