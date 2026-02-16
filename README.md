# Moneyball - Fantasy Football League Manager
https://moneyball-five.vercel.app/

A modern fantasy football league management application built with Next.js 14, NextAuth v5, and SQLite.

## Features

- **User Authentication**: Secure signup and login with NextAuth v5 (credentials provider)
- **League Management**: Create and manage fantasy football leagues
- **Responsive Design**: Professional UI with Tailwind CSS and Radix UI primitives
- **Type-Safe**: Built with TypeScript and Zod validation
- **Database**: SQLite with Drizzle ORM (PostgreSQL-ready schema)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Authentication**: NextAuth v5 (Auth.js)
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Validation**: Zod
- **Password Hashing**: bcryptjs
- **Icons**: lucide-react

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
AUTH_SECRET=your-secret-key-change-this-in-production-min-32-chars
AUTH_URL=http://localhost:3000
DATABASE_URL=sqlite.db
```

4. Initialize the database:
```bash
npx drizzle-kit push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
moneyball/
├── app/                          # Next.js app router pages
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/              # Protected dashboard pages
│   │   ├── dashboard/
│   │   └── leagues/create/
│   ├── api/auth/[...nextauth]/   # NextAuth API routes
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── ui/                       # Base UI components
│   ├── auth/                     # Authentication forms
│   ├── home/                     # Home page components
│   └── dashboard/                # Dashboard components
├── lib/                          # Library code
│   ├── db/                       # Database schema and queries
│   ├── actions/                  # Server actions
│   ├── validations/              # Zod schemas
│   └── utils.ts                  # Utility functions
├── types/                        # TypeScript type definitions
├── auth.ts                       # NextAuth configuration
├── middleware.ts                 # Route protection middleware
└── drizzle.config.ts            # Drizzle ORM configuration
```

## Database Schema

### Users Table
- `id` (UUID, Primary Key)
- `email` (Unique, Required)
- `password` (Hashed, Required)
- `name` (Optional)
- `createdAt`, `updatedAt` (Timestamps)

### Leagues Table
- `id` (UUID, Primary Key)
- `name` (Required)
- `numberOfTeams` (Integer, Default: 12)
- `createdBy` (Foreign Key to Users)
- `createdAt`, `updatedAt` (Timestamps)

### League Members Table
- `id` (UUID, Primary Key)
- `leagueId` (Foreign Key to Leagues)
- `userId` (Foreign Key to Users)
- `teamName` (Optional)
- `isCommissioner` (Boolean)
- `joinedAt` (Timestamp)

## Usage

### Creating an Account

1. Visit the home page at http://localhost:3000
2. Click "Get Started" or navigate to /signup
3. Fill in your email, password, and optional name
4. Submit to create your account and auto-login

### Creating a League

1. Login to your account
2. Navigate to the dashboard
3. Click "Create League"
4. Enter league name and select number of teams (8-16)
5. Submit to create the league (you'll be the commissioner)

### Managing Leagues

- View all your leagues on the dashboard
- See your role (Commissioner or Member)
- View league details (name, team count)

## Database Management

### View Database in Browser
```bash
npx drizzle-kit studio
```

### Generate Migrations
```bash
npx drizzle-kit generate
```

### Push Schema Changes
```bash
npx drizzle-kit push
```

## Migration to PostgreSQL

The schema is designed to be PostgreSQL-compatible. To migrate:

1. Install PostgreSQL driver:
```bash
npm install pg @types/pg
npm uninstall better-sqlite3 @types/better-sqlite3
```

2. Update `drizzle.config.ts`:
```typescript
dialect: "postgresql",
dbCredentials: {
  url: process.env.DATABASE_URL,
}
```

3. Update `lib/db/index.ts` to use node-postgres

4. Update `DATABASE_URL` in `.env.local` to PostgreSQL connection string

5. Push schema:
```bash
npx drizzle-kit push
```

## Security Features

- Passwords hashed with bcrypt (10 rounds)
- JWT-based sessions with HTTP-only cookies
- Zod validation on all inputs
- CSRF protection via NextAuth
- Protected routes with middleware
- Server-side session validation

## Future Enhancements

- League details page with full information
- Invite members functionality
- Draft system for player selection
- Team and roster management
- Scoring system and matchups
- League chat
- Trade system
- Mobile app version

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT
