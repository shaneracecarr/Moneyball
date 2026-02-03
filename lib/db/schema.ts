import { pgTable, text, integer, doublePrecision, boolean, timestamp } from "drizzle-orm/pg-core";

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
  acquiredVia: text("acquired_via", { enum: ["draft", "free_agent", "trade"] })
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
  type: text("type", { enum: ["trade_completed", "free_agent_pickup"] }).notNull(),
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
