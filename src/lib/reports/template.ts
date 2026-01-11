/**
 * Report Template Structure
 *
 * Defines the structure for Digital Asset Due Diligence reports.
 * Reports include comprehensive analysis of client's digital asset holdings,
 * risk assessments, and compliance findings.
 */

import type { RiskLevel, FindingSeverity, FindingCategory, Blockchain, DocumentType, DocumentStatus, TransactionType, CaseStatus } from '@prisma/client'
import type { RiskBreakdown, RiskCategoryScore } from '@/lib/analyzers/risk'

// ============================================
// Report Section Types
// ============================================

/**
 * Complete report data structure
 */
export interface ReportData {
  metadata: ReportMetadata
  coverPage: CoverPageData
  tableOfContents: TableOfContentsData
  executiveSummary: ExecutiveSummaryData
  clientProfile: ClientProfileData
  portfolioSummary: PortfolioSummaryData
  cexAnalysis: CEXAnalysisSection[]
  onChainAnalysis: OnChainAnalysisSection[]
  dexActivity: DEXActivityData
  riskAssessment: RiskAssessmentData
  conclusion: ConclusionData
  appendices: AppendixData[]
}

// ============================================
// Metadata
// ============================================

export interface ReportMetadata {
  reportId: string
  version: number
  generatedAt: Date
  generatedBy: {
    id: string
    name: string
    email: string
  } | null
  caseId: string
  organizationId: string
  organizationName: string
  isLocked: boolean
}

// ============================================
// 1. Cover Page
// ============================================

export interface CoverPageData {
  title: string // "Due Diligence Report"
  subtitle: string // Client name
  caseReference: string // Case ID or reference number
  riskLevel: RiskLevel
  riskScore: number // 0-100
  reportDate: Date
  preparedFor: string // Organization name
  preparedBy: string // Analyst name
  status: 'DRAFT' | 'FINAL'
  logoUrl?: string
  confidentialityNotice: string
}

// ============================================
// 2. Table of Contents
// ============================================

export interface TableOfContentsEntry {
  section: string
  title: string
  page?: number // Page number (for PDF)
  subsections?: TableOfContentsEntry[]
}

export interface TableOfContentsData {
  entries: TableOfContentsEntry[]
}

// ============================================
// 3. Executive Summary
// ============================================

export interface ExecutiveSummaryData {
  overview: string // Brief case overview

  // Source of Wealth assessment
  sourceOfWealth: {
    summary: string // Description of primary wealth sources
    verified: boolean
    sources: string[] // e.g., ["Employment", "Trading profits", "Investment returns"]
    flags: string[] // Any concerns
  }

  // Source of Funds assessment
  sourceOfFunds: {
    summary: string // Description of funds sources
    verified: boolean
    sources: string[] // e.g., ["CEX withdrawals", "Mining rewards", "DeFi yields"]
    flags: string[] // Any concerns
  }

  // Documentation completeness
  documentCompleteness: {
    percentage: number // 0-100
    status: 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE'
    missingDocuments: string[] // List of missing required documents
    verifiedDocuments: DocumentSummary[]
  }

  // Trustworthiness assessment
  trustworthiness: {
    score: number // 0-100
    rating: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA'
    factors: TrustworthinessFactor[]
    summary: string
  }

  // Net worth summary
  netWorth: {
    totalEstimatedValue: number // In USD
    currency: string // Usually "USD"
    breakdown: AssetBreakdown[]
    asOfDate: Date
    methodology: string // How was this calculated
  }

  // Legitimacy assessment
  legitimacyAssessment: {
    rating: 'LEGITIMATE' | 'LIKELY_LEGITIMATE' | 'QUESTIONABLE' | 'ILLEGITIMATE' | 'INCONCLUSIVE'
    confidence: number // 0-100
    summary: string
    keyFindings: string[]
    recommendations: string[]
  }

  // Key metrics
  keyMetrics: {
    totalTransactions: number
    uniqueExchanges: number
    uniqueWallets: number
    dateRange: {
      from: Date
      to: Date
    }
    totalVolumeUSD: number
  }

  // Critical findings summary
  criticalFindings: FindingSummary[]
}

export interface DocumentSummary {
  type: DocumentType
  status: DocumentStatus
  verifiedAt?: Date
  notes?: string
}

export interface TrustworthinessFactor {
  factor: string
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  description: string
  weight: number // How much this factor matters
}

export interface AssetBreakdown {
  asset: string // e.g., "BTC", "ETH", "USD"
  amount: number
  valueUSD: number
  percentage: number // of total
  source: 'CEX' | 'ON_CHAIN' | 'COMBINED'
}

export interface FindingSummary {
  title: string
  severity: FindingSeverity
  category: FindingCategory
  description: string
  isResolved: boolean
  resolution?: string
}

// ============================================
// 4. Client Profile
// ============================================

export interface ClientProfileData {
  clientId: string
  name: string
  email?: string
  phone?: string
  address?: string
  status: string
  riskLevel: RiskLevel
  createdAt: Date
  notes?: string

  // Associated data counts
  walletCount: number
  documentCount: number
  transactionCount: number
  caseCount: number

  // Identification documents
  identificationDocuments: DocumentSummary[]

  // Address verification
  addressVerification: {
    verified: boolean
    document?: DocumentSummary
  }
}

// ============================================
// 5. Portfolio Summary
// ============================================

export interface PortfolioSummaryData {
  totalValueUSD: number
  asOfDate: Date

  // Holdings breakdown
  holdings: PortfolioHolding[]

  // Allocation charts data
  allocationByAsset: AllocationItem[]
  allocationBySource: AllocationItem[]
  allocationByBlockchain: AllocationItem[]

  // Historical data points for charts
  historicalValue?: HistoricalValuePoint[]
}

export interface PortfolioHolding {
  asset: string
  amount: number
  valueUSD: number
  priceUSD: number
  percentageOfPortfolio: number
  source: 'CEX' | 'ON_CHAIN' | 'COMBINED'
  blockchain?: Blockchain
  location?: string // Exchange name or wallet label
}

export interface AllocationItem {
  label: string
  value: number
  percentage: number
  color?: string // For chart display
}

export interface HistoricalValuePoint {
  date: Date
  valueUSD: number
}

// ============================================
// 6. CEX Analysis (per exchange)
// ============================================

export interface CEXAnalysisSection {
  exchange: string // e.g., "Binance", "Coinbase", "Kraken"

  // Account summary
  accountSummary: {
    firstActivityDate: Date
    lastActivityDate: Date
    totalTransactions: number
    dataSource: 'CSV_IMPORT' | 'API_SYNC'
  }

  // Activity overview
  activity: CEXActivityData

  // Gains and losses
  gainsLosses: CEXGainsLossesData

  // Trading patterns
  patterns: CEXPatternData

  // Risk flags specific to this exchange
  flags: CEXFlagData[]
}

export interface CEXActivityData {
  // Transaction type breakdown
  transactionsByType: {
    type: TransactionType
    count: number
    volumeUSD: number
  }[]

  // Top traded assets
  topAssets: {
    asset: string
    buyVolume: number
    sellVolume: number
    netVolume: number
    transactionCount: number
  }[]

  // Monthly activity summary
  monthlyActivity: {
    month: string // "YYYY-MM"
    transactionCount: number
    volumeUSD: number
    depositsUSD: number
    withdrawalsUSD: number
  }[]

  // Current balances (if available)
  currentBalances?: {
    asset: string
    amount: number
    valueUSD: number
  }[]
}

export interface CEXGainsLossesData {
  methodology: 'FIFO' | 'LIFO' | 'AVERAGE_COST'
  periodStart: Date
  periodEnd: Date

  // Summary
  totalRealizedGains: number
  totalRealizedLosses: number
  netRealizedPnL: number

  // Per-asset breakdown
  perAsset: {
    asset: string
    realizedGains: number
    realizedLosses: number
    netPnL: number
    totalBought: number
    totalSold: number
    averageBuyPrice?: number
    averageSellPrice?: number
  }[]

  // Unrealized gains (current holdings)
  unrealizedPnL?: number
}

export interface CEXPatternData {
  // Trading behavior analysis
  tradingBehavior: {
    averageTradeSize: number
    medianTradeSize: number
    largestTrade: number
    smallestTrade: number
    preferredAssets: string[]
    tradingFrequency: 'HIGH' | 'MEDIUM' | 'LOW' // Based on trades per day
    averageTradesPerDay: number
  }

  // Deposit/withdrawal patterns
  depositWithdrawalPatterns: {
    averageDepositSize: number
    averageWithdrawalSize: number
    totalDeposited: number
    totalWithdrawn: number
    netFlow: number // Positive = more deposits, negative = more withdrawals
  }

  // Notable patterns or anomalies
  anomalies: {
    type: string
    description: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
    transactions?: string[] // Related transaction IDs
  }[]
}

export interface CEXFlagData {
  flagId: string
  title: string
  description: string
  severity: FindingSeverity
  category: FindingCategory
  createdAt: Date
  isResolved: boolean
  resolution?: string
  relatedTransactions?: {
    id: string
    timestamp: Date
    type: TransactionType
    asset: string
    amount: number
  }[]
}

// ============================================
// 7. On-chain Analysis (per wallet)
// ============================================

export interface OnChainAnalysisSection {
  wallet: {
    id: string
    address: string
    blockchain: Blockchain
    label?: string
    isVerified: boolean
  }

  // Wallet summary
  summary: WalletSummaryData

  // Transaction timeline
  timeline: WalletTimelineData

  // Counterparty analysis
  counterparties: CounterpartyAnalysisData

  // Risk flags specific to this wallet
  flags: WalletFlagData[]
}

export interface WalletSummaryData {
  firstTransactionDate?: Date
  lastTransactionDate?: Date
  totalTransactions: number
  totalReceived: number
  totalSent: number
  currentBalance: number
  balanceUSD: number
  uniqueCounterparties: number

  // Asset breakdown (for multi-asset wallets like ETH with tokens)
  assets: {
    asset: string
    balance: number
    valueUSD: number
  }[]
}

export interface WalletTimelineData {
  // Key events in chronological order
  events: WalletTimelineEvent[]

  // Monthly summary
  monthlyActivity: {
    month: string // "YYYY-MM"
    transactionCount: number
    received: number
    sent: number
    netFlow: number
  }[]
}

export interface WalletTimelineEvent {
  timestamp: Date
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'SWAP' | 'CONTRACT_INTERACTION' | 'OTHER'
  txHash: string
  direction: 'IN' | 'OUT'
  asset: string
  amount: number
  valueUSD?: number
  counterparty: string
  counterpartyLabel?: string // Known entity label if identified
  isHighRisk?: boolean
  riskReason?: string
}

export interface CounterpartyAnalysisData {
  // Top counterparties by volume
  topCounterparties: CounterpartyDetail[]

  // Categorized counterparties
  knownEntities: CounterpartyDetail[] // Exchanges, protocols, known wallets
  unknownEntities: CounterpartyDetail[] // Unidentified addresses

  // Risk categorization
  highRiskInteractions: {
    address: string
    label?: string
    riskType: string // e.g., "Sanctioned", "Mixer", "Darknet"
    transactionCount: number
    totalValue: number
  }[]
}

export interface CounterpartyDetail {
  address: string
  label?: string // Known entity name
  type?: 'EXCHANGE' | 'PROTOCOL' | 'CONTRACT' | 'EOA' | 'UNKNOWN'
  transactionCount: number
  totalReceived: number
  totalSent: number
  firstInteraction: Date
  lastInteraction: Date
  riskLevel?: RiskLevel
}

export interface WalletFlagData {
  flagId: string
  title: string
  description: string
  severity: FindingSeverity
  category: FindingCategory
  createdAt: Date
  isResolved: boolean
  resolution?: string
  relatedAddress?: string
  relatedTxHash?: string
}

// ============================================
// 8. DEX Activity
// ============================================

export interface DEXActivityData {
  hasDEXActivity: boolean

  // Summary
  summary?: {
    totalSwaps: number
    totalVolumeUSD: number
    uniqueDEXs: string[]
    dateRange: {
      from: Date
      to: Date
    }
  }

  // Per-DEX breakdown
  byDEX?: DEXProtocolData[]

  // Liquidity provision
  liquidityActivity?: LiquidityActivityData

  // Wash trading detection
  washTradingAnalysis?: WashTradingAnalysisData
}

export interface DEXProtocolData {
  protocol: string // e.g., "Uniswap V3", "SushiSwap"
  blockchain: Blockchain
  swapCount: number
  totalVolumeUSD: number

  // Top pairs traded
  topPairs: {
    tokenIn: string
    tokenOut: string
    swapCount: number
    volumeUSD: number
  }[]

  // Notable swaps (large size, unusual tokens, etc.)
  notableSwaps: {
    timestamp: Date
    txHash: string
    tokenIn: string
    amountIn: number
    tokenOut: string
    amountOut: number
    valueUSD: number
    note?: string
  }[]
}

export interface LiquidityActivityData {
  totalLiquidityProvided: number
  totalLiquidityRemoved: number
  currentPositions?: {
    protocol: string
    pair: string
    liquidityValue: number
  }[]
}

export interface WashTradingAnalysisData {
  detected: boolean
  confidence: number // 0-100
  suspiciousPatterns: {
    description: string
    evidence: string[]
    severity: 'LOW' | 'MEDIUM' | 'HIGH'
  }[]
}

// ============================================
// 9. Risk Assessment
// ============================================

export interface RiskAssessmentData {
  // Overall risk
  overallRiskScore: number // 0-100
  overallRiskLevel: RiskLevel

  // Risk breakdown (from risk analyzer)
  breakdown: RiskBreakdown

  // Category details
  categoryDetails: RiskCategoryDetail[]

  // All findings
  allFindings: FindingDetail[]

  // Screening results
  screeningResults: ScreeningResultsData

  // Risk summary narrative
  narrative: string

  // Mitigating factors
  mitigatingFactors: string[]

  // Risk factors
  riskFactors: string[]
}

export interface RiskCategoryDetail {
  category: FindingCategory
  score: number
  weight: number
  description: string
  findingsCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  infoCount: number
  topFindings: FindingDetail[]
}

export interface FindingDetail {
  id: string
  title: string
  description?: string
  severity: FindingSeverity
  category: FindingCategory
  createdAt: Date
  isResolved: boolean
  resolution?: string
  resolvedAt?: Date
  resolvedBy?: string
  linkedWallet?: {
    address: string
    blockchain: Blockchain
  }
  linkedTransaction?: {
    txHash: string
    type: TransactionType
  }
}

export interface ScreeningResultsData {
  sanctions: {
    checked: boolean
    lastChecked?: Date
    matchesFound: boolean
    matches: {
      address: string
      listName: string
      matchType: string
      details?: string
    }[]
  }

  mixerExposure: {
    checked: boolean
    detected: boolean
    protocols: string[]
    totalInteractions: number
    totalValueUSD: number
  }

  privacyCoins: {
    checked: boolean
    detected: boolean
    coins: string[]
    totalValueUSD: number
  }

  highRiskJurisdictions: {
    checked: boolean
    detected: boolean
    jurisdictions: string[]
  }
}

// ============================================
// 10. Conclusion
// ============================================

export interface ConclusionData {
  // Recommendation
  recommendation: 'APPROVE' | 'REJECT' | 'CONDITIONAL_APPROVE' | 'FURTHER_REVIEW'

  // Summary
  summary: string

  // Key points
  keyFindings: string[]

  // Conditions (if conditional approval)
  conditions?: string[]

  // Actions required
  actionsRequired?: string[]

  // Reviewer information
  reviewedBy?: {
    id: string
    name: string
    role: string
  }
  reviewedAt?: Date
  reviewNotes?: string

  // Sign-off status
  signOff?: {
    signed: boolean
    signedBy?: string
    signedAt?: Date
    signature?: string // Digital signature or reference
  }
}

// ============================================
// 11. Appendices
// ============================================

export interface AppendixData {
  id: string
  title: string
  type: AppendixType
  content: unknown // Type depends on appendix type
}

export type AppendixType =
  | 'TRANSACTION_LIST'
  | 'DOCUMENT_LIST'
  | 'FINDING_LIST'
  | 'WALLET_LIST'
  | 'METHODOLOGY'
  | 'GLOSSARY'
  | 'RAW_DATA'

export interface TransactionListAppendix {
  type: 'TRANSACTION_LIST'
  transactions: {
    id: string
    timestamp: Date
    type: TransactionType
    asset: string
    amount: number
    price?: number
    value?: number
    source: string
    exchange?: string
    txHash?: string
  }[]
  totalCount: number
  page?: number
  pageSize?: number
}

export interface DocumentListAppendix {
  type: 'DOCUMENT_LIST'
  documents: {
    id: string
    filename: string
    category: DocumentType
    status: DocumentStatus
    uploadedAt: Date
    verifiedAt?: Date
    verifiedBy?: string
  }[]
}

export interface MethodologyAppendix {
  type: 'METHODOLOGY'
  sections: {
    title: string
    content: string
  }[]
}

export interface GlossaryAppendix {
  type: 'GLOSSARY'
  terms: {
    term: string
    definition: string
  }[]
}

// ============================================
// Report Section Constants
// ============================================

export const REPORT_SECTIONS = [
  { id: 'cover', title: 'Cover Page', required: true },
  { id: 'toc', title: 'Table of Contents', required: true },
  { id: 'executive-summary', title: 'Executive Summary', required: true },
  { id: 'client-profile', title: 'Client Profile', required: true },
  { id: 'portfolio-summary', title: 'Digital Asset Portfolio Summary', required: true },
  { id: 'cex-analysis', title: 'CEX Analysis', required: false },
  { id: 'onchain-analysis', title: 'On-chain Analysis', required: false },
  { id: 'dex-activity', title: 'DEX Activity', required: false },
  { id: 'risk-assessment', title: 'Risk Assessment', required: true },
  { id: 'conclusion', title: 'Conclusion & Recommendation', required: true },
  { id: 'appendices', title: 'Appendices', required: false },
] as const

export type ReportSectionId = typeof REPORT_SECTIONS[number]['id']

// ============================================
// Default Values
// ============================================

export const DEFAULT_CONFIDENTIALITY_NOTICE =
  'This report contains confidential and proprietary information. ' +
  'It is intended solely for the use of the organization named herein. ' +
  'Unauthorized disclosure, copying, or distribution is strictly prohibited.'

export const DEFAULT_METHODOLOGY_SECTIONS = [
  {
    title: 'Data Collection',
    content: 'Transaction data was collected from centralized exchange exports (CSV files and API connections) ' +
      'and blockchain explorers. On-chain data was fetched using public blockchain APIs (Etherscan, Blockchair).',
  },
  {
    title: 'Risk Scoring',
    content: 'Risk scores are calculated using a weighted category system across seven risk dimensions: ' +
      'Sanctions, Mixer Activity, Source of Funds, Jurisdiction, Behavioral Patterns, Privacy Tools, and Market Risk. ' +
      'Each finding contributes to its category score based on severity (Critical=40, High=25, Medium=15, Low=8, Info=3). ' +
      'Category scores are weighted and normalized to produce an overall risk score (0-100).',
  },
  {
    title: 'Address Screening',
    content: 'Wallet addresses and transaction counterparties are screened against OFAC sanctions lists, ' +
      'known mixer/tumbler addresses, and other high-risk entity databases.',
  },
  {
    title: 'Gains/Losses Calculation',
    content: 'Realized gains and losses are calculated using the First-In-First-Out (FIFO) method by default. ' +
      'This method assumes that assets acquired first are also sold first.',
  },
  {
    title: 'Valuation',
    content: 'Asset values are calculated using market prices at the time of the report generation. ' +
      'Historical transaction values use prices at the time of each transaction when available.',
  },
]

export const DEFAULT_GLOSSARY_TERMS = [
  { term: 'CEX', definition: 'Centralized Exchange - A cryptocurrency exchange operated by a centralized company (e.g., Binance, Coinbase).' },
  { term: 'DEX', definition: 'Decentralized Exchange - A peer-to-peer exchange that operates without a central authority (e.g., Uniswap, SushiSwap).' },
  { term: 'OFAC', definition: 'Office of Foreign Assets Control - U.S. government agency that administers economic sanctions programs.' },
  { term: 'Mixer/Tumbler', definition: 'Services that mix cryptocurrency transactions to obscure the trail of funds.' },
  { term: 'Smart Contract', definition: 'Self-executing code deployed on a blockchain that automatically enforces agreement terms.' },
  { term: 'EOA', definition: 'Externally Owned Account - A blockchain account controlled by a private key, as opposed to a smart contract.' },
  { term: 'DeFi', definition: 'Decentralized Finance - Financial services built on blockchain technology without traditional intermediaries.' },
  { term: 'Liquidity Pool', definition: 'A collection of funds locked in a smart contract to facilitate DEX trading.' },
  { term: 'Gas', definition: 'The fee required to perform transactions on blockchain networks like Ethereum.' },
  { term: 'Whale', definition: 'An entity holding a large amount of cryptocurrency that can influence market prices.' },
]

// ============================================
// Helper Functions
// ============================================

/**
 * Get the trustworthiness rating based on score
 */
export function getTrustworthinessRating(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA' {
  if (score >= 75) return 'HIGH'
  if (score >= 50) return 'MEDIUM'
  if (score >= 25) return 'LOW'
  return 'INSUFFICIENT_DATA'
}

/**
 * Get the legitimacy rating based on risk score and findings
 */
export function getLegitimacyRating(
  riskScore: number,
  criticalFindings: number,
  highFindings: number
): 'LEGITIMATE' | 'LIKELY_LEGITIMATE' | 'QUESTIONABLE' | 'ILLEGITIMATE' | 'INCONCLUSIVE' {
  if (criticalFindings > 0 || riskScore >= 75) return 'ILLEGITIMATE'
  if (highFindings > 2 || riskScore >= 50) return 'QUESTIONABLE'
  if (riskScore >= 25) return 'LIKELY_LEGITIMATE'
  if (riskScore < 25) return 'LEGITIMATE'
  return 'INCONCLUSIVE'
}

/**
 * Get document completeness status
 */
export function getDocumentCompletenessStatus(percentage: number): 'COMPLETE' | 'PARTIAL' | 'INCOMPLETE' {
  if (percentage >= 100) return 'COMPLETE'
  if (percentage >= 50) return 'PARTIAL'
  return 'INCOMPLETE'
}

/**
 * Get recommendation based on risk level and findings
 */
export function getRecommendation(
  riskLevel: RiskLevel,
  criticalFindings: number,
  unresolvedHighFindings: number,
  checklistComplete: boolean
): 'APPROVE' | 'REJECT' | 'CONDITIONAL_APPROVE' | 'FURTHER_REVIEW' {
  // Reject if critical findings or very high risk
  if (criticalFindings > 0 || riskLevel === 'CRITICAL') {
    return 'REJECT'
  }

  // Further review if incomplete checklist
  if (!checklistComplete) {
    return 'FURTHER_REVIEW'
  }

  // Conditional if high risk or unresolved high findings
  if (riskLevel === 'HIGH' || unresolvedHighFindings > 0) {
    return 'CONDITIONAL_APPROVE'
  }

  // Approve if low/medium risk
  return 'APPROVE'
}

/**
 * Generate table of contents from report data
 */
export function generateTableOfContents(reportData: ReportData): TableOfContentsData {
  const entries: TableOfContentsEntry[] = []

  entries.push({ section: '1', title: 'Executive Summary' })
  entries.push({ section: '2', title: 'Client Profile' })
  entries.push({ section: '3', title: 'Digital Asset Portfolio Summary' })

  // CEX sections
  if (reportData.cexAnalysis.length > 0) {
    const cexEntry: TableOfContentsEntry = {
      section: '4',
      title: 'CEX Analysis',
      subsections: reportData.cexAnalysis.map((cex, idx) => ({
        section: `4.${idx + 1}`,
        title: cex.exchange,
      })),
    }
    entries.push(cexEntry)
  }

  // On-chain sections
  if (reportData.onChainAnalysis.length > 0) {
    const onchainEntry: TableOfContentsEntry = {
      section: '5',
      title: 'On-chain Analysis',
      subsections: reportData.onChainAnalysis.map((wallet, idx) => ({
        section: `5.${idx + 1}`,
        title: wallet.wallet.label || `${wallet.wallet.blockchain} Wallet`,
      })),
    }
    entries.push(onchainEntry)
  }

  // DEX Activity
  if (reportData.dexActivity.hasDEXActivity) {
    entries.push({ section: '6', title: 'DEX Activity' })
  }

  entries.push({ section: '7', title: 'Risk Assessment' })
  entries.push({ section: '8', title: 'Conclusion & Recommendation' })

  // Appendices
  if (reportData.appendices.length > 0) {
    const appendixEntry: TableOfContentsEntry = {
      section: 'A',
      title: 'Appendices',
      subsections: reportData.appendices.map((appendix, idx) => ({
        section: `A.${idx + 1}`,
        title: appendix.title,
      })),
    }
    entries.push(appendixEntry)
  }

  return { entries }
}

/**
 * Format currency value for display
 */
export function formatCurrencyValue(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format large numbers with abbreviations
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`
  }
  return value.toFixed(2)
}

/**
 * Calculate trading frequency category
 */
export function getTradingFrequency(tradesPerDay: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (tradesPerDay >= 10) return 'HIGH'
  if (tradesPerDay >= 1) return 'MEDIUM'
  return 'LOW'
}
