import { eq, and, or, like, desc, asc, notInArray, inArray, sql, isNotNull, ne } from "drizzle-orm";
import { db } from "./index";
import { users, leagues, leagueMembers, players, drafts, draftOrder, draftPicks, rosterPlayers, matchups, trades, tradeParticipants, tradeItems, notifications, leagueActivity, chatMessages, leagueSettings } from "./schema";
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
  createdBy: string
) {
  const result = await db
    .insert(leagues)
    .values({ name, numberOfTeams, inviteCode, createdBy })
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
      createdAt: leagues.createdAt,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(and(eq(leagueMembers.userId, userId), eq(leagues.isMockLeague, false)));

  return result;
}

export async function getUserMockLeagues(userId: string) {
  const result = await db
    .select({
      id: leagues.id,
      name: leagues.name,
      numberOfTeams: leagues.numberOfTeams,
      currentWeek: leagues.currentWeek,
      createdAt: leagues.createdAt,
    })
    .from(leagueMembers)
    .innerJoin(leagues, eq(leagueMembers.leagueId, leagues.id))
    .where(and(eq(leagueMembers.userId, userId), eq(leagues.isMockLeague, true)));

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
      isBot: leagueMembers.isBot,
      isCommissioner: leagueMembers.isCommissioner,
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
  options: { search?: string; position?: string; limit?: number }
) {
  const { search, position, limit = 50 } = options;

  const ownedIds = await getLeagueOwnedPlayerIds(leagueId);

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
    })
    .from(tradeParticipants)
    .innerJoin(leagueMembers, eq(tradeParticipants.memberId, leagueMembers.id))
    .innerJoin(users, eq(leagueMembers.userId, users.id))
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

export async function deleteMockLeagueData(leagueId: string) {
  // Delete in reverse dependency order
  await db.delete(matchups).where(eq(matchups.leagueId, leagueId));

  // Get all member IDs for this league
  const members = await db
    .select({ id: leagueMembers.id })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, leagueId));
  const memberIds = members.map((m) => m.id);

  if (memberIds.length > 0) {
    await db.delete(rosterPlayers).where(inArray(rosterPlayers.memberId, memberIds));
  }

  // Get draft for this league
  const draft = await db
    .select({ id: drafts.id })
    .from(drafts)
    .where(eq(drafts.leagueId, leagueId))
    .limit(1);

  if (draft[0]) {
    await db.delete(draftPicks).where(eq(draftPicks.draftId, draft[0].id));
    await db.delete(draftOrder).where(eq(draftOrder.draftId, draft[0].id));
    await db.delete(drafts).where(eq(drafts.id, draft[0].id));
  }

  await db.delete(leagueSettings).where(eq(leagueSettings.leagueId, leagueId));
  await db.delete(leagueMembers).where(eq(leagueMembers.leagueId, leagueId));
  await db.delete(leagues).where(eq(leagues.id, leagueId));
}
