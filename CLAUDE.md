# Digital Asset Due Diligence Tool

## Project Purpose
Multi-tenant web-based due diligence tool for banking client onboarding where clients have wealth from digital assets.

**Core Features:**
1. **Workflow Management** - Track client onboarding stages
2. **Compliance Tracking** - Checklists, document verification, approval workflow
3. **Forensics/Investigation** - On-chain analysis, address screening, risk flags
4. **CEX Activity Import** - Parse Binance, Coinbase, Kraken exports + API integration
5. **DEX Analysis** - Detect swaps, track DeFi activity
6. **Risk Scoring** - Automated scoring with 7 risk categories
7. **Reporting** - PDF reports with exec summary, detailed analysis

## Roles (5)
- **Admin** - Full access, user management, org settings
- **Manager** - Oversee analysts, assign cases, workload dashboard
- **Analyst** - Conduct investigations, import data, analyze
- **Compliance Officer** - Review cases, approve/reject, sign off
- **Auditor** - Read-only access for audit purposes

## Tech Stack
- **Framework**: Next.js 14 (App Router) + TypeScript
- **Database**: PostgreSQL + Prisma (row-level tenant isolation)
- **Auth**: NextAuth.js with tenant context
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **CSV Parsing**: papaparse
- **PDF**: @react-pdf/renderer or Puppeteer
- **Blockchain APIs**: Etherscan (EVM), Blockchair (BTC)
- **Sanctions**: OFAC SDN list, OpenSanctions API

## Directory Structure
```
src/
├── app/
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── clients/       # Client management
│   │   ├── cases/         # Case management
│   │   ├── reports/       # Report generation
│   │   └── settings/      # User/org settings
│   ├── (auth)/            # Login, password reset
│   ├── portal/            # Client self-service portal
│   └── api/               # API routes
├── components/
│   ├── ui/                # Base components (button, input, card, etc.)
│   ├── layout/            # Sidebar, header
│   ├── uploads/           # Document/CEX upload components
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── db.ts              # Prisma client
│   ├── auth.ts            # Auth utilities
│   ├── parsers/           # CEX export parsers
│   │   ├── binance.ts
│   │   ├── coinbase.ts
│   │   ├── kraken.ts
│   │   └── index.ts       # Auto-detect
│   ├── blockchain/        # On-chain data fetching
│   │   ├── etherscan.ts
│   │   └── blockchair.ts
│   ├── screening/         # Risk screening
│   │   └── sanctions.ts
│   ├── analyzers/         # Analysis logic
│   │   ├── risk.ts
│   │   ├── gains.ts
│   │   └── dex.ts
│   ├── reports/           # Report generation
│   │   └── template.ts
│   └── validators/        # Zod schemas
└── types/                 # TypeScript types
```

## Database Models
- Organization (tenant)
- User (with role)
- Client
- Case
- Wallet
- Transaction
- Document
- Finding (risk flags)
- ChecklistItem
- Report
- AuditLog

## Commands
```bash
npm run dev          # Start dev server
npm run typecheck    # Check types
npm run lint         # Run linter
npm run test         # Run tests
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run ralph        # Run Ralph agent loop
```

## Risk Categories
1. **Sanctions** - OFAC/sanctioned address interaction
2. **Mixer** - Tornado Cash, tumbler usage
3. **Source** - Large unexplained deposits
4. **Jurisdiction** - High-risk country transactions
5. **Behavior** - Layering, rapid movements
6. **Privacy** - Privacy coins, cross-chain bridges
7. **Market** - Darknet, wash trading

## CEX Normalized Format
```typescript
interface Transaction {
  timestamp: Date
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'transfer'
  asset: string
  amount: number
  price?: number
  fee?: number
  exchange: string
  source: 'CEX_IMPORT' | 'ON_CHAIN' | 'MANUAL'
}
```

## Report Sections
1. Cover Page
2. Table of Contents
3. Executive Summary (source of wealth/funds, trustworthiness, net worth)
4. Client Profile
5. Digital Asset Portfolio Summary
6. CEX Analysis (per exchange)
7. On-chain Analysis (per wallet)
8. DEX Activity
9. Risk Assessment
10. Conclusion & Recommendation
11. Appendices
