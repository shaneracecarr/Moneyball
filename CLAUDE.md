# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moneyball is a fantasy football league management application built with Next.js 14, NextAuth v5, PostgreSQL (Supabase) with Drizzle ORM, and Tailwind CSS. Users can create accounts, manage fantasy football leagues, draft players (snake draft format), manage team rosters, trade players, and pick up free agents.

## Tech Stack

- **Framework**: Next.js 14 with App Router, TypeScript
- **Authentication**: NextAuth v5 (Auth.js) with credentials provider
- **Database**: PostgreSQL (Supabase) with Drizzle ORM (postgres-js driver)
- **Hosting**: Vercel (serverless functions)
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn-style components with CVA (class-variance-authority), Radix UI primitives
- **Validation**: Zod schemas for forms and data
- **Password Security**: bcryptjs for hashing
- **Player Data**: RapidAPI Tank01 NFL API (player info, stats, ADP, historical game logs)

## Project Structure

```
app/
  page.tsx                          # Home page (public)
  (auth)/
    login/page.tsx                  # Login
    signup/page.tsx                 # Signup
  (dashboard)/
    layout.tsx                      # Dashboard layout wrapper
    dashboard/page.tsx              # Main dashboard
    admin/page.tsx                  # Admin page (week controls)
    players/page.tsx                # Player browser with filters + "Add to Team"
    mock-draft/page.tsx             # Client-side mock draft against AI
    my-teams/page.tsx               # All user leagues with roster status
    leagues/
      create/page.tsx               # Create league form (with settings configuration)
      join/page.tsx                 # Join league by invite code
      [id]/page.tsx                 # League detail/overview (sets active league cookie)
      [id]/draft/page.tsx           # Live draft board
      [id]/team/page.tsx            # Team roster management (dynamic slots from settings)
      [id]/settings/page.tsx        # League settings (commissioner edit / member view)
      [id]/matchup/page.tsx         # Current week matchup view
      [id]/standings/page.tsx       # League standings
      [id]/trades/page.tsx          # Trade proposals and history
      [id]/inbox/page.tsx           # Trade notifications inbox
      [id]/chat/page.tsx            # League chat
  api/
    auth/[...nextauth]/route.ts     # NextAuth API route
    players/import-fantasy/route.ts # POST: import fantasy players from RapidAPI (QB, RB, WR, TE, K, DEF)
    players/import-adp/route.ts     # POST: import ADP (Average Draft Position) data
    players/import-stats/route.ts   # POST: import full player stats from team rosters
    players/import-history/route.ts # POST: import 3 years of historical game-by-game stats (batched)

components/
  ui/           # button, input, card, label (shadcn-style)
  auth/         # login-form, signup-form
  dashboard/    # navbar
  draft/        # draft-board, draft-setup-card, draft-complete-summary, player-list, team-roster
  mock-draft/   # mock-draft-board (client-side draft vs AI), mock-draft-setup (setup form)
  players/      # players-filters, players-table (with "Add to Team" actions)
  roster/       # team-roster-page, roster-section, free-agent-search
  leagues/      # copy-invite-code, set-active-league, league-settings-form, activity-feed
  matchup/      # matchup-view
  trades/       # trade components
  chat/         # chat components
  player-card/  # player-name-link, player-card-dialog, player-card-modal (dark theme with game logs)
  home/         # hero

lib/
  db/
    index.ts          # PostgreSQL/Drizzle connection (Supabase)
    schema.ts         # All table definitions
    queries.ts        # All database query functions
  actions/
    auth.ts           # signUpAction, signInAction
    leagues.ts        # createLeagueAction, getUserLeaguesAction, getLeagueDetailsAction, joinLeagueByCodeAction
    draft.ts          # setupDraftAction, startDraftAction, makePickAction, getDraftStateAction, searchAvailablePlayersAction, randomizeDraftOrderAction, processBotPicksAction, isCurrentPickBotAction
    bot.ts            # setBotLineupAction, setAllBotLineupsAction, botFillRosterAction, fillAllBotRostersAction, botRespondToTradeAction, processBotTradeResponsesAction
    roster.ts         # getUserRosterAction, movePlayerAction, pickupPlayerAction, dropAndAddAction, dropPlayerAction, searchFreeAgentsAction, setActiveLeagueAction
    settings.ts       # getLeagueSettingsAction, updateLeagueSettingsAction
    league-settings.ts # Additional league settings actions
    mock-draft.ts     # getAllPlayersAction
    matchups.ts       # Matchup-related actions
    standings.ts      # Standings-related actions
    trades.ts         # Trade proposal and response actions
    chat.ts           # Chat message actions
    player-card.ts    # Player card data actions
    admin-week.ts     # Admin week controls (start week, advance week for all leagues)
    league-phase.ts   # Commissioner week controls (start week, advance week per league)
    mock-league.ts    # Mock league stats generation and retrieval
  validations/
    auth.ts           # signUpSchema, signInSchema, createLeagueSchema
    draft.ts          # setupDraftSchema, makePickSchema
    roster.ts         # movePlayerSchema, pickupPlayerSchema, dropAndAddSchema
    settings.ts       # leagueSettingsSchema
  league-settings.ts  # LeagueSettings interface and DEFAULT_LEAGUE_SETTINGS
  roster-config.ts    # SlotConfig interface and generateSlotConfig() for dynamic roster slots
  draft-utils.ts      # getSnakeDraftPosition, getMemberIdForPick
  scoring-utils.ts    # generatePlayerScore, calculateTeamScore (for league scoring)
  design-system.ts    # Dark theme color tokens, position colors, reusable Tailwind patterns
  utils.ts            # cn() (classname merge), generateInviteCode()

types/
  next-auth.d.ts      # Session/JWT type extensions (adds user.id)

auth.ts               # NextAuth configuration
middleware.ts         # Route protection
drizzle.config.ts     # Drizzle ORM config
```

## Development Workflow

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npx drizzle-kit push     # Push schema changes to database
npx drizzle-kit studio   # Open database browser UI
```

## Database Schema

Tables defined in `lib/db/schema.ts`:

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, hashed password, name, isAdmin flag) |
| `leagues` | Fantasy leagues (name, team count, invite code, currentWeek, phase, isMock) |
| `league_settings` | Per-league configuration (roster slot counts, scoring format, trade rules) |
| `league_members` | League membership (leagueId, userId, teamName, isCommissioner, isBot) |
| `drafts` | Draft instances (status: scheduled/in_progress/completed, round count, current pick) |
| `draft_order` | Randomized pick order per draft |
| `draft_picks` | Individual picks made during a draft |
| `players` | NFL player database (from RapidAPI, keyed by sleeperId, includes ADP, rapidApiId) |
| `player_game_stats` | Historical game-by-game stats (3 years: 2022-2024, passing/rushing/receiving/kicking/fantasy points) |
| `roster_players` | Players on team rosters with slot assignments |
| `matchups` | Weekly matchups between teams |
| `trades` | Trade proposals between league members |
| `trade_participants` | Members involved in a trade |
| `trade_items` | Players/picks included in a trade |
| `notifications` | User notifications for trades |
| `league_activity` | League activity feed events |
| `chat_messages` | League chat/messaging |
| `mock_player_stats` | Weekly randomly-generated player stats for mock leagues |

All tables use UUID primary keys and timestamp tracking.

### Key Table: `league_members`

```typescript
leagueMembers = pgTable("league_members", {
  id: text("id").primaryKey(),
  leagueId: text("league_id").notNull().references(() => leagues.id),
  userId: text("user_id").references(() => users.id),  // NULL for bots
  teamName: text("team_name"),
  isCommissioner: boolean("is_commissioner").notNull().default(false),
  isBot: boolean("is_bot").notNull().default(false),   // TRUE for AI teams
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});
```

- **Human members**: `userId` is set, `isBot` is false
- **Bot members**: `userId` is null, `isBot` is true, `teamName` is required

## Key Implementation Details

### Authentication
- Uses NextAuth v5 (beta) with credentials provider
- Passwords hashed with bcrypt (10 rounds)
- JWT sessions stored in HTTP-only cookies
- Session includes user ID via custom JWT/session callbacks
- Type extensions for NextAuth in `types/next-auth.d.ts`

### Route Protection (middleware.ts)
- **Protected**: `/dashboard/*`, `/leagues/*`, `/mock-draft/*`, `/my-teams/*`, `/players/*`
- **Public**: `/`, `/login`, `/signup`

### Active League Context
- When a user visits a league page (`/leagues/[id]`), cookies `active_league_id` and `active_league_name` are set via a server action (`setActiveLeagueAction`) called from the `<SetActiveLeague>` client component on mount
- The Players page reads these cookies to show the active league badge and enable "Add to Team" buttons
- Cookies cannot be set directly in Server Components — must use a Server Action or Route Handler (Next.js restriction)
- To switch leagues, the user navigates back to the dashboard and visits a different league

### Draft System
- Snake draft format: odd rounds pick 1→N, even rounds pick N→1
- Commissioner-only setup and start (league must be full first)
- `lib/draft-utils.ts` handles pick position calculations
- On draft completion, `populateRosterFromDraft()` auto-assigns picks to roster slots using the league's dynamic slot config (starters first, then bench)
- `draft.ts` actions use an internal `getDraftByLeagueId_internal()` helper to look up drafts by their own ID (not league ID)

### League Phase System
- Leagues have a `phase` field: `setup` → `drafting` → `pre_week` → `week_active` → `complete`
- `currentWeek` tracks the current week (1-17 for regular season)
- **Admin controls** (`/admin`): Site-wide week management for all leagues
- **Commissioner controls**: Per-league week management via `league-phase.ts` actions
- Week scoring uses `lib/scoring-utils.ts` to calculate fantasy points based on player ADP

### League Settings System
- **Per-league configuration** stored in `league_settings` table (one-to-one with `leagues`)
- **Configurable roster positions**: QB (1-3), RB (1-4), WR (1-4), TE (1-3), FLEX (0-3), K (0-2), DEF (0-2), Bench (4-10), IR (0-4)
- **Scoring format**: Standard, Half PPR, or Full PPR
- **Trade settings**: Enable/disable trades, optional trade deadline week (1-17)
- **Defaults** defined in `lib/league-settings.ts` (`DEFAULT_LEAGUE_SETTINGS`): 1 QB, 2 RB, 2 WR, 1 TE, 1 FLEX, 1 K, 1 DEF, 7 BN, 2 IR = 18 total, Standard scoring
- **Dynamic slot generation**: `lib/roster-config.ts` (`generateSlotConfig()`) builds `SlotConfig` from settings — generates slot names, labels, position validation maps, and position-to-slot mappings
- **Settings locked after draft starts**: Once draft is `in_progress` or `completed`, settings cannot be changed
- **Commissioner-only editing**: Only the commissioner can modify settings; all members can view
- **Backwards compatible**: Leagues without a `league_settings` row get `DEFAULT_LEAGUE_SETTINGS`
- **League creation**: Settings are configured during league creation (collapsible section with defaults pre-filled)
- **Settings page**: `/leagues/[id]/settings` — commissioner sees editable form, members see read-only view
- League detail page shows scoring format and links to settings

### Roster System
- **Roster slots are dynamic** — driven by the league's `league_settings` configuration via `generateSlotConfig()`
- **Default roster (18 slots)**: QB, RB1, RB2, WR1, WR2, TE, FLEX, K, DEF (9 starters) + BN1-BN7 (7 bench) + IR1-IR2 (2 IR)
- **Custom rosters**: e.g., 2 QB league generates QB1, QB2; 3 WR league generates WR1, WR2, WR3
- Position validation enforced on starter slots (e.g., QB slot only accepts QB players, FLEX accepts RB/WR/TE)
- IR slots require players to have non-null `injuryStatus`
- Bench slots accept any position
- Moving players between slots performs swaps when the target is occupied
- Free agent pickup goes to first open bench slot; if roster is full, user must drop-and-add
- Players page shows "Add to Team" for unrostered players and "Rostered" for owned players (requires active league context)
- `roster.ts` actions fetch league settings and generate slot config dynamically for all validation
- `team-roster-page.tsx` and `roster-section.tsx` receive slot config as props from the server component

### Player Data & RapidAPI Integration

Player data is sourced from the **RapidAPI Tank01 NFL API**. Environment variable `RAPIDAPI_KEY` must be set.

#### Admin Import Buttons (`/admin`)
1. **Import Fantasy Players** (`/api/players/import-fantasy`)
   - Fetches all NFL players from `/getNFLPlayerList`
   - Filters to fantasy positions: QB, RB, WR, TE, K (API uses "PK" for kickers, mapped to "K")
   - Also imports 32 team defenses (DEF) from `/getNFLTeams`
   - Upserts by `sleeperId` to avoid duplicates

2. **Import ADP** (`/api/players/import-adp`)
   - Fetches Average Draft Position from `/getNFLADP?adpType=halfPPR`
   - Updates existing players with ADP values
   - Adds any missing kickers found in ADP data

3. **Import Full Player Stats** (`/api/players/import-stats`)
   - Fetches detailed stats from all 32 team rosters
   - Includes passing, rushing, receiving, and defensive stats

4. **Import Historical Stats** (`/api/players/import-history`)
   - Fetches 3 years (2022-2024) of game-by-game stats
   - Runs in batches (25 players per batch) to avoid timeouts
   - Stores in `player_game_stats` table with fantasy point calculations
   - Only imports for active fantasy position players

#### Player Record Fields
- **Identity**: sleeperId, rapidApiId, fullName, firstName, lastName
- **Team Info**: team, position, number, status
- **Physical**: age, height, weight, college, yearsExp
- **Fantasy**: adp, seasonPoints, headshotUrl, injuryStatus

#### Historical Game Stats (`player_game_stats`)
- **Game Info**: gameId, season, week, opponent, isHome, gameDate
- **Passing**: attempts, completions, yards, TDs, INTs, rating, QBR, sacked
- **Rushing**: attempts, yards, TDs, long
- **Receiving**: targets, receptions, yards, TDs, long
- **Kicking**: FG made/attempted, XP made/attempted, long
- **Defense**: tackles, sacks, INTs, fumbles forced/recovered, TDs
- **Fantasy Points**: standard, PPR, half-PPR (pre-calculated)

### League System
- Invite codes use ABC-1234 format with uniqueness checking
- Creator is automatically added as commissioner
- League must reach capacity (`numberOfTeams`) before draft can begin

### Trade System
- League members can propose trades to other members
- Trades include players from both sides
- Recipients can accept or decline
- Trade deadline can be configured in league settings
- Activity feed tracks completed trades

### Mock Draft (Standalone)
- `/mock-draft` provides a client-side-only mock draft experience against AI opponents
- No database persistence — draft state lives entirely in React component state
- Setup form: team count, rounds, draft position
- AI uses position-priority strategy by round (early rounds: RB/WR, mid rounds: add QB/TE, late rounds: K/DEF)
- After draft completion, shows summary with all picks; user can start a new mock draft

### Bot Teams System
- **Bot teams** are AI-controlled league members that act autonomously
- **Identification**: Bot teams have `isBot: true` in `league_members` table, with `userId: null`
- **Creation**: During league creation, users can add bot teams via "Add Bot" button
  - Each bot can be renamed (default: "Bot 1", "Bot 2", etc.)
  - Maximum bots = `numberOfTeams - 1` (at least 1 human required)
  - Bot teams are created with `createLeagueMember(leagueId, null, teamName, false, true)`

#### Bot Drafting Behavior
- **Trigger**: When it's a bot's turn during a live draft, the draft board auto-triggers bot picks
- **Strategy**: Bots pick the best available player by ADP (lowest ADP = best)
- **Implementation**: `processBotPicksAction(draftId)` processes all consecutive bot picks in a loop
- **Delay**: 1 second delay before each bot pick for visual feedback
- **UI Indicators**:
  - Draft board shows "BOT TURN" (purple text) when waiting for bot
  - Shows "BOT PICKING..." (purple, animated) while bot is selecting
  - Column headers display purple "BOT" badge for bot teams
  - Bot teams have purple-tinted column headers

#### Bot UI Components Updated
- `app/(dashboard)/leagues/create/page.tsx` — "Add Bot" button and bot team name inputs
- `app/(dashboard)/leagues/[id]/page.tsx` — Purple "Bot" badge in members list
- `components/draft/draft-board.tsx` — Bot status indicators, auto-pick trigger, purple badges
- `components/draft/draft-setup-card.tsx` — "Bot" indicator in draft order display
- `components/trades/trade-list.tsx` — Updated types for nullable bot fields

#### Bot-Related Database Queries (`lib/db/queries.ts`)
- `getLeagueBotMembers(leagueId)` — Gets all bot members in a league
- `getMemberById(memberId)` — Gets member info including `isBot` flag
- `getBestAvailablePlayerByAdp(draftId, options?)` — Returns best undrafted player by ADP
- `getMemberRosterWithAdp(memberId)` — Gets roster with player ADP for lineup optimization
- `getTradeParticipants(tradeId)` — Updated to use leftJoin for users (supports bots with null userId)
- `getDraftOrder(draftId)` — Updated to include `isBot` field
- `getDraftPicks(draftId)` — Updated to include `isBot` field

#### Bot-Related Server Actions (`lib/actions/bot.ts` and `lib/actions/draft.ts`)
- `processBotPicksAction(draftId)` — Processes all consecutive bot picks during draft
- `isCurrentPickBotAction(draftId)` — Checks if current pick is a bot's turn
- `setBotLineupAction(memberId, leagueId)` — Sets optimal lineup for one bot
- `setAllBotLineupsAction(leagueId)` — Sets lineups for all bots in a league
- `botFillRosterAction(memberId, leagueId)` — Fills empty roster slots for one bot
- `fillAllBotRostersAction(leagueId)` — Fills rosters for all bots in a league
- `botRespondToTradeAction(tradeId, botMemberId)` — Bot responds to a trade proposal
- `processBotTradeResponsesAction(tradeId)` — Processes all bot recipients in a trade

#### Bot Weekly Lineup Setting
- **Trigger**: Called automatically when `startWeekAction` is executed (week locks)
- **Strategy**: Sort roster by ADP (lowest = best), fill starter slots with best eligible players
- **Process**:
  1. Get all roster players with ADP
  2. For each starter slot, find best unassigned player matching position requirements
  3. Remaining players go to bench
- **Integration**: `league-phase.ts` calls `setAllBotLineupsAction()` before transitioning to `week_active`

#### Bot Free Agent Pickups
- **Trigger**: Called automatically when `advanceWeekAction` is executed (entering `pre_week` phase)
- **Strategy**: Find empty bench slots, pick up best available free agents by ADP
- **Process**:
  1. Identify empty bench slots
  2. Search free agents sorted by ADP
  3. Add best available to each empty slot
  4. Create activity feed events and chat messages
- **Integration**: `league-phase.ts` calls `fillAllBotRostersAction()` after advancing to next week

#### Bot Trade Responses
- **Trigger**: Called immediately when `createTradeAction` completes
- **Strategy**: Compare average ADP of players receiving vs giving away
- **Decision Logic**:
  - Calculate average ADP of players bot would receive
  - Calculate average ADP of players bot would give away
  - Accept if receiving average ADP ≤ giving average ADP × 1.1 (10% tolerance)
  - Decline otherwise
- **Process**:
  1. Check if any trade recipients are bots
  2. For each bot recipient, evaluate trade value using ADP
  3. Accept or decline immediately
  4. If accepted by all, execute trade automatically
- **Integration**: `trades.ts` calls `processBotTradeResponsesAction()` after creating trade

### Mock League System
- **Mock leagues** are testing/practice leagues with randomly generated player stats instead of real NFL data
- **Identification**: Mock leagues have `isMock: true` in the `leagues` table
- **Creation**: During league creation, users can check "Mock League (for testing)" checkbox
- **Purpose**: Perfect for testing strategies, playing during off-season, or learning the app

#### Mock Stats Generation
- **Storage**: `mock_player_stats` table stores generated stats per player, per week, per league
- **Trigger**: Stats are generated automatically when `advanceWeekAction` is called for a mock league
- **Position-based score ranges**:
  - QB: 10-30 points
  - RB: 5-25 points
  - WR: 5-25 points
  - TE: 3-15 points
  - K: 5-15 points
  - DEF: 0-20 points
- **Bye weeks**: 2-3 random teams are on bye each week (players get 0 points)
- **Injuries**: ~5% chance per player per week (injured players get 0 points)

#### Mock League Commissioner Controls
- **Component**: `LeaguePhaseControls` component displays commissioner controls when:
  - User is the commissioner
  - League is in `pre_week` or `week_active` phase
- **Start Week** button: Locks lineups and transitions to `week_active`
- **Advance Week** button: Generates mock stats (if needed), scores matchups, advances to next week
- **UI Indicators**: Purple "Mock League" badge displayed throughout the app

#### Mock League Server Actions (`lib/actions/mock-league.ts`)
- `generateMockStatsForWeekAction(leagueId, week)` — Manually generates mock stats (commissioner only)
- `getMockStatsForWeekAction(leagueId, week)` — Retrieves mock stats for display

#### Mock League Scoring
- **Regular leagues**: Use ADP-based scoring via `calculateTeamScore()` in `lib/scoring-utils.ts`
- **Mock leagues**: Use pre-generated mock stats via `calculateMockTeamScore()` in `lib/actions/league-phase.ts`
- The `advanceWeekAction` checks `league.isMock` and uses appropriate scoring method

#### Mock League Database Queries (`lib/db/queries.ts`)
- `getMockPlayerStats(leagueId, week)` — Gets all mock stats for a week
- `getMockPlayerStatsForPlayer(leagueId, playerId, week)` — Gets stats for one player
- `createMockPlayerStats(data)` — Creates a single mock stat entry
- `createMockPlayerStatsBatch(stats[])` — Batch creates mock stats for efficiency
- `mockStatsExistForWeek(leagueId, week)` — Checks if stats already generated
- `getAllRosteredPlayerIds(leagueId)` — Gets all rostered player IDs in a league

### Navigation
- Navbar links: Dashboard, Players, Mock Draft, Admin
- When active league selected, shows: League, Team, Matchup, Standings, Trades, Inbox, Chat
- "My Teams" page (`/my-teams`) lists all user's leagues with roster fill counts and links to manage each team
- League detail page has "My Team" button linking to `/leagues/[id]/team` and "Settings" button linking to `/leagues/[id]/settings`

### Player Card Modal

The player card modal (`components/player-card/player-card-modal.tsx`) displays detailed player information with historical stats. It uses the dark theme design system.

**Features:**
- **Wide layout** (max-w-4xl) with dark theme (#1a1d24 base)
- **Large player portrait** (w-28 h-28) with position-colored border
- **Info bar**: Age, Height, Weight, Experience, College, ADP
- **Year selector tabs**: Switch between 2024, 2023, 2022 seasons
- **Game log table**: Position-specific columns with weekly stats
- **Season totals row**: Aggregated stats at bottom of table
- **Missing data indicator**: Shows "X" for null values to identify data gaps

**Position-Specific Columns:**
- **QB**: Cmp, Att, Yds, TD, INT + rushing stats
- **RB**: Car, RuYds, RuTD + receiving stats (Tgt, Rec, ReYds, ReTD)
- **WR/TE**: Tgt, Rec, Yds, TD
- **K**: FGM, FGA, XPM, XPA

**Data Source:**
- `getPlayerCardDataAction(playerId)` in `lib/actions/player-card.ts`
- Fetches player info from `players` table
- Fetches historical stats from `player_game_stats` table
- Checks roster ownership in active league context

### UI Design
- Blue/indigo color scheme (indigo-600 primary)
- shadcn-style components with CVA (class-variance-authority)
- Responsive design with mobile-first approach
- Gradient backgrounds on hero and auth pages

### Dark Theme Design System (`lib/design-system.ts`)

The player card modal established a premium dark theme style that should be used for other immersive UI components. The design system is documented in `lib/design-system.ts` with exportable constants and patterns.

#### Color Palette
```
Background Layers (darkest → lightest):
- bg.base:     #1a1d24  (deepest background, main surfaces)
- bg.elevated: #1e2128  (raised surfaces, table rows, nav bars)
- bg.card:     #252830  (card headers, prominent sections)
- bg.overlay:  rgba(0,0,0,0.6)  (modal backdrops)

Text Colors:
- text.primary:   #ffffff (white - headings)
- text.secondary: #9ca3af (gray-400 - labels)
- text.muted:     #6b7280 (gray-500 - disabled)
- text.accent:    #818cf8 (indigo-400 - links)

Borders:
- border.subtle:  #374151 (gray-700)
- border.default: #4b5563 (gray-600)

Semantic Colors:
- success: #4ade80 (green-400) + rgba(34,197,94,0.2) bg
- warning: #f97316 (orange-500)
- error:   #f87171 (red-400) + rgba(239,68,68,0.2) bg
- info:    #818cf8 (indigo-400) + rgba(99,102,241,0.2) bg
```

#### Position Colors
Each position has consistent colors for badges, borders, and backgrounds:
- **QB**: red-500 (#ef4444)
- **RB**: green-500 (#22c55e)
- **WR**: blue-500 (#3b82f6)
- **TE**: orange-500 (#f97316)
- **K**: purple-500 (#a855f7)
- **DEF**: slate-600 (#475569)

#### Key Component Patterns

**Modal Structure:**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
  <div className="bg-[#1a1d24] rounded-xl shadow-2xl overflow-hidden">
    <div className="bg-[#252830] px-6 py-5">  {/* Header */}
    <div className="bg-[#1a1d24] px-6 py-4">  {/* Body */}
  </div>
</div>
```

**Info Box Pattern** (small labeled value displays):
```tsx
<div className="text-center">
  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Label</p>
  <p className="text-sm font-semibold text-white">Value</p>
</div>
```

**Info Row** (horizontal info boxes with dividers):
```tsx
<div className="flex items-center gap-6 bg-[#1a1d24] rounded-lg px-4 py-3">
  <InfoBox label="Age" value="28" />
  <div className="w-px h-8 bg-gray-700" />  {/* Vertical divider */}
  <InfoBox label="Exp" value="5 yr" />
</div>
```

**Tab Buttons:**
```tsx
<button className={isActive
  ? "bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
  : "text-gray-400 hover:bg-gray-700 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
}>
```

**Badges:**
```tsx
// Success (free agent)
<span className="text-sm font-medium text-green-400 bg-green-500/20 px-2 py-1 rounded">
// Info (owned)
<span className="text-sm font-medium text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded">
// Warning (injury)
<span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-500 text-white">
```

**Table Styling:**
```tsx
<table className="w-full text-sm">
  <thead className="text-gray-400 text-xs uppercase sticky top-0 bg-[#1a1d24]">
  <tbody className="text-white">
    <tr className="bg-[#1e2128]">  {/* Even rows */}
    <tr className="bg-[#1a1d24]">  {/* Odd rows */}
    <tr className="border-t border-gray-600 bg-[#252830] font-semibold">  {/* Totals row */}
```

#### When to Use Dark Theme
- **Player cards** and detailed stat views
- **Modals/dialogs** with lots of data
- **Game logs** and historical data tables
- **Draft boards** (immersive full-screen experiences)
- **Matchup views** with head-to-head comparisons

#### When to Use Light Theme (existing)
- **Dashboard** and navigation
- **Settings pages** and forms
- **Simple lists** and league overviews
- **Admin pages**

## Supabase + Vercel Connection (CRITICAL)

This section documents the working configuration for connecting Next.js on Vercel to Supabase PostgreSQL.

### The Problem
Direct connection strings (`db.xxx.supabase.co:5432`) don't work with Vercel serverless functions because they don't maintain persistent connections.

### The Solution
Use the **Transaction Pooler** connection string from Supabase.

### Connection String Format

| Setting  | Direct (❌ Wrong)        | Transaction Pooler (✅ Correct)              |
|----------|--------------------------|----------------------------------------------|
| Host     | `db.xxx.supabase.co`     | `aws-0-us-east-1.pooler.supabase.com`        |
| Port     | `5432`                   | `6543`                                       |
| Username | `postgres`               | `postgres.PROJECT_REF`                       |

Get the Transaction Pooler URL from: **Supabase Dashboard → Connect** (or Project Settings → Database)

### Vercel Environment Variables
```
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
AUTH_SECRET=<any random string>
AUTH_URL=https://your-app.vercel.app
```

### Local .env.local
```
DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
AUTH_SECRET="your-secret"
AUTH_URL="http://localhost:3000"
```

### Database Connection Code (lib/db/index.ts)
```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set");
}

const client = postgres(connectionString, {
  prepare: false,  // Required for transaction pooler
  ssl: "require",  // Required for Supabase
});

export const db = drizzle(client, { schema });
```

**Key settings:**
- `prepare: false` — Required for Supabase transaction pooler (prepared statements don't work with connection pooling)
- `ssl: "require"` — Required for all Supabase connections

## Important Notes

- Build warnings about Edge Runtime are expected (postgres-js is Node.js-only)
- The `tsconfig.json` does not enable `downlevelIteration` — use `Array.from()` when iterating Maps
- `queries.ts` uses `as any` casts in a few places to work around Drizzle's query builder types when applying conditional `.where()` clauses
- The `.next` cache can become corrupted — if you see webpack module errors or "missing required error components", delete `.next` and restart the dev server (`rm -rf .next && npm run dev`)
- When killing the dev server on Windows, use `taskkill //f //im node.exe` (double slashes for flags in Git Bash)
- After modifying `lib/db/schema.ts`, sync changes to database using either:
  - `npx drizzle-kit push` (requires DATABASE_URL env var)
  - Supabase MCP `apply_migration` tool (preferred when using Claude Code)
- The `matchup-view.tsx` component still uses hardcoded roster slots — it should be updated to use dynamic slot config if matchup scoring needs to respect custom roster configurations

## Supabase MCP Integration

When using Claude Code with the Supabase MCP tools, you can manage the database directly:

```
mcp__supabase__apply_migration    # Apply DDL changes (schema modifications)
mcp__supabase__execute_sql        # Run queries (SELECT, INSERT, UPDATE, DELETE)
mcp__supabase__list_tables        # View existing tables
mcp__supabase__list_migrations    # View migration history
mcp__supabase__get_logs           # Debug issues with logs
```

Example migration for adding a column:
```sql
ALTER TABLE league_members
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false;
```
