# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moneyball is a fantasy football league management application built with Next.js 14, NextAuth v5, SQLite (via Drizzle ORM), and Tailwind CSS. Users can create accounts, manage fantasy football leagues, draft players (snake draft format), manage team rosters, and pick up free agents.

## Tech Stack

- **Framework**: Next.js 14 with App Router, TypeScript
- **Authentication**: NextAuth v5 (Auth.js) with credentials provider
- **Database**: SQLite with Drizzle ORM (better-sqlite3 driver)
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn-style components with CVA (class-variance-authority), Radix UI primitives
- **Validation**: Zod schemas for forms and data
- **Password Security**: bcryptjs for hashing
- **Player Data**: Synced from Sleeper API (`https://api.sleeper.app/v1/players/nfl`)

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
    admin/page.tsx                  # Admin page
    players/page.tsx                # Player browser with filters + "Add to Team"
    mock-draft/page.tsx             # Mock draft setup (creates a mock league behind the scenes, redirects to draft board)
    mock-league/
      page.tsx                      # Mock leagues list
      create/page.tsx               # Create mock league form
      [id]/page.tsx                 # Mock league hub (standings, simulate week)
      [id]/draft/page.tsx           # Mock league draft board (vs bots)
      [id]/team/page.tsx            # Mock league team roster management
    my-teams/page.tsx               # All user leagues with roster status
    leagues/
      create/page.tsx               # Create league form (with settings configuration)
      join/page.tsx                 # Join league by invite code
      [id]/page.tsx                 # League detail/overview (sets active league cookie)
      [id]/draft/page.tsx           # Live draft board
      [id]/team/page.tsx            # Team roster management (dynamic slots from settings)
      [id]/settings/page.tsx        # League settings (commissioner edit / member view)
  api/
    auth/[...nextauth]/route.ts     # NextAuth API route
    players/sync/route.ts           # POST: sync players from Sleeper API

components/
  ui/         # button, input, card, label (shadcn-style)
  auth/       # login-form, signup-form
  dashboard/  # navbar
  draft/      # draft-board, draft-setup-card, draft-complete-summary, player-list, team-roster
  mock-draft/ # mock-draft-setup-new (creates mock league + redirects to draft), mock-draft-board (legacy client-side only, unused), mock-draft-setup (legacy, unused)
  mock-league/ # mock-league-setup, mock-league-draft, mock-league-hub, week-results
  players/    # players-filters, players-table (with "Add to Team" actions)
  roster/     # team-roster-page, roster-section, free-agent-search
  leagues/    # copy-invite-code, set-active-league, league-settings-form, activity-feed
  home/       # hero

lib/
  db/
    index.ts          # SQLite/Drizzle connection
    schema.ts         # All table definitions
    queries.ts        # All database query functions
  actions/
    auth.ts           # signUpAction, signInAction
    leagues.ts        # createLeagueAction, getUserLeaguesAction, getLeagueDetailsAction, joinLeagueByCodeAction
    draft.ts          # setupDraftAction, startDraftAction, makePickAction, getDraftStateAction, searchAvailablePlayersAction, randomizeDraftOrderAction
    roster.ts         # getUserRosterAction, movePlayerAction, pickupPlayerAction, dropAndAddAction, dropPlayerAction, searchFreeAgentsAction, setActiveLeagueAction
    settings.ts       # getLeagueSettingsAction, updateLeagueSettingsAction
    mock-draft.ts     # getAllPlayersAction
    mock-league.ts    # createMockLeagueAction, getMockLeagueStateAction, makeBotDraftPicksAction, makeUserDraftPickAction, simulateWeekAction, getUserMockLeaguesAction, deleteMockLeagueAction, searchMockDraftPlayersAction
  validations/
    auth.ts           # signUpSchema, signInSchema, createLeagueSchema
    draft.ts          # setupDraftSchema, makePickSchema
    roster.ts         # movePlayerSchema, pickupPlayerSchema, dropAndAddSchema
    settings.ts       # leagueSettingsSchema
  league-settings.ts  # LeagueSettings interface and DEFAULT_LEAGUE_SETTINGS
  roster-config.ts    # SlotConfig interface and generateSlotConfig() for dynamic roster slots
  draft-utils.ts      # getSnakeDraftPosition, getMemberIdForPick
  mock-league-utils.ts # AI_TEAM_NAMES, botDraftPick, generatePlayerScore, calculateTeamScore, botOptimizeLineup
  utils.ts            # cn() (classname merge), generateInviteCode()

types/
  next-auth.d.ts      # Session/JWT type extensions (adds user.id)

auth.ts               # NextAuth configuration
middleware.ts          # Route protection
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
| `users` | User accounts (email, hashed password, name) |
| `leagues` | Fantasy leagues (name, team count, invite code) |
| `league_settings` | Per-league configuration (roster slot counts, scoring format, trade rules) |
| `league_members` | League membership with commissioner flag and team name |
| `drafts` | Draft instances (status: scheduled/in_progress/completed, round count, current pick) |
| `draft_order` | Randomized pick order per draft |
| `draft_picks` | Individual picks made during a draft |
| `players` | NFL player database (synced from Sleeper API, keyed by sleeperId) |
| `roster_players` | Players on team rosters with slot assignments |
| `matchups` | Weekly matchups between teams |
| `trades` | Trade proposals between league members |
| `trade_participants` | Members involved in a trade |
| `trade_items` | Players/picks included in a trade |
| `notifications` | User notifications for trades |
| `league_activity` | League activity feed events |
| `chat_messages` | League chat/messaging |

All tables use UUID primary keys and timestamp tracking.

## Key Implementation Details

### Authentication
- Uses NextAuth v5 (beta) with credentials provider
- Passwords hashed with bcrypt (10 rounds)
- JWT sessions stored in HTTP-only cookies
- Session includes user ID via custom JWT/session callbacks
- Type extensions for NextAuth in `types/next-auth.d.ts`

### Route Protection (middleware.ts)
- **Protected**: `/dashboard/*`, `/leagues/*`, `/mock-draft/*`, `/mock-league/*`, `/my-teams/*`, `/players/*`
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

### Player Data
- Players synced via POST to `/api/players/sync` (requires auth)
- Fetches from Sleeper API, filters to positions: QB, RB, WR, TE, K, DEF
- Upserts by `sleeperId` to avoid duplicates
- Player records include: name, team, position, status, injuryStatus, age, experience, number

### League System
- Invite codes use ABC-1234 format with uniqueness checking
- Creator is automatically added as commissioner
- League must reach capacity (`numberOfTeams`) before draft can begin

### Mock League System
- **Full season simulation** against AI bot opponents across 17 weeks
- **Creation flow**: User picks team name, team count (4-14), draft rounds, draft position (1-N or random) → bots auto-fill remaining slots → draft starts immediately
- **Draft board**: Sleeper-style full grid — rows are rounds, columns are teams, cells are color-coded by position (QB red, RB green, WR blue, TE amber, K purple, DEF orange). Dark theme. Available players panel on the right sorted by ADP with search and position filters.
- **Draft position**: `createMockLeagueAction` accepts a `draftPosition` param (1-N for specific slot, 0 for random). User is placed at that position in the draft order; bots are shuffled into remaining slots.
- **Bot draft strategy**: ADP-aware position-priority by round (early rounds: RB/WR, mid rounds: add QB/TE, late rounds: K/DEF). Picks from top 3 candidates for variety.
- **Post-draft**: Rosters auto-populated via `populateRosterFromDraft()`, 17-week round-robin schedule auto-generated, `currentWeek` set to 1
- **Week simulation** (`simulateWeekAction`): Bots auto-optimize lineups before scoring. Scores generated per starter using ADP-based formulas with ±40% variance, boom/bust modifiers. Matchup scores saved, week advanced.
- **Roster management**: User can move players, pick up free agents, drop players between simulated weeks (reuses existing roster actions and `TeamRosterPage` component)
- **Standings**: W/L/T record + points for/against, sorted by wins → losses → points for
- **Score formula** (in `lib/mock-league-utils.ts`): Base score varies by position and ADP, with random variance. QB base ~14-20, RB ~8-18, WR ~8-17, TE ~5-12, K/DEF ~6-13.
- **Database flags**: `leagues.isMockLeague` (boolean), `leagueMembers.isBot` (boolean), `leagues.currentWeek` (integer)
- **Data cleanup**: `deleteMockLeagueData()` removes all related data (matchups, rosters, draft picks, draft order, drafts, settings, members, league) in reverse dependency order
- **Separation**: Mock leagues are excluded from regular league listings (`getUserLeagues` filters `isMockLeague = false`), and regular league actions (invite code join, etc.) are not used for mock leagues
- Dashboard shows both regular and mock leagues; navbar has a "Mock League" link

### Mock Draft (Standalone)
- `/mock-draft` now creates a mock league behind the scenes (named "Mock Draft") and redirects to `/mock-league/[id]/draft`
- Uses the same Sleeper-style draft board, bot AI, and DB-backed picks as mock leagues
- Setup form: team count, rounds, draft position — same fields as the old mock draft
- After draft completion, user lands on the mock league hub and can optionally continue into season simulation
- The old client-side-only `MockDraftBoard` component (`components/mock-draft/mock-draft-board.tsx`) is no longer used but remains in the codebase

### Navigation
- Navbar links: Dashboard, Players, My Teams, Mock Draft, Mock League, Admin
- "My Teams" page (`/my-teams`) lists all user's leagues with roster fill counts and links to manage each team
- League detail page has "My Team" button linking to `/leagues/[id]/team` and "Settings" button linking to `/leagues/[id]/settings`

### UI Design
- Blue/indigo color scheme (indigo-600 primary)
- shadcn-style components with CVA (class-variance-authority)
- Responsive design with mobile-first approach
- Gradient backgrounds on hero and auth pages

## Important Notes

- Build warnings about Edge Runtime are expected (SQLite is Node.js-only)
- The `tsconfig.json` does not enable `downlevelIteration` — use `Array.from()` when iterating Maps
- `queries.ts` uses `as any` casts in a few places to work around Drizzle's query builder types when applying conditional `.where()` clauses
- The mock draft feature now creates a mock league behind the scenes and uses the Sleeper-style draft board (the old client-side-only mock draft board is no longer used)
- The `.next` cache can become corrupted — if you see webpack module errors or "missing required error components", delete `.next` and restart the dev server (`rm -rf .next && npm run dev`)
- When killing the dev server on Windows, use `taskkill //f //im node.exe` (double slashes for flags in Git Bash)
- After modifying `lib/db/schema.ts`, always run `npx drizzle-kit push` to sync changes to the SQLite database
- The `matchup-view.tsx` component still uses hardcoded roster slots — it should be updated to use dynamic slot config if matchup scoring needs to respect custom roster configurations
