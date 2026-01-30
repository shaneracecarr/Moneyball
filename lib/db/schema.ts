import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  isAdmin: integer("is_admin", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const leagues = sqliteTable("leagues", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  numberOfTeams: integer("number_of_teams").notNull().default(12),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  isMockLeague: integer("is_mock_league", { mode: "boolean" })
    .notNull()
    .default(false),
  currentWeek: integer("current_week").notNull().default(0),
  phase: text("phase", {
    enum: ["setup", "drafting", "pre_week", "week_active", "complete"],
  })
    .notNull()
    .default("setup"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const leagueSettings = sqliteTable("league_settings", {
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
  tradesEnabled: integer("trades_enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  tradeDeadlineWeek: integer("trade_deadline_week"),
  draftTimerSeconds: integer("draft_timer_seconds").notNull().default(120),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const leagueMembers = sqliteTable("league_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  userId: text("user_id")
    .references(() => users.id),
  teamName: text("team_name"),
  isBot: integer("is_bot", { mode: "boolean" })
    .notNull()
    .default(false),
  isCommissioner: integer("is_commissioner", { mode: "boolean" })
    .notNull()
    .default(false),
  joinedAt: integer("joined_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const drafts = sqliteTable("drafts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  status: text("status", { enum: ["scheduled", "in_progress", "completed"] })
    .notNull()
    .default("scheduled"),
  numberOfRounds: integer("number_of_rounds").notNull().default(15),
  currentPick: integer("current_pick").notNull().default(1),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const draftOrder = sqliteTable("draft_order", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  draftId: text("draft_id")
    .notNull()
    .references(() => drafts.id),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  position: integer("position").notNull(),
});

export const draftPicks = sqliteTable("draft_picks", {
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
  pickedAt: integer("picked_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const rosterPlayers = sqliteTable("roster_players", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text("member_id")
    .notNull()
    .references(() => leagueMembers.id),
  playerId: text("player_id")
    .notNull()
    .references(() => players.id),
  slot: text("slot").notNull(),
  acquiredVia: text("acquired_via", { enum: ["draft", "free_agent", "trade"] })
    .notNull()
    .default("draft"),
  acquiredAt: integer("acquired_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const matchups = sqliteTable("matchups", {
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
  team1Score: real("team1_score"),
  team2Score: real("team2_score"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const players = sqliteTable("players", {
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
  adp: real("adp"),
  seasonPoints: real("season_points"),
  rawStats: text("raw_stats"),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});

export const trades = sqliteTable("trades", {
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const tradeParticipants = sqliteTable("trade_participants", {
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
  decidedAt: integer("decided_at", { mode: "timestamp" }),
});

export const tradeItems = sqliteTable("trade_items", {
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

export const leagueActivity = sqliteTable("league_activity", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  type: text("type", { enum: ["trade_completed", "free_agent_pickup"] }).notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tradeId: text("trade_id")
    .notNull()
    .references(() => trades.id),
  type: text("type", { enum: ["trade_proposed", "trade_accepted", "trade_declined", "trade_completed"] })
    .notNull(),
  isRead: integer("is_read", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  leagueId: text("league_id")
    .notNull()
    .references(() => leagues.id),
  type: text("type", { enum: ["user", "system"] }).notNull().default("user"),
  userId: text("user_id").references(() => users.id),
  memberId: text("member_id").references(() => leagueMembers.id),
  text: text("text").notNull(),
  metadata: text("metadata"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
