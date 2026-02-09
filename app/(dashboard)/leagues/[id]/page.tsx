import { auth } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLeagueDetailsAction, getLeagueActivityAction } from "@/lib/actions/leagues";
import { getDraftStateAction } from "@/lib/actions/draft";
import { getLeagueScheduleAction } from "@/lib/actions/matchups";
import { setActiveLeagueAction } from "@/lib/actions/roster";
import { getLeagueSettingsAction } from "@/lib/actions/settings";
import { CopyInviteCode } from "@/components/leagues/copy-invite-code";
import { DraftSetupCard } from "@/components/draft/draft-setup-card";
import { SetActiveLeague } from "@/components/leagues/set-active-league";
import { GenerateScheduleButton } from "@/components/matchup/generate-schedule-button";
import { ActivityFeed } from "@/components/leagues/activity-feed";
import { LeaguePhaseControls } from "@/components/leagues/league-phase-controls";
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
        <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Error</h3>
            <p className="text-sm text-gray-400 mt-1">{result.error || "Failed to load league"}</p>
          </div>
          <div className="px-6 py-4">
            <Link href="/dashboard">
              <Button variant="outline" className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 bg-transparent">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
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

  const seasonActive = ["pre_week", "week_active", "complete"].includes(league.phase);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SetActiveLeague leagueId={league.id} leagueName={league.name} />

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white">{league.name}</h1>
          {league.isMock && (
            <span className="bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full text-xs font-medium">
              Mock
            </span>
          )}
        </div>
        <p className="mt-2 text-gray-400">League overview and management</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* League Info */}
        <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">League Details</h3>
            <p className="text-sm text-gray-400 mt-1">Configuration and settings</p>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Teams</p>
                <p className="text-lg font-semibold text-white">{members.length} / {league.numberOfTeams}</p>
              </div>
              {leagueSettings && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Scoring</p>
                  <p className="text-lg font-semibold text-white">
                    {leagueSettings.scoringFormat === "standard"
                      ? "Standard"
                      : leagueSettings.scoringFormat === "half_ppr"
                        ? "Half PPR"
                        : "Full PPR"}
                  </p>
                </div>
              )}
            </div>

            {!league.isMock && leagueSettings?.waiverType && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Waivers</p>
                <p className="text-lg font-semibold text-white">
                  {leagueSettings.waiverType === "faab"
                    ? `FAAB ($${leagueSettings.faabBudget || 100})`
                    : "Standard"}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Invite Code</p>
              <CopyInviteCode code={league.inviteCode} />
            </div>

            <div className="pt-2 flex items-center gap-2 flex-wrap">
              {currentUserMember?.isCommissioner && (
                <span className="bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full text-xs font-medium">
                  Commissioner
                </span>
              )}
              <Link href={`/leagues/${league.id}/settings`}>
                <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent">
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Members</h3>
            <p className="text-sm text-gray-400 mt-1">League participants</p>
          </div>
          <div className="px-6 py-5">
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-white">
                      {member.isBot
                        ? member.teamName || "Bot"
                        : member.userName || member.userEmail}
                      {member.userId === session.user.id && (
                        <span className="text-sm text-gray-400 ml-2">(You)</span>
                      )}
                    </p>
                    {!member.isBot && member.teamName && (
                      <p className="text-sm text-gray-400">Team: {member.teamName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {member.isBot && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                        Bot
                      </span>
                    )}
                    {member.isCommissioner && (
                      <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-1 rounded">
                        Commissioner
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {members.length < league.numberOfTeams && (
                <div className="pt-4 text-sm text-gray-400">
                  {league.numberOfTeams - members.length} spot(s) remaining
                </div>
              )}
            </div>
          </div>
        </div>
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
          <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Season Schedule</h3>
              <p className="text-sm text-gray-400 mt-1">
                {hasSchedule
                  ? "The season schedule has been generated."
                  : "Generate the weekly matchup schedule."}
              </p>
            </div>
            <div className="px-6 py-5">
              {hasSchedule ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="bg-green-500/20 text-green-400 px-2.5 py-1 rounded-full text-xs font-medium">
                    Schedule Generated
                  </span>
                  <Link href={`/leagues/${league.id}/matchup`}>
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent">
                      View Matchups
                    </Button>
                  </Link>
                  <Link href={`/leagues/${league.id}/team`}>
                    <Button variant="outline" size="sm" className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-transparent">
                      My Team
                    </Button>
                  </Link>
                </div>
              ) : currentUserMember?.isCommissioner ? (
                <GenerateScheduleButton leagueId={league.id} />
              ) : (
                <p className="text-sm text-gray-400">
                  Waiting for the commissioner to generate the schedule.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* League Phase Controls */}
      {seasonActive && (
        <div className="mt-6">
          <div className="bg-[#252830] rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Season Status</h3>
              <p className="text-sm text-gray-400 mt-1">
                {league.phase === "complete"
                  ? "The season has ended."
                  : "Current week status and league phase."}
              </p>
            </div>
            <div className="px-6 py-5">
              <LeaguePhaseControls
                phase={league.phase}
                currentWeek={league.currentWeek}
                leagueId={league.id}
                isCommissioner={currentUserMember?.isCommissioner ?? false}
                isMock={league.isMock ?? false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed Section */}
      <div className="mt-6">
        <ActivityFeed activity={activity} />
      </div>
    </div>
  );
}
