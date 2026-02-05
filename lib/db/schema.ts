import { pgTable, text, integer, doublePrecision, boolean, timestamp, date, decimal, unique } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  isAdmin: boolean("is_admin")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const leagues = pgTable("leagues", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  numberOfTeams: integer("number_of_teams").notNull().default(12),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  currentWeek: integer("current_week").notNull().default(0),
  phase: text("phase", {
    enum: ["setup", "drafting", "pre_week", "week_active", "complete"],
  })
    .notNull()
    .default("setup"),
  isMock: boolean("is_mock")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const leagueSettings = pgTable("league_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .unique()
    .references(() => leagues.id),
  qbCount: integer("qb_count").notNull().default(1),
  rbCount: integer("rb_count").notNull().default(2),
  wrCount: integer("wr_count").notNull().default(2),
  teCount: integer("te_count").notNull().default(1),
  flexCount: integer("flex_count").notNull().default(1),
  kCount: integer("k_count").notNull().default(1),
  defCount: integer("def_count").notNull().default(1),
  benchCount: integer("bench_count").notNull().default(7),
  irCount: integer("ir_count").notNull().default(2),
  scoringFormat: text("scoring_format", {
    enum: ["standard", "half_ppr", "ppr"],
  }).notNull().default("standard"),
  tradesEnabled: boolean("trades_enabled")
    .notNull()
    .default(true),
  tradeDeadlineWeek: integer("trade_deadline_week"),
  draftTimerSeconds: integer("draft_timer_seconds").notNull().default(120),
  // Waiver settings
  waiverType: text("waiver_type", {
    enum: ["none", "standard", "faab"],
  }).notNull().default("standard"),
  faabBudget: integer("faab_budget"), // Only used when waiverType is "faab"
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const leagueMembers = pgTable("league_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  userId: text("user_id")
    .references(() => users.id),
  teamName: text("team_name"),
  isCommissioner: boolean("is_commissioner")
    .notNull()
    .default(false),
  isBot: boolean("is_bot")
    .notNull()
    .default(false),
  joinedAt: timestamp("joined_at")
    .notNull()
    .defaultNow(),
});

export const drafts = pgTable("drafts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  status: text("status", { enum: ["scheduled", "in_progress", "completed"] })
    .notNull()
    .default("scheduled"),
  numberOfRounds: integer("number_of_rounds").notNull().default(15),
  currentPick: integer("current_pick").notNull().default(1),
  scheduledAt: timestamp("scheduled_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const draftOrder = pgTable("draft_order", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  draftId: text("draft_id")
    .notNull()
    .references(() => drafts.id),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  position: integer("position").notNull(),
});

export const draftPicks = pgTable("draft_picks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  draftId: text("draft_id")
    .notNull()
    .references(() => drafts.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  pickNumber: integer("pick_number").notNull(),
  round: integer("round").notNull(),
  pickedAt: timestamp("picked_at")
    .notNull()
    .defaultNow(),
});

export const rosterPlayers = pgTable("roster_players", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  slot: text("slot").notNull(),
  acquiredVia: text("acquired_via", { enum: ["draft", "free_agent", "trade", "waiver"] })
    .notNull()
    .default("draft"),
  acquiredAt: timestamp("acquired_at")
    .notNull()
    .defaultNow(),
});

export const matchups = pgTable("matchups", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  week: integer("week").notNull(),
  team1MemberId: text("team1_member_id")
    .notNull()
    .references(() => leagueMembers.id),
  team2MemberId: text("team2_member_id")
    .notNull()
    .references(() => leagueMembers.id),
  team1Score: doublePrecision("team1_score"),
  team2Score: doublePrecision("team2_score"),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

export const players = pgTable("players", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sleeperId: text("sleeper_id").notNull().unique(),
  rapidApiId: text("rapid_api_id").unique(),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  team: text("team"),
  position: text("position").notNull(),
  status: text("status"),
  injuryStatus: text("injury_status"),
  age: integer("age"),
  yearsExp: integer("years_exp"),
  number: integer("number"),
  height: text("height"),
  weight: text("weight"),
  college: text("college"),
  headshotUrl: text("headshot_url"),
  adp: doublePrecision("adp"),
  seasonPoints: doublePrecision("season_points"),
  rawStats: text("raw_stats"),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const trades = pgTable("trades", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  proposerMemberId: text("proposer_member_id")
    .notNull()
    .references(() => leagueMembers.id),
  status: text("status", { enum: ["proposed", "completed", "declined", "canceled"] })
    .notNull()
    .default("proposed"),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

export const tradeParticipants = pgTable("trade_participants", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tradeId: text("trade_id")
    .notNull()
    .references(() => trades.id),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  role: text("role", { enum: ["proposer", "recipient"] }).notNull(),
  decision: text("decision", { enum: ["accepted", "pending", "declined"] })
    .notNull()
    .default("pending"),
  decidedAt: timestamp("decided_at"),
});

export const tradeItems = pgTable("trade_items", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tradeId: text("trade_id")
    .notNull()
    .references(() => trades.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  fromMemberId: text("from_member_id")
    .notNull()
    .references(() => leagueMembers.id),
  toMemberId: text("to_member_id")
    .notNull()
    .references(() => leagueMembers.id),
});

export const leagueActivity = pgTable("league_activity", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  type: text("type", { enum: ["trade_completed", "free_agent_pickup", "waiver_claim", "player_dropped"] }).notNull(),
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tradeId: text("trade_id")
    .notNull()
    .references(() => trades.id),
  type: text("type", { enum: ["trade_proposed", "trade_accepted", "trade_declined", "trade_completed"] })
    .notNull(),
  isRead: boolean("is_read")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  type: text("type", { enum: ["user", "system"] }).notNull().default("user"),
  userId: text("user_id").references(() => users.id),
  memberId: text("member_id").references(() => leagueMembers.id),
  text: text("text").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

// Mock league weekly player stats (generated randomly for mock leagues)
export const mockPlayerStats = pgTable("mock_player_stats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  week: integer("week").notNull(),
  points: doublePrecision("points").notNull(),
  isOnBye: boolean("is_on_bye")
    .notNull()
    .default(false),
  isInjured: boolean("is_injured")
    .notNull()
    .default(false),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

// Historical game-by-game stats for players (past 3 seasons)
export const playerGameStats = pgTable("player_game_stats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),

  // Game identification
  gameId: text("game_id").notNull(),  // e.g., "20240211_SF@KC"
  season: integer("season").notNull(),  // e.g., 2024
  week: integer("week").notNull(),  // 1-18 regular, 19+ playoffs
  opponent: text("opponent"),  // team abbreviation
  isHome: boolean("is_home").default(false),
  gameDate: date("game_date"),

  // Passing stats
  passAttempts: integer("pass_attempts").default(0),
  passCompletions: integer("pass_completions").default(0),
  passYards: integer("pass_yards").default(0),
  passTds: integer("pass_tds").default(0),
  passInts: integer("pass_ints").default(0),
  passRating: doublePrecision("pass_rating"),
  qbr: doublePrecision("qbr"),
  timesSacked: integer("times_sacked").default(0),
  sackYardsLost: integer("sack_yards_lost").default(0),

  // Rushing stats
  rushAttempts: integer("rush_attempts").default(0),
  rushYards: integer("rush_yards").default(0),
  rushTds: integer("rush_tds").default(0),
  rushLong: integer("rush_long").default(0),

  // Receiving stats
  targets: integer("targets").default(0),
  receptions: integer("receptions").default(0),
  recYards: integer("rec_yards").default(0),
  recTds: integer("rec_tds").default(0),
  recLong: integer("rec_long").default(0),

  // Kicking stats
  fgMade: integer("fg_made").default(0),
  fgAttempted: integer("fg_attempted").default(0),
  fgLong: integer("fg_long").default(0),
  xpMade: integer("xp_made").default(0),
  xpAttempted: integer("xp_attempted").default(0),

  // Defense stats
  defTackles: integer("def_tackles").default(0),
  defSacks: doublePrecision("def_sacks").default(0),
  defInts: integer("def_ints").default(0),
  defFumblesForced: integer("def_fumbles_forced").default(0),
  defFumblesRecovered: integer("def_fumbles_recovered").default(0),
  defTds: integer("def_tds").default(0),
  defPointsAllowed: integer("def_points_allowed"),

  // Fumbles
  fumbles: integer("fumbles").default(0),
  fumblesLost: integer("fumbles_lost").default(0),

  // Snap counts
  offSnaps: integer("off_snaps").default(0),
  offSnapPct: doublePrecision("off_snap_pct").default(0),
  defSnaps: integer("def_snaps").default(0),
  defSnapPct: doublePrecision("def_snap_pct").default(0),

  // Fantasy points (pre-calculated)
  fantasyPointsStandard: doublePrecision("fantasy_points_standard"),
  fantasyPointsPpr: doublePrecision("fantasy_points_ppr"),
  fantasyPointsHalfPpr: doublePrecision("fantasy_points_half_ppr"),

  // Metadata
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  // Unique constraint to prevent duplicates
  playerGameUnique: unique().on(table.playerId, table.gameId),
}));

// ============================================================================
// WAIVER SYSTEM TABLES
// ============================================================================

// Track players currently on waivers in a league
export const waiverPlayers = pgTable("waiver_players", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  // When the player was put on waivers
  waiverStart: timestamp("waiver_start")
    .notNull()
    .defaultNow(),
  // When the waiver period ends (after processing, player becomes free agent)
  waiverEnd: timestamp("waiver_end"),
  // Who dropped the player (null if never rostered)
  droppedByMemberId: text("dropped_by_member_id")
    .references(() => leagueMembers.id),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
}, (table) => ({
  // A player can only be on waivers once per league at a time
  leaguePlayerUnique: unique().on(table.leagueId, table.playerId),
}));

// Track waiver claims submitted by teams
export const waiverClaims = pgTable("waiver_claims", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  // For FAAB leagues
  bidAmount: integer("bid_amount").default(0),
  // Priority order (lower = higher priority, for standard waivers)
  priority: integer("priority").notNull(),
  // Player to drop if roster is full (optional)
  dropPlayerId: text("drop_player_id")
    .references(() => players.id),
  status: text("status", { enum: ["pending", "awarded", "outbid", "canceled"] })
    .notNull()
    .default("pending"),
  // When the claim was processed
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

// Track FAAB budgets for each team
export const faabBalances = pgTable("faab_balances", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  // Remaining budget
  balance: integer("balance").notNull(),
  // Initial budget (for reference)
  initialBudget: integer("initial_budget").notNull(),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  // One balance per member per league
  leagueMemberUnique: unique().on(table.leagueId, table.memberId),
}));

// Track waiver order for standard waiver leagues (reverse standings)
export const waiverOrder = pgTable("waiver_order", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  // Position in waiver order (1 = first priority)
  position: integer("position").notNull(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  // One position per member per league
  leagueMemberUnique: unique().on(table.leagueId, table.memberId),
}));

// ============================================================================
// TRADE BLOCK AND WATCHLIST TABLES
// ============================================================================

// Trade block: players marked as available for trade by their owners
export const tradeBlock = pgTable("trade_block", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id, { onDelete: "cascade" }),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  note: text("note"),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
}, (table) => ({
  memberPlayerUnique: unique().on(table.memberId, table.playerId),
}));

// Watchlist: players that users are interested in acquiring
export const watchlist = pgTable("watchlist", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id, { onDelete: "cascade" }),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
}, (table) => ({
  memberPlayerUnique: unique().on(table.memberId, table.playerId),
}));
