# Digital Asset Due Diligence Tool

## Project Purpose
Web-based due diligence tool for banking client onboarding where clients have wealth from digital assets.

**Core Features:**
1. Workflow Management - Track client onboarding stages
2. Compliance Tracking - Ensure regulatory requirements are met
3. Forensics/Investigation - Analyze client's digital asset history
4. CEX Activity Import - Upload and parse exchange exports (Binance, Coinbase, Kraken)
5. Reporting - Generate comprehensive compliance reports

## Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **CSV Parsing**: papaparse

## Directory Structure
```
src/
├── app/                 # Next.js App Router
│   ├── (dashboard)/    # Dashboard pages
│   └── api/            # API routes
├── components/
│   ├── ui/             # Base components
│   └── [feature]/      # Feature components
├── lib/
│   ├── db.ts           # Prisma client
│   ├── parsers/        # CEX export parsers
│   └── analyzers/      # Analysis logic
└── types/              # TypeScript types
```

## Commands
```bash
npm run dev          # Start dev server
npm run typecheck    # Check types
npm run lint         # Run linter
npm run test         # Run tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
```

## CEX Export Formats
Normalize all exchanges to:
```typescript
interface Transaction {
  timestamp: Date
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'transfer'
  asset: string
  amount: number
  price?: number
  fee?: number
  exchange: string
}
```
