import { eq, and, or, like, desc, asc, notInArray, inArray, sql, isNotNull, ne } from "drizzle-orm";
import { db } from "./index";
import { users, leagues, leagueMembers, players, drafts, draftOrder, draftPicks, rosterPlayers, matchups, trades, tradeParticipants, tradeItems, notifications, leagueActivity, chatMessages, leagueSettings, mockPlayerStats, waiverPlayers, waiverClaims, faabBalances, waiverOrder, tradeBlock, watchlist } from "./schema";
import { DEFAULT_LEAGUE_SETTINGS, type LeagueSettings } from "../league-settings";
import { generateSlotConfig } from "../roster-config";

export async function getUserByEmail(email: string) {
  const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user[0];
}

export async function getUserById(id: string) {
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user[0];
}

export async function createUser(email: string, password: string, name?: string) {
  const result = await db.insert(users).values({ email, password, name }).returning();
  return result[0];
}

export async function createLeague(
  name: string,
  numberOfTeams: number,
  inviteCode: string,
  createdBy: string,
  isMock: boolean = false
) {
  const result = await db
    .insert(leagues)
    .values({ name, numberOfTeams, inviteCode, createdBy, isMock })
    .returning();
  return result[0];
}

export async function createLeagueMember(
  leagueId: string,
  userId: string | null,
  teamName: string | null,
  isCommissioner: boolean,
  isBot: boolean = false
) {
  const result = await db
    .insert(leagueMembers)
    .values({ leagueId, userId, teamName, isCommissioner, isBot })
    .returning();
  return result[0];
}

export async function getUserLeagues(userId: string) {
  const result = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      numberOfTeams: leagues.numberOfTeams,
      teamName: leagueMembers.teamName,
      isCommissioner: leagueMembers.isCommissioner,
      currentWeek: leagues.currentWeek,
      phase: leagues.phase,
      isMock: leagues.isMock,
      createdAt: leagues.createdAt,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(eq(leagueMembers.userId, userId));

  return result;
}

export async function getLeagueById(leagueId: string) {
  const result = await db.select().from(leagues).where(eq(leagues.id, leagueId)).limit(1);
  return result[0];
}

export async function getLeagueByInviteCode(inviteCode: string) {
  const result = await db
    .select()
    .from(leagues)
    .where(eq(leagues.inviteCode, inviteCode))
    .limit(1);
  return result[0];
}

export async function getLeagueMembers(leagueId: string) {
  const result = await db
    .select({
      id: leagueMembers.id,
      userId: leagueMembers.userId,
      userName: users.name,
      userEmail: users.email,
      teamName: leagueMembers.teamName,
      isCommissioner: leagueMembers.isCommissioner,
      isBot: leagueMembers.isBot,
      joinedAt: leagueMembers.joinedAt,
    })
    .from(leagueMembers)
    .leftJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(leagueMembers.leagueId, leagueId));

  return result;
}

export async function isUserInLeague(userId: string, leagueId: string) {
  const result = await db
    .select()
    .from(leagueMembers)
    .where(and(eq(leagueMembers.userId, userId), eq(leagueMembers.leagueId, leagueId)))
    .limit(1);

  return result.length > 0;
}

export async function getLeagueMemberCount(leagueId: string) {
  const result = await db
    .select()
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));

  return result.length;
}

export async function getPlayerById(id: string) {
  const result = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return result[0] || null;
}

// Player queries
export async function upsertPlayer(playerData: {
  sleeperId: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  team: string | null;
  position: string;
  status: string | null;
  injuryStatus: string | null;
  age: number | null;
  yearsExp: number | null;
  number: number | null;
  adp: number | null;
}) {
  const existing = await db
    .select()
    .from(players)
    .where(eq(players.sleeperId, playerData.sleeperId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(players)
      .set({
        ...playerData,
        updatedAt: new Date(),
      })
      .where(eq(players.sleeperId, playerData.sleeperId));
  } else {
    await db.insert(players).values(playerData);
  }
}

export async function getPlayerCount() {
  const result = await db.select().from(players);
  return result.length;
}

export async function searchPlayers(options: {
  search?: string;
  position?: string;
  team?: string;
  limit?: number;
  offset?: number;
  sort?: "adp" | "points" | "name";
  excludeInactive?: boolean;
  excludeLeagueId?: string;
}) {
  const { search, position, team, limit = 50, offset = 0, sort = "name", excludeInactive = false, excludeLeagueId } = options;

  let excludeIds: string[] = [];
  if (excludeLeagueId) {
    excludeIds = await getLeagueOwnedPlayerIds(excludeLeagueId);
  }

  const conditions = [];

  if (search) {
    conditions.push(like(players.fullName, `%${search}%`));
  }

  if (position) {
    conditions.push(eq(players.position, position));
  }

  if (team) {
    conditions.push(eq(players.team, team));
  }

  if (excludeInactive) {
    conditions.push(isNotNull(players.team));
  }

  if (excludeIds.length > 0) {
    conditions.push(notInArray(players.id, excludeIds));
  }

  let query = db.select().from(players);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  let orderClauses;
  switch (sort) {
    case "adp":
      orderClauses = [
        sql`CASE WHEN ${players.adp} IS NULL THEN 1 ELSE 0 END`,
        asc(players.adp),
        asc(players.fullName),
      ];
      break;
    case "points":
      orderClauses = [
        sql`CASE WHEN ${players.seasonPoints} IS NULL THEN 1 ELSE 0 END`,
        desc(players.seasonPoints),
        asc(players.fullName),
      ];
      break;
    default:
      orderClauses = [asc(players.fullName)];
  }

  const result = await (query as any)
    .orderBy(...orderClauses)
    .limit(limit)
    .offset(offset);

  return result;
}

export async function countPlayers(options: {
  search?: string;
  position?: string;
  team?: string;
  excludeInactive?: boolean;
  excludeLeagueId?: string;
}) {
  const { search, position, team, excludeInactive = false, excludeLeagueId } = options;

  let excludeIds: string[] = [];
  if (excludeLeagueId) {
    excludeIds = await getLeagueOwnedPlayerIds(excludeLeagueId);
  }

  let query = db.select().from(players);

  const conditions = [];

  if (search) {
    conditions.push(like(players.fullName, `%${search}%`));
  }

  if (position) {
    conditions.push(eq(players.position, position));
  }

  if (team) {
    conditions.push(eq(players.team, team));
  }

  if (excludeInactive) {
    conditions.push(isNotNull(players.team));
  }

  if (excludeIds.length > 0) {
    conditions.push(notInArray(players.id, excludeIds));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  const result = await query;
  return result.length;
}

export async function deleteAllPlayers() {
  await db.delete(players);
}

// Draft queries
export async function createDraft(
  leagueId: string,
  numberOfRounds: number,
  scheduledAt?: Date
) {
  const result = await db
    .insert(drafts)
    .values({ leagueId, numberOfRounds, scheduledAt: scheduledAt ?? null })
    .returning();
  return result[0];
}

export async function getDraftByLeagueId(leagueId: string) {
  const result = await db
    .select()
    .from(drafts)
    .where(eq(drafts.leagueId, leagueId))
    .limit(1);
  return result[0];
}

export async function updateDraftStatus(
  draftId: string,
  status: "scheduled" | "in_progress" | "completed",
  extraFields?: { startedAt?: Date; completedAt?: Date; currentPick?: number }
) {
  await db
    .update(drafts)
    .set({ status, ...extraFields })
    .where(eq(drafts.id, draftId));
}

export async function advanceDraftPick(draftId: string, newPickNumber: number) {
  await db
    .update(drafts)
    .set({ currentPick: newPickNumber })
    .where(eq(drafts.id, draftId));
}

export async function setDraftOrder(draftId: string, orderedMemberIds: string[]) {
  await db.delete(draftOrder).where(eq(draftOrder.draftId, draftId));
  const values = orderedMemberIds.map((memberId, index) => ({
    draftId,
    memberId,
    position: index + 1,
  }));
  if (values.length > 0) {
    await db.insert(draftOrder).values(values);
  }
}

export async function getDraftOrder(draftId: string) {
  const result = await db
    .select({
      id: draftOrder.id,
      draftId: draftOrder.draftId,
      memberId: draftOrder.memberId,
      position: draftOrder.position,
      userId: leagueMembers.userId,
      teamName: leagueMembers.teamName,
      isBot: leagueMembers.isBot,
      userName: users.name,
      userEmail: users.email,
    })
    .from(draftOrder)
    .innerJoin(leagueMembers, eq(draftOrder.memberId, leagueMembers.id))
    .leftJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(draftOrder.draftId, draftId))
    .orderBy(asc(draftOrder.position));
  return result;
}

export async function createDraftPick(
  draftId: string,
  playerId: string,
  memberId: string,
  pickNumber: number,
  round: number
) {
  const result = await db
    .insert(draftPicks)
    .values({ draftId, playerId, memberId, pickNumber, round })
    .returning();
  return result[0];
}

export async function getDraftPicks(draftId: string) {
  const result = await db
    .select({
      id: draftPicks.id,
      draftId: draftPicks.draftId,
      playerId: draftPicks.playerId,
      memberId: draftPicks.memberId,
      pickNumber: draftPicks.pickNumber,
      round: draftPicks.round,
      pickedAt: draftPicks.pickedAt,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
      userName: users.name,
      userEmail: users.email,
      teamName: leagueMembers.teamName,
      isBot: leagueMembers.isBot,
    })
    .from(draftPicks)
    .innerJoin(players, eq(draftPicks.playerId, players.id))
    .innerJoin(leagueMembers, eq(draftPicks.memberId, leagueMembers.id))
    .leftJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(draftPicks.draftId, draftId))
    .orderBy(asc(draftPicks.pickNumber));
  return result;
}

export async function isPlayerDrafted(draftId: string, playerId: string) {
  const result = await db
    .select()
    .from(draftPicks)
    .where(and(eq(draftPicks.draftId, draftId), eq(draftPicks.playerId, playerId)))
    .limit(1);
  return result.length > 0;
}

export async function searchAvailablePlayers(
  draftId: string,
  options: { search?: string; position?: string; limit?: number }
) {
  const { search, position, limit = 50 } = options;

  // Get the leagueId from the draft
  const draft = await db.select({ leagueId: drafts.leagueId }).from(drafts).where(eq(drafts.id, draftId)).limit(1);
  const leagueId = draft[0]?.leagueId;

  // Get IDs of already-drafted players in this draft
  const draftedPlayers = await db
    .select({ playerId: draftPicks.playerId })
    .from(draftPicks)
    .where(eq(draftPicks.draftId, draftId));
  const draftedIds = draftedPlayers.map((p) => p.playerId);

  // Get IDs of players already owned in this league (via roster)
  const ownedIds = leagueId ? await getLeagueOwnedPlayerIds(leagueId) : [];

  // Combine both exclusion sets
  const excludeIds = Array.from(new Set(draftedIds.concat(ownedIds)));

  const conditions = [];
  if (excludeIds.length > 0) {
    conditions.push(notInArray(players.id, excludeIds));
  }
  if (search) {
    conditions.push(like(players.fullName, `%${search}%`));
  }
  if (position) {
    conditions.push(eq(players.position, position));
  }

  let query = db.select().from(players);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Sort by ADP ascending (nulls last), then by name as fallback
  return query.orderBy(
    sql`CASE WHEN ${players.adp} IS NULL THEN 1 ELSE 0 END`,
    asc(players.adp),
    asc(players.fullName)
  ).limit(limit);
}

// Roster queries

// Slot constants removed — now derived from league settings via generateSlotConfig()

export async function getMemberRoster(memberId: string) {
  const result = await db
    .select({
      id: rosterPlayers.id,
      memberId: rosterPlayers.memberId,
      playerId: rosterPlayers.playerId,
      slot: rosterPlayers.slot,
      acquiredVia: rosterPlayers.acquiredVia,
      acquiredAt: rosterPlayers.acquiredAt,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
      playerInjuryStatus: players.injuryStatus,
      playerStatus: players.status,
    })
    .from(rosterPlayers)
    .innerJoin(players, eq(rosterPlayers.playerId, players.id))
    .where(eq(rosterPlayers.memberId, memberId));
  return result;
}

export async function getLeagueOwnedPlayerIds(leagueId: string) {
  const memberIds = await db
    .select({ id: leagueMembers.id })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));

  if (memberIds.length === 0) return [];

  const owned = await db
    .select({ playerId: rosterPlayers.playerId })
    .from(rosterPlayers)
    .where(inArray(rosterPlayers.memberId, memberIds.map((m) => m.id)));

  return owned.map((o) => o.playerId);
}

export async function searchFreeAgents(
  leagueId: string,
  options: {
    search?: string;
    position?: string;
    limit?: number;
    sortBy?: "adp" | "seasonPoints" | "avgPoints";
    includeRostered?: boolean;
  }
) {
  const { search, position, limit = 50, sortBy = "adp", includeRostered = false } = options;

  const ownedIds = includeRostered ? [] : await getLeagueOwnedPlayerIds(leagueId);

  const conditions = [];
  if (ownedIds.length > 0) {
    conditions.push(notInArray(players.id, ownedIds));
  }
  if (search) {
    conditions.push(like(players.fullName, `%${search}%`));
  }
  if (position) {
    conditions.push(eq(players.position, position));
  }

  let query = db.select({
    id: players.id,
    fullName: players.fullName,
    position: players.position,
    team: players.team,
    adp: players.adp,
    seasonPoints: players.seasonPoints,
  }).from(players);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Sort based on sortBy option
  if (sortBy === "seasonPoints") {
    return query.orderBy(
      sql`CASE WHEN ${players.seasonPoints} IS NULL THEN 1 ELSE 0 END`,
      desc(players.seasonPoints),
      asc(players.fullName)
    ).limit(limit);
  } else if (sortBy === "avgPoints") {
    // Average points - sort by seasonPoints descending (same data, different label)
    return query.orderBy(
      sql`CASE WHEN ${players.seasonPoints} IS NULL THEN 1 ELSE 0 END`,
      desc(players.seasonPoints),
      asc(players.fullName)
    ).limit(limit);
  } else {
    // Default: sort by ADP ascending (nulls last)
    return query.orderBy(
      sql`CASE WHEN ${players.adp} IS NULL THEN 1 ELSE 0 END`,
      asc(players.adp),
      asc(players.fullName)
    ).limit(limit);
  }
}

export async function addPlayerToRoster(
  memberId: string,
  playerId: string,
  slot: string,
  acquiredVia: "draft" | "free_agent" | "trade"
) {
  const result = await db
    .insert(rosterPlayers)
    .values({ memberId, playerId, slot, acquiredVia })
    .returning();
  return result[0];
}

export async function updateRosterSlot(rosterId: string, newSlot: string) {
  await db
    .update(rosterPlayers)
    .set({ slot: newSlot })
    .where(eq(rosterPlayers.id, rosterId));
}

export async function removeRosterPlayer(rosterId: string) {
  await db.delete(rosterPlayers).where(eq(rosterPlayers.id, rosterId));
}

export async function getFirstOpenBenchSlot(memberId: string, benchSlots?: string[]) {
  const roster = await db
    .select({ slot: rosterPlayers.slot })
    .from(rosterPlayers)
    .where(eq(rosterPlayers.memberId, memberId));

  const slotsToCheck = benchSlots || ["BN1", "BN2", "BN3", "BN4", "BN5", "BN6", "BN7"];
  const occupiedSlots = new Set(roster.map((r) => r.slot));
  for (const slot of slotsToCheck) {
    if (!occupiedSlots.has(slot)) return slot;
  }
  return null;
}

export async function getFirstOpenIRSlot(memberId: string, irSlots?: string[]) {
  const roster = await db
    .select({ slot: rosterPlayers.slot })
    .from(rosterPlayers)
    .where(eq(rosterPlayers.memberId, memberId));

  const slotsToCheck = irSlots || ["IR1", "IR2"];
  const occupiedSlots = new Set(roster.map((r) => r.slot));
  for (const slot of slotsToCheck) {
    if (!occupiedSlots.has(slot)) return slot;
  }
  return null;
}

export async function getRosterPlayerBySlot(memberId: string, slot: string) {
  const result = await db
    .select()
    .from(rosterPlayers)
    .where(and(eq(rosterPlayers.memberId, memberId), eq(rosterPlayers.slot, slot)))
    .limit(1);
  return result[0] || null;
}

export async function populateRosterFromDraft(draftId: string) {
  // Get league settings for dynamic slot configuration
  const draft = await db.select().from(drafts).where(eq(drafts.id, draftId)).limit(1);
  if (!draft[0]) return;

  const settings = await getLeagueSettings(draft[0].leagueId);
  const slotConfig = generateSlotConfig(settings);

  const picks = await db
    .select({
      playerId: draftPicks.playerId,
      memberId: draftPicks.memberId,
      pickNumber: draftPicks.pickNumber,
      playerPosition: players.position,
    })
    .from(draftPicks)
    .innerJoin(players, eq(draftPicks.playerId, players.id))
    .where(eq(draftPicks.draftId, draftId))
    .orderBy(asc(draftPicks.pickNumber));

  // Group picks by member
  const memberPicks = new Map<string, { playerId: string; position: string }[]>();
  for (const pick of picks) {
    if (!memberPicks.has(pick.memberId)) {
      memberPicks.set(pick.memberId, []);
    }
    memberPicks.get(pick.memberId)!.push({
      playerId: pick.playerId,
      position: pick.playerPosition,
    });
  }

  // Slot assignment logic per member
  for (const [memberId, memberPickList] of Array.from(memberPicks.entries())) {
    const assigned = new Set<string>();

    const tryAssignStarter = (position: string): string | null => {
      // Use position-specific starter slots (excludes flex)
      const posSlots = slotConfig.positionToStarterSlots[position] || [];
      for (const slot of posSlots) {
        if (!assigned.has(slot)) {
          assigned.add(slot);
          return slot;
        }
      }
      return null;
    };

    const tryAssignBench = (): string | null => {
      for (const slot of slotConfig.benchSlots) {
        if (!assigned.has(slot)) {
          assigned.add(slot);
          return slot;
        }
      }
      return null;
    };

    for (const pick of memberPickList) {
      let slot = tryAssignStarter(pick.position);
      if (!slot) {
        slot = tryAssignBench();
      }
      if (slot) {
        await addPlayerToRoster(memberId, pick.playerId, slot, "draft");
      }
    }
  }
}

// Matchup queries

export async function createMatchups(
  matchupData: { leagueId: string; week: number; team1MemberId: string; team2MemberId: string }[]
) {
  if (matchupData.length === 0) return;
  await db.insert(matchups).values(matchupData);
}

export async function getLeagueMatchups(leagueId: string, week?: number) {
  const conditions = [eq(matchups.leagueId, leagueId)];
  if (week !== undefined) {
    conditions.push(eq(matchups.week, week));
  }

  const result = await db
    .select({
      id: matchups.id,
      leagueId: matchups.leagueId,
      week: matchups.week,
      team1MemberId: matchups.team1MemberId,
      team2MemberId: matchups.team2MemberId,
      team1Score: matchups.team1Score,
      team2Score: matchups.team2Score,
    })
    .from(matchups)
    .where(and(...conditions))
    .orderBy(asc(matchups.week));

  return result;
}

export async function getUserMatchup(memberId: string, week: number) {
  const result = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.week, week),
        or(
          eq(matchups.team1MemberId, memberId),
          eq(matchups.team2MemberId, memberId)
        )
      )
    )
    .limit(1);
  return result[0] || null;
}

export async function getMatchupCountByLeague(leagueId: string) {
  const result = await db
    .select()
    .from(matchups)
    .where(eq(matchups.leagueId, leagueId))
    .limit(1);
  return result.length;
}

export async function deleteLeagueMatchups(leagueId: string) {
  await db.delete(matchups).where(eq(matchups.leagueId, leagueId));
}

// Standings queries

export async function getScoredMatchups(leagueId: string) {
  return db
    .select({
      id: matchups.id,
      week: matchups.week,
      team1MemberId: matchups.team1MemberId,
      team2MemberId: matchups.team2MemberId,
      team1Score: matchups.team1Score,
      team2Score: matchups.team2Score,
    })
    .from(matchups)
    .where(eq(matchups.leagueId, leagueId));
}

// Trade queries

export async function createTrade(data: {
  leagueId: string;
  proposerMemberId: string;
}) {
  const result = await db.insert(trades).values(data).returning();
  return result[0];
}

export async function getTradeById(tradeId: string) {
  const result = await db.select().from(trades).where(eq(trades.id, tradeId)).limit(1);
  return result[0] || null;
}

export async function updateTradeStatus(tradeId: string, status: "proposed" | "completed" | "declined" | "canceled") {
  await db.update(trades).set({ status }).where(eq(trades.id, tradeId));
}

export async function createTradeParticipant(data: {
  tradeId: string;
  memberId: string;
  role: "proposer" | "recipient";
  decision: "accepted" | "pending";
  decidedAt?: Date | null;
}) {
  const result = await db.insert(tradeParticipants).values({
    ...data,
    decidedAt: data.decidedAt ?? null,
  }).returning();
  return result[0];
}

export async function getTradeParticipants(tradeId: string) {
  return db
    .select({
      id: tradeParticipants.id,
      tradeId: tradeParticipants.tradeId,
      memberId: tradeParticipants.memberId,
      role: tradeParticipants.role,
      decision: tradeParticipants.decision,
      decidedAt: tradeParticipants.decidedAt,
      teamName: leagueMembers.teamName,
      userName: users.name,
      userEmail: users.email,
      userId: leagueMembers.userId,
      isBot: leagueMembers.isBot,
    })
    .from(tradeParticipants)
    .innerJoin(leagueMembers, eq(tradeParticipants.memberId, leagueMembers.id))
    .leftJoin(users, eq(leagueMembers.userId, users.id))
    .where(eq(tradeParticipants.tradeId, tradeId));
}

export async function updateParticipantDecision(
  tradeId: string,
  memberId: string,
  decision: "accepted" | "declined"
) {
  await db
    .update(tradeParticipants)
    .set({ decision, decidedAt: new Date() })
    .where(and(
      eq(tradeParticipants.tradeId, tradeId),
      eq(tradeParticipants.memberId, memberId)
    ));
}

export async function createTradeItems(items: {
  tradeId: string;
  playerId: string;
  fromMemberId: string;
  toMemberId: string;
}[]) {
  if (items.length === 0) return;
  await db.insert(tradeItems).values(items);
}

export async function getTradeItems(tradeId: string) {
  return db
    .select({
      id: tradeItems.id,
      tradeId: tradeItems.tradeId,
      playerId: tradeItems.playerId,
      fromMemberId: tradeItems.fromMemberId,
      toMemberId: tradeItems.toMemberId,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
    })
    .from(tradeItems)
    .innerJoin(players, eq(tradeItems.playerId, players.id))
    .where(eq(tradeItems.tradeId, tradeId));
}

export async function getLeagueTrades(leagueId: string) {
  return db
    .select()
    .from(trades)
    .where(eq(trades.leagueId, leagueId))
    .orderBy(desc(trades.createdAt));
}

export async function getUserPendingTradesAsRecipient(memberId: string) {
  const result = await db
    .select({
      tradeId: tradeParticipants.tradeId,
      memberId: tradeParticipants.memberId,
      decision: tradeParticipants.decision,
    })
    .from(tradeParticipants)
    .where(and(
      eq(tradeParticipants.memberId, memberId),
      eq(tradeParticipants.role, "recipient"),
      eq(tradeParticipants.decision, "pending")
    ));
  return result;
}

export async function createNotification(data: {
  userId: string;
  tradeId: string;
  type: "trade_proposed" | "trade_accepted" | "trade_declined" | "trade_completed";
}) {
  await db.insert(notifications).values(data);
}

export async function getUserNotifications(userId: string, leagueId?: string) {
  const conditions = [eq(notifications.userId, userId)];
  if (leagueId) {
    conditions.push(eq(trades.leagueId, leagueId));
  }

  return db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      tradeId: notifications.tradeId,
      type: notifications.type,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      tradeStatus: trades.status,
      tradeLeagueId: trades.leagueId,
    })
    .from(notifications)
    .innerJoin(trades, eq(notifications.tradeId, trades.id))
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationsRead(tradeId: string, userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(
      eq(notifications.tradeId, tradeId),
      eq(notifications.userId, userId)
    ));
}

export async function getRosterPlayerByPlayerAndMember(memberId: string, playerId: string) {
  const result = await db
    .select()
    .from(rosterPlayers)
    .where(and(
      eq(rosterPlayers.memberId, memberId),
      eq(rosterPlayers.playerId, playerId)
    ))
    .limit(1);
  return result[0] || null;
}

// League Activity queries

export async function createLeagueActivityEvent(data: {
  leagueId: string;
  type: "trade_completed" | "free_agent_pickup";
  payload: string;
}) {
  await db.insert(leagueActivity).values(data);
}

export async function getLeagueActivityFeed(leagueId: string, limit = 30) {
  return db
    .select()
    .from(leagueActivity)
    .where(eq(leagueActivity.leagueId, leagueId))
    .orderBy(desc(leagueActivity.createdAt))
    .limit(limit);
}

// Chat queries

export async function getChatMessages(leagueId: string, limit = 50) {
  return db
    .select({
      id: chatMessages.id,
      leagueId: chatMessages.leagueId,
      type: chatMessages.type,
      userId: chatMessages.userId,
      memberId: chatMessages.memberId,
      text: chatMessages.text,
      metadata: chatMessages.metadata,
      createdAt: chatMessages.createdAt,
      teamName: leagueMembers.teamName,
      userName: users.name,
      userEmail: users.email,
    })
    .from(chatMessages)
    .leftJoin(leagueMembers, eq(chatMessages.memberId, leagueMembers.id))
    .leftJoin(users, eq(chatMessages.userId, users.id))
    .where(eq(chatMessages.leagueId, leagueId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(limit);
}

export async function createChatMessage(data: {
  leagueId: string;
  type: "user" | "system";
  userId?: string | null;
  memberId?: string | null;
  text: string;
  metadata?: string | null;
}) {
  const result = await db.insert(chatMessages).values({
    leagueId: data.leagueId,
    type: data.type,
    userId: data.userId || null,
    memberId: data.memberId || null,
    text: data.text,
    metadata: data.metadata || null,
  }).returning();
  return result[0];
}

export async function insertSystemChatMessage(
  leagueId: string,
  text: string,
  metadata?: Record<string, unknown>
) {
  return createChatMessage({
    leagueId,
    type: "system",
    text,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

// League Settings queries

export async function getLeagueSettings(leagueId: string): Promise<LeagueSettings> {
  const result = await db
    .select()
    .from(leagueSettings)
    .where(eq(leagueSettings.leagueId, leagueId))
    .limit(1);

  if (!result[0]) return { ...DEFAULT_LEAGUE_SETTINGS };

  const row = result[0];
  return {
    qbCount: row.qbCount,
    rbCount: row.rbCount,
    wrCount: row.wrCount,
    teCount: row.teCount,
    flexCount: row.flexCount,
    kCount: row.kCount,
    defCount: row.defCount,
    benchCount: row.benchCount,
    irCount: row.irCount,
    scoringFormat: row.scoringFormat as LeagueSettings["scoringFormat"],
    tradesEnabled: row.tradesEnabled,
    tradeDeadlineWeek: row.tradeDeadlineWeek,
    draftTimerSeconds: row.draftTimerSeconds,
    waiverType: (row.waiverType as LeagueSettings["waiverType"]) || "standard",
    faabBudget: row.faabBudget,
  };
}

export async function upsertLeagueSettings(
  leagueId: string,
  settings: Partial<LeagueSettings>
) {
  const existing = await db
    .select()
    .from(leagueSettings)
    .where(eq(leagueSettings.leagueId, leagueId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(leagueSettings)
      .set({ ...settings })
      .where(eq(leagueSettings.leagueId, leagueId));
  } else {
    await db
      .insert(leagueSettings)
      .values({ leagueId, ...DEFAULT_LEAGUE_SETTINGS, ...settings });
  }
}

// Mock league queries

export async function getMemberRosterWithAdp(memberId: string) {
  const result = await db
    .select({
      id: rosterPlayers.id,
      memberId: rosterPlayers.memberId,
      playerId: rosterPlayers.playerId,
      slot: rosterPlayers.slot,
      acquiredVia: rosterPlayers.acquiredVia,
      acquiredAt: rosterPlayers.acquiredAt,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
      playerInjuryStatus: players.injuryStatus,
      playerStatus: players.status,
      playerAdp: players.adp,
    })
    .from(rosterPlayers)
    .innerJoin(players, eq(rosterPlayers.playerId, players.id))
    .where(eq(rosterPlayers.memberId, memberId));
  return result;
}

export async function updateMatchupScores(
  matchupId: string,
  team1Score: number,
  team2Score: number
) {
  await db
    .update(matchups)
    .set({ team1Score, team2Score })
    .where(eq(matchups.id, matchupId));
}

export async function updateLeagueCurrentWeek(leagueId: string, week: number) {
  await db
    .update(leagues)
    .set({ currentWeek: week })
    .where(eq(leagues.id, leagueId));
}

export async function updateLeaguePhase(
  leagueId: string,
  phase: "setup" | "drafting" | "pre_week" | "week_active" | "complete"
) {
  await db
    .update(leagues)
    .set({ phase })
    .where(eq(leagues.id, leagueId));
}

export async function updateLeagueWeekAndPhase(
  leagueId: string,
  week: number,
  phase: "setup" | "drafting" | "pre_week" | "week_active" | "complete"
) {
  await db
    .update(leagues)
    .set({ currentWeek: week, phase })
    .where(eq(leagues.id, leagueId));
}

// Bot-related queries

export async function getLeagueBotMembers(leagueId: string) {
  const result = await db
    .select({
      id: leagueMembers.id,
      teamName: leagueMembers.teamName,
      isBot: leagueMembers.isBot,
    })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.isBot, true)));
  return result;
}

export async function getMemberById(memberId: string) {
  const result = await db
    .select({
      id: leagueMembers.id,
      leagueId: leagueMembers.leagueId,
      userId: leagueMembers.userId,
      teamName: leagueMembers.teamName,
      isCommissioner: leagueMembers.isCommissioner,
      isBot: leagueMembers.isBot,
    })
    .from(leagueMembers)
    .where(eq(leagueMembers.id, memberId))
    .limit(1);
  return result[0] || null;
}

export async function getBestAvailablePlayerByAdp(
  draftId: string,
  options?: { position?: string }
) {
  // Get IDs of already-drafted players
  const draftedPlayers = await db
    .select({ playerId: draftPicks.playerId })
    .from(draftPicks)
    .where(eq(draftPicks.draftId, draftId));
  const draftedIds = draftedPlayers.map((p) => p.playerId);

  const conditions = [];
  if (draftedIds.length > 0) {
    conditions.push(notInArray(players.id, draftedIds));
  }
  if (options?.position) {
    conditions.push(eq(players.position, options.position));
  }
  // Only consider players with a team (active players)
  conditions.push(isNotNull(players.team));

  let query = db.select().from(players);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Sort by ADP ascending (best ADP = lowest number), nulls last
  const result = await query
    .orderBy(
      sql`CASE WHEN ${players.adp} IS NULL THEN 1 ELSE 0 END`,
      asc(players.adp),
      asc(players.fullName)
    )
    .limit(1);

  return result[0] || null;
}

// Mock Player Stats queries

export async function getMockPlayerStats(leagueId: string, week: number) {
  const result = await db
    .select({
      id: mockPlayerStats.id,
      leagueId: mockPlayerStats.leagueId,
      playerId: mockPlayerStats.playerId,
      week: mockPlayerStats.week,
      points: mockPlayerStats.points,
      isOnBye: mockPlayerStats.isOnBye,
      isInjured: mockPlayerStats.isInjured,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
    })
    .from(mockPlayerStats)
    .innerJoin(players, eq(mockPlayerStats.playerId, players.id))
    .where(
      and(
        eq(mockPlayerStats.leagueId, leagueId),
        eq(mockPlayerStats.week, week)
      )
    );
  return result;
}

export async function getMockPlayerStatsForPlayer(
  leagueId: string,
  playerId: string,
  week: number
) {
  const result = await db
    .select()
    .from(mockPlayerStats)
    .where(
      and(
        eq(mockPlayerStats.leagueId, leagueId),
        eq(mockPlayerStats.playerId, playerId),
        eq(mockPlayerStats.week, week)
      )
    )
    .limit(1);
  return result[0] || null;
}

export async function createMockPlayerStats(data: {
  leagueId: string;
  playerId: string;
  week: number;
  points: number;
  isOnBye?: boolean;
  isInjured?: boolean;
}) {
  const result = await db
    .insert(mockPlayerStats)
    .values({
      leagueId: data.leagueId,
      playerId: data.playerId,
      week: data.week,
      points: data.points,
      isOnBye: data.isOnBye ?? false,
      isInjured: data.isInjured ?? false,
    })
    .returning();
  return result[0];
}

export async function createMockPlayerStatsBatch(
  stats: {
    leagueId: string;
    playerId: string;
    week: number;
    points: number;
    isOnBye?: boolean;
    isInjured?: boolean;
  }[]
) {
  if (stats.length === 0) return [];
  const result = await db
    .insert(mockPlayerStats)
    .values(
      stats.map((s) => ({
        leagueId: s.leagueId,
        playerId: s.playerId,
        week: s.week,
        points: s.points,
        isOnBye: s.isOnBye ?? false,
        isInjured: s.isInjured ?? false,
      }))
    )
    .returning();
  return result;
}

export async function mockStatsExistForWeek(leagueId: string, week: number) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(mockPlayerStats)
    .where(
      and(
        eq(mockPlayerStats.leagueId, leagueId),
        eq(mockPlayerStats.week, week)
      )
    );
  return (result[0]?.count ?? 0) > 0;
}

export async function getAllRosteredPlayerIds(leagueId: string) {
  const result = await db
    .select({ playerId: rosterPlayers.playerId })
    .from(rosterPlayers)
    .innerJoin(leagueMembers, eq(rosterPlayers.memberId, leagueMembers.id))
    .where(eq(leagueMembers.leagueId, leagueId));
  return result.map((r) => r.playerId);
}

// ============================================================================
// WAIVER SYSTEM QUERIES
// ============================================================================

// Check if a player is on waivers in a league
export async function isPlayerOnWaivers(leagueId: string, playerId: string) {
  const result = await db
    .select()
    .from(waiverPlayers)
    .where(
      and(
        eq(waiverPlayers.leagueId, leagueId),
        eq(waiverPlayers.playerId, playerId)
      )
    )
    .limit(1);
  return result.length > 0;
}

// Get all players currently on waivers in a league
export async function getWaiverPlayers(leagueId: string) {
  return db
    .select({
      id: waiverPlayers.id,
      playerId: waiverPlayers.playerId,
      waiverStart: waiverPlayers.waiverStart,
      waiverEnd: waiverPlayers.waiverEnd,
      droppedByMemberId: waiverPlayers.droppedByMemberId,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
    })
    .from(waiverPlayers)
    .innerJoin(players, eq(waiverPlayers.playerId, players.id))
    .where(eq(waiverPlayers.leagueId, leagueId))
    .orderBy(desc(waiverPlayers.waiverStart));
}

// Add a player to waivers
export async function addPlayerToWaivers(
  leagueId: string,
  playerId: string,
  droppedByMemberId?: string
) {
  return db
    .insert(waiverPlayers)
    .values({
      leagueId,
      playerId,
      droppedByMemberId: droppedByMemberId || null,
      waiverStart: new Date(),
    })
    .onConflictDoUpdate({
      target: [waiverPlayers.leagueId, waiverPlayers.playerId],
      set: {
        waiverStart: new Date(),
        droppedByMemberId: droppedByMemberId || null,
      },
    });
}

// Remove a player from waivers (make them a free agent)
export async function removePlayerFromWaivers(leagueId: string, playerId: string) {
  return db
    .delete(waiverPlayers)
    .where(
      and(
        eq(waiverPlayers.leagueId, leagueId),
        eq(waiverPlayers.playerId, playerId)
      )
    );
}

// Clear all waivers for a league (make all players free agents)
export async function clearAllWaivers(leagueId: string) {
  return db.delete(waiverPlayers).where(eq(waiverPlayers.leagueId, leagueId));
}

// Submit a waiver claim
export async function submitWaiverClaim(
  leagueId: string,
  memberId: string,
  playerId: string,
  priority: number,
  bidAmount?: number,
  dropPlayerId?: string
) {
  return db
    .insert(waiverClaims)
    .values({
      leagueId,
      memberId,
      playerId,
      priority,
      bidAmount: bidAmount ?? 0,
      dropPlayerId: dropPlayerId || null,
      status: "pending",
    })
    .returning();
}

// Get pending waiver claims for a league
export async function getPendingWaiverClaims(leagueId: string) {
  return db
    .select({
      id: waiverClaims.id,
      memberId: waiverClaims.memberId,
      playerId: waiverClaims.playerId,
      bidAmount: waiverClaims.bidAmount,
      priority: waiverClaims.priority,
      dropPlayerId: waiverClaims.dropPlayerId,
      status: waiverClaims.status,
      createdAt: waiverClaims.createdAt,
      playerName: players.fullName,
      playerPosition: players.position,
    })
    .from(waiverClaims)
    .innerJoin(players, eq(waiverClaims.playerId, players.id))
    .where(
      and(
        eq(waiverClaims.leagueId, leagueId),
        eq(waiverClaims.status, "pending")
      )
    )
    .orderBy(asc(waiverClaims.priority), desc(waiverClaims.bidAmount));
}

// Get waiver claims by member
export async function getMemberWaiverClaims(memberId: string) {
  return db
    .select({
      id: waiverClaims.id,
      playerId: waiverClaims.playerId,
      bidAmount: waiverClaims.bidAmount,
      priority: waiverClaims.priority,
      dropPlayerId: waiverClaims.dropPlayerId,
      status: waiverClaims.status,
      createdAt: waiverClaims.createdAt,
      playerName: players.fullName,
      playerPosition: players.position,
    })
    .from(waiverClaims)
    .innerJoin(players, eq(waiverClaims.playerId, players.id))
    .where(eq(waiverClaims.memberId, memberId))
    .orderBy(desc(waiverClaims.createdAt));
}

// Update waiver claim status
export async function updateWaiverClaimStatus(
  claimId: string,
  status: "pending" | "awarded" | "outbid" | "canceled"
) {
  return db
    .update(waiverClaims)
    .set({ status, processedAt: status !== "pending" ? new Date() : null })
    .where(eq(waiverClaims.id, claimId));
}

// Cancel a waiver claim
export async function cancelWaiverClaim(claimId: string, memberId: string) {
  return db
    .update(waiverClaims)
    .set({ status: "canceled" })
    .where(
      and(
        eq(waiverClaims.id, claimId),
        eq(waiverClaims.memberId, memberId),
        eq(waiverClaims.status, "pending")
      )
    );
}

// FAAB Balance queries

// Initialize FAAB balances for all members in a league
export async function initializeFaabBalances(leagueId: string, budget: number) {
  const members = await getLeagueMembers(leagueId);

  for (const member of members) {
    await db
      .insert(faabBalances)
      .values({
        leagueId,
        memberId: member.id,
        balance: budget,
        initialBudget: budget,
      })
      .onConflictDoNothing();
  }
}

// Get FAAB balance for a member
export async function getFaabBalance(memberId: string) {
  const result = await db
    .select()
    .from(faabBalances)
    .where(eq(faabBalances.memberId, memberId))
    .limit(1);
  return result[0];
}

// Get all FAAB balances for a league
export async function getLeagueFaabBalances(leagueId: string) {
  return db
    .select({
      memberId: faabBalances.memberId,
      balance: faabBalances.balance,
      initialBudget: faabBalances.initialBudget,
      teamName: leagueMembers.teamName,
    })
    .from(faabBalances)
    .innerJoin(leagueMembers, eq(faabBalances.memberId, leagueMembers.id))
    .where(eq(faabBalances.leagueId, leagueId))
    .orderBy(desc(faabBalances.balance));
}

// Deduct FAAB from a member's balance
export async function deductFaabBalance(memberId: string, amount: number) {
  return db
    .update(faabBalances)
    .set({
      balance: sql`${faabBalances.balance} - ${amount}`,
    })
    .where(eq(faabBalances.memberId, memberId));
}

// Waiver Order queries

// Initialize waiver order for a league (reverse of standings or random for new leagues)
export async function initializeWaiverOrder(leagueId: string) {
  const members = await getLeagueMembers(leagueId);

  // Initial order is reverse of member join order (last to join gets first priority)
  // This will be updated based on standings later
  const reversedMembers = [...members].reverse();

  for (let i = 0; i < reversedMembers.length; i++) {
    await db
      .insert(waiverOrder)
      .values({
        leagueId,
        memberId: reversedMembers[i].id,
        position: i + 1,
      })
      .onConflictDoUpdate({
        target: [waiverOrder.leagueId, waiverOrder.memberId],
        set: { position: i + 1 },
      });
  }
}

// Get waiver order for a league
export async function getWaiverOrder(leagueId: string) {
  return db
    .select({
      memberId: waiverOrder.memberId,
      position: waiverOrder.position,
      teamName: leagueMembers.teamName,
    })
    .from(waiverOrder)
    .innerJoin(leagueMembers, eq(waiverOrder.memberId, leagueMembers.id))
    .where(eq(waiverOrder.leagueId, leagueId))
    .orderBy(asc(waiverOrder.position));
}

// Move a member to the back of the waiver order (after a successful claim)
export async function moveToBackOfWaiverOrder(leagueId: string, memberId: string) {
  // Get current order
  const currentOrder = await getWaiverOrder(leagueId);

  // Find the member's current position
  const memberIndex = currentOrder.findIndex(o => o.memberId === memberId);
  if (memberIndex === -1) return;

  // Move everyone below them up by 1, and put this member at the end
  for (let i = memberIndex + 1; i < currentOrder.length; i++) {
    await db
      .update(waiverOrder)
      .set({ position: i })
      .where(
        and(
          eq(waiverOrder.leagueId, leagueId),
          eq(waiverOrder.memberId, currentOrder[i].memberId)
        )
      );
  }

  // Put the member at the end
  await db
    .update(waiverOrder)
    .set({ position: currentOrder.length })
    .where(
      and(
        eq(waiverOrder.leagueId, leagueId),
        eq(waiverOrder.memberId, memberId)
      )
    );
}

// Update waiver order based on standings (reverse standings = last place gets first priority)
export async function updateWaiverOrderFromStandings(leagueId: string, standingsOrder: string[]) {
  // standingsOrder is an array of memberIds from best to worst
  // We want reverse order for waivers (worst team = first priority)
  const reversedOrder = [...standingsOrder].reverse();

  for (let i = 0; i < reversedOrder.length; i++) {
    await db
      .update(waiverOrder)
      .set({ position: i + 1 })
      .where(
        and(
          eq(waiverOrder.leagueId, leagueId),
          eq(waiverOrder.memberId, reversedOrder[i])
        )
      );
  }
}

// ============================================================================
// TRADE BLOCK AND WATCHLIST QUERIES
// ============================================================================

// Add a player to the trade block
export async function addToTradeBlock(memberId: string, playerId: string, note?: string) {
  const result = await db
    .insert(tradeBlock)
    .values({ memberId, playerId, note })
    .onConflictDoUpdate({
      target: [tradeBlock.memberId, tradeBlock.playerId],
      set: { note },
    })
    .returning();
  return result[0];
}

// Remove a player from the trade block
export async function removeFromTradeBlock(memberId: string, playerId: string) {
  await db
    .delete(tradeBlock)
    .where(
      and(
        eq(tradeBlock.memberId, memberId),
        eq(tradeBlock.playerId, playerId)
      )
    );
}

// Get all players on a member's trade block
export async function getMemberTradeBlock(memberId: string) {
  return await db
    .select({
      id: tradeBlock.id,
      playerId: tradeBlock.playerId,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
      note: tradeBlock.note,
      createdAt: tradeBlock.createdAt,
    })
    .from(tradeBlock)
    .innerJoin(players, eq(tradeBlock.playerId, players.id))
    .where(eq(tradeBlock.memberId, memberId))
    .orderBy(desc(tradeBlock.createdAt));
}

// Get all trade block players in a league (for viewing other teams' trade blocks)
export async function getLeagueTradeBlock(leagueId: string) {
  return await db
    .select({
      id: tradeBlock.id,
      memberId: tradeBlock.memberId,
      playerId: tradeBlock.playerId,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
      note: tradeBlock.note,
      teamName: leagueMembers.teamName,
      createdAt: tradeBlock.createdAt,
    })
    .from(tradeBlock)
    .innerJoin(players, eq(tradeBlock.playerId, players.id))
    .innerJoin(leagueMembers, eq(tradeBlock.memberId, leagueMembers.id))
    .where(eq(leagueMembers.leagueId, leagueId))
    .orderBy(desc(tradeBlock.createdAt));
}

// Check if a player is on the trade block
export async function isPlayerOnTradeBlock(memberId: string, playerId: string) {
  const result = await db
    .select({ id: tradeBlock.id })
    .from(tradeBlock)
    .where(
      and(
        eq(tradeBlock.memberId, memberId),
        eq(tradeBlock.playerId, playerId)
      )
    )
    .limit(1);
  return result.length > 0;
}

// Add a player to the watchlist
export async function addToWatchlist(memberId: string, playerId: string) {
  const result = await db
    .insert(watchlist)
    .values({ memberId, playerId })
    .onConflictDoNothing()
    .returning();
  return result[0];
}

// Remove a player from the watchlist
export async function removeFromWatchlist(memberId: string, playerId: string) {
  await db
    .delete(watchlist)
    .where(
      and(
        eq(watchlist.memberId, memberId),
        eq(watchlist.playerId, playerId)
      )
    );
}

// Get a member's watchlist
export async function getMemberWatchlist(memberId: string) {
  return await db
    .select({
      id: watchlist.id,
      playerId: watchlist.playerId,
      playerName: players.fullName,
      playerPosition: players.position,
      playerTeam: players.team,
      createdAt: watchlist.createdAt,
    })
    .from(watchlist)
    .innerJoin(players, eq(watchlist.playerId, players.id))
    .where(eq(watchlist.memberId, memberId))
    .orderBy(desc(watchlist.createdAt));
}

// Check if a player is on the watchlist
export async function isPlayerOnWatchlist(memberId: string, playerId: string) {
  const result = await db
    .select({ id: watchlist.id })
    .from(watchlist)
    .where(
      and(
        eq(watchlist.memberId, memberId),
        eq(watchlist.playerId, playerId)
      )
    )
    .limit(1);
  return result.length > 0;
}

// Get watchlist player IDs for a member (for quick lookup)
export async function getWatchlistPlayerIds(memberId: string): Promise<string[]> {
  const result = await db
    .select({ playerId: watchlist.playerId })
    .from(watchlist)
    .where(eq(watchlist.memberId, memberId));
  return result.map(r => r.playerId);
}

// Get trade block player IDs for a member (for quick lookup)
export async function getTradeBlockPlayerIds(memberId: string): Promise<string[]> {
  const result = await db
    .select({ playerId: tradeBlock.playerId })
    .from(tradeBlock)
    .where(eq(tradeBlock.memberId, memberId));
  return result.map(r => r.playerId);
}

