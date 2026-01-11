/**
 * Report Data Collector
 *
 * Gathers all data needed to generate a comprehensive due diligence report
 * from the database and transforms it into the ReportData structure.
 */

import { prisma } from '@/lib/db'
import { calculateRiskBreakdown } from '@/lib/analyzers/risk'
import type {
  ReportData,
  ReportMetadata,
  CoverPageData,
  ExecutiveSummaryData,
  ClientProfileData,
  PortfolioSummaryData,
  CEXAnalysisSection,
  OnChainAnalysisSection,
  DEXActivityData,
  RiskAssessmentData,
  ConclusionData,
  AppendixData,
  DocumentSummary,
  FindingSummary,
  AssetBreakdown,
  PortfolioHolding,
  AllocationItem,
  FindingDetail,
  RiskCategoryDetail,
  WalletTimelineEvent,
  CounterpartyDetail,
  WalletFlagData,
  CEXFlagData,
} from './template'
import {
  DEFAULT_CONFIDENTIALITY_NOTICE,
  DEFAULT_METHODOLOGY_SECTIONS,
  DEFAULT_GLOSSARY_TERMS,
  generateTableOfContents,
  getTrustworthinessRating,
  getLegitimacyRating,
  getDocumentCompletenessStatus,
  getRecommendation,
} from './template'
import type { FindingCategory, RiskLevel } from '@prisma/client'
import type { RiskBreakdown as RiskBreakdownType } from '@/lib/analyzers/risk'

// ============================================
// Types
// ============================================

interface CollectorOptions {
  caseId: string
  organizationId: string
  userId?: string
  includeAppendices?: boolean
}

// Case data type from Prisma query
type CaseDataType = NonNullable<Awaited<ReturnType<typeof fetchCaseData>>>

async function fetchCaseData(caseId: string, organizationId: string) {
  return await prisma.case.findFirst({
    where: {
      id: caseId,
      organizationId,
    },
    include: {
      client: {
        include: {
          wallets: {
            include: {
              transactions: {
                orderBy: { timestamp: 'desc' as const },
              },
              findings: {
                include: {
                  resolvedBy: { select: { name: true } },
                },
              },
            },
          },
          documents: {
            include: {
              verifiedBy: { select: { name: true } },
            },
          },
          transactions: {
            orderBy: { timestamp: 'desc' as const },
          },
        },
      },
      findings: {
        include: {
          wallet: { select: { address: true, blockchain: true } },
          transaction: { select: { txHash: true, type: true } },
          resolvedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      checklistItems: {
        include: {
          completedBy: { select: { name: true } },
        },
        orderBy: { order: 'asc' as const },
      },
      assignedTo: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
      organization: { select: { name: true, logo: true } },
    },
  })
}

// ============================================
// Main Collector Function
// ============================================

export async function collectReportData(options: CollectorOptions): Promise<ReportData> {
  const { caseId, organizationId, userId, includeAppendices = true } = options

  // Fetch case with all related data
  const caseData = await fetchCaseData(caseId, organizationId)

  if (!caseData) {
    throw new Error(`Case not found: ${caseId}`)
  }

  // Get user who is generating the report
  let generatedBy: { id: string; name: string; email: string } | null = null
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    })
    generatedBy = user
  }

  // Get next version number
  const lastReport = await prisma.report.findFirst({
    where: { caseId },
    orderBy: { version: 'desc' },
  })
  const nextVersion = (lastReport?.version ?? 0) + 1

  // Calculate risk breakdown
  const riskBreakdown = calculateRiskBreakdown(
    caseData.findings.map((f) => ({
      category: f.category,
      severity: f.severity,
      isResolved: f.isResolved,
    }))
  )

  // Build report sections
  const metadata = buildMetadata(caseData, organizationId, nextVersion, generatedBy)
  const coverPage = buildCoverPage(caseData, riskBreakdown.overallScore, riskBreakdown.riskLevel)
  const executiveSummary = buildExecutiveSummary(caseData, riskBreakdown)
  const clientProfile = buildClientProfile(caseData)
  const portfolioSummary = buildPortfolioSummary(caseData)
  const cexAnalysis = buildCEXAnalysis(caseData)
  const onChainAnalysis = buildOnChainAnalysis(caseData)
  const dexActivity = buildDEXActivity(caseData)
  const riskAssessment = buildRiskAssessment(caseData, riskBreakdown)
  const conclusion = buildConclusion(caseData, riskBreakdown)

  // Build appendices
  const appendices: AppendixData[] = includeAppendices ? buildAppendices(caseData) : []

  // Construct report data
  const reportData: ReportData = {
    metadata,
    coverPage,
    tableOfContents: { entries: [] },
    executiveSummary,
    clientProfile,
    portfolioSummary,
    cexAnalysis,
    onChainAnalysis,
    dexActivity,
    riskAssessment,
    conclusion,
    appendices,
  }

  // Generate table of contents
  reportData.tableOfContents = generateTableOfContents(reportData)

  return reportData
}

// ============================================
// Section Builders
// ============================================

function buildMetadata(
  caseData: CaseDataType,
  organizationId: string,
  version: number,
  generatedBy: { id: string; name: string; email: string } | null
): ReportMetadata {
  return {
    reportId: `RPT-${caseData.id.slice(0, 8)}-${version}`,
    version,
    generatedAt: new Date(),
    generatedBy,
    caseId: caseData.id,
    organizationId,
    organizationName: caseData.organization.name,
    isLocked: caseData.status === 'COMPLETED' || caseData.status === 'APPROVED',
  }
}

function buildCoverPage(
  caseData: CaseDataType,
  riskScore: number,
  riskLevel: RiskLevel
): CoverPageData {
  return {
    title: 'Due Diligence Report',
    subtitle: caseData.client.name,
    caseReference: caseData.id,
    riskLevel,
    riskScore,
    reportDate: new Date(),
    preparedFor: caseData.organization.name,
    preparedBy: caseData.assignedTo?.name ?? 'System',
    status: caseData.status === 'COMPLETED' || caseData.status === 'APPROVED' ? 'FINAL' : 'DRAFT',
    logoUrl: caseData.organization.logo ?? undefined,
    confidentialityNotice: DEFAULT_CONFIDENTIALITY_NOTICE,
  }
}

function buildExecutiveSummary(
  caseData: CaseDataType,
  riskBreakdown: RiskBreakdownType
): ExecutiveSummaryData {
  const client = caseData.client
  const documents = client.documents
  const transactions = client.transactions
  const wallets = client.wallets
  const findings = caseData.findings

  // Document completeness
  const requiredDocTypes = ['ID', 'PROOF_OF_ADDRESS', 'SOURCE_OF_WEALTH', 'SOURCE_OF_FUNDS']
  const verifiedDocs = documents.filter((d) => d.status === 'VERIFIED')
  const verifiedRequiredCount = requiredDocTypes.filter((dt) =>
    verifiedDocs.some((d) => d.category === dt)
  ).length
  const docPercentage = Math.round((verifiedRequiredCount / requiredDocTypes.length) * 100)

  // Calculate net worth from transactions
  const holdingsMap = new Map<string, { amount: number; source: 'CEX' | 'ON_CHAIN' }>()

  for (const tx of transactions) {
    if (tx.source === 'CEX_IMPORT') {
      const current = holdingsMap.get(tx.asset) ?? { amount: 0, source: 'CEX' as const }
      if (tx.type === 'BUY' || tx.type === 'DEPOSIT' || tx.type === 'REWARD') {
        current.amount += Number(tx.amount)
      } else if (tx.type === 'SELL' || tx.type === 'WITHDRAWAL') {
        current.amount -= Number(tx.amount)
      }
      holdingsMap.set(tx.asset, current)
    }
  }

  const assetBreakdown: AssetBreakdown[] = Array.from(holdingsMap.entries())
    .filter(([, data]) => data.amount > 0)
    .map(([asset, data]) => ({
      asset,
      amount: data.amount,
      valueUSD: 0,
      percentage: 0,
      source: data.source,
    }))

  // Critical findings
  const criticalFindings: FindingSummary[] = findings
    .filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
    .slice(0, 5)
    .map((f) => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
      description: f.description ?? '',
      isResolved: f.isResolved,
      resolution: f.resolution ?? undefined,
    }))

  // Trustworthiness score
  const trustScore = Math.max(0, 100 - riskBreakdown.overallScore - (100 - docPercentage) * 0.3)

  // Legitimacy rating
  const legitimacyRating = getLegitimacyRating(
    riskBreakdown.overallScore,
    riskBreakdown.criticalFindings,
    riskBreakdown.highFindings
  )

  // Key metrics
  const txDates = transactions.map((t) => t.timestamp).sort((a, b) => a.getTime() - b.getTime())
  const uniqueExchanges = new Set(transactions.filter((t) => t.exchange).map((t) => t.exchange))

  return {
    overview: `Due diligence report for ${client.name} covering digital asset holdings and transaction history.`,
    sourceOfWealth: {
      summary: 'Source of wealth assessment based on documented sources and transaction analysis.',
      verified: docPercentage >= 75,
      sources: ['Digital asset holdings', 'CEX trading activity'],
      flags: findings.filter((f) => f.category === 'SOURCE' && !f.isResolved).map((f) => f.title),
    },
    sourceOfFunds: {
      summary: 'Source of funds traced through exchange records and on-chain analysis.',
      verified: verifiedDocs.some((d) => d.category === 'SOURCE_OF_FUNDS'),
      sources: Array.from(uniqueExchanges).filter((e): e is string => e !== null),
      flags: findings.filter((f) => f.category === 'SOURCE' && !f.isResolved).map((f) => f.title),
    },
    documentCompleteness: {
      percentage: docPercentage,
      status: getDocumentCompletenessStatus(docPercentage),
      missingDocuments: requiredDocTypes.filter(
        (dt) => !verifiedDocs.some((d) => d.category === dt)
      ),
      verifiedDocuments: verifiedDocs.map((d) => ({
        type: d.category,
        status: d.status,
        verifiedAt: d.verifiedAt ?? undefined,
        notes: d.notes ?? undefined,
      })),
    },
    trustworthiness: {
      score: Math.round(trustScore),
      rating: getTrustworthinessRating(trustScore),
      factors: [
        {
          factor: 'Document Verification',
          impact: docPercentage >= 75 ? 'POSITIVE' : docPercentage >= 50 ? 'NEUTRAL' : 'NEGATIVE',
          description: `${docPercentage}% of required documents verified`,
          weight: 0.3,
        },
        {
          factor: 'Risk Findings',
          impact: riskBreakdown.overallScore < 25 ? 'POSITIVE' : riskBreakdown.overallScore < 50 ? 'NEUTRAL' : 'NEGATIVE',
          description: `${riskBreakdown.totalFindings} unresolved findings`,
          weight: 0.4,
        },
        {
          factor: 'Transaction Transparency',
          impact: transactions.length > 0 ? 'POSITIVE' : 'NEUTRAL',
          description: `${transactions.length} transactions analyzed`,
          weight: 0.3,
        },
      ],
      summary: `Trustworthiness assessment based on document verification (${docPercentage}%), risk findings, and transaction transparency.`,
    },
    netWorth: {
      totalEstimatedValue: 0,
      currency: 'USD',
      breakdown: assetBreakdown,
      asOfDate: new Date(),
      methodology: 'Net worth calculated from CEX exports and on-chain holdings.',
    },
    legitimacyAssessment: {
      rating: legitimacyRating,
      confidence: Math.max(20, 100 - riskBreakdown.overallScore),
      summary: `Based on ${riskBreakdown.totalFindings} findings and ${docPercentage}% document verification.`,
      keyFindings: criticalFindings.map((f) => f.title),
      recommendations: generateRecommendations(riskBreakdown, docPercentage),
    },
    keyMetrics: {
      totalTransactions: transactions.length,
      uniqueExchanges: uniqueExchanges.size,
      uniqueWallets: wallets.length,
      dateRange: {
        from: txDates[0] ?? new Date(),
        to: txDates[txDates.length - 1] ?? new Date(),
      },
      totalVolumeUSD: 0,
    },
    criticalFindings,
  }
}

function buildClientProfile(caseData: CaseDataType): ClientProfileData {
  const client = caseData.client
  const documents = client.documents

  const idDocs = documents
    .filter((d) => d.category === 'ID')
    .map((d): DocumentSummary => ({
      type: d.category,
      status: d.status,
      verifiedAt: d.verifiedAt ?? undefined,
      notes: d.notes ?? undefined,
    }))

  const addressDoc = documents.find((d) => d.category === 'PROOF_OF_ADDRESS' && d.status === 'VERIFIED')

  return {
    clientId: client.id,
    name: client.name,
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    address: client.address ?? undefined,
    status: client.status,
    riskLevel: client.riskLevel,
    createdAt: client.createdAt,
    notes: client.notes ?? undefined,
    walletCount: client.wallets.length,
    documentCount: documents.length,
    transactionCount: client.transactions.length,
    caseCount: 1,
    identificationDocuments: idDocs,
    addressVerification: {
      verified: !!addressDoc,
      document: addressDoc
        ? {
            type: addressDoc.category,
            status: addressDoc.status,
            verifiedAt: addressDoc.verifiedAt ?? undefined,
            notes: addressDoc.notes ?? undefined,
          }
        : undefined,
    },
  }
}

function buildPortfolioSummary(caseData: CaseDataType): PortfolioSummaryData {
  const transactions = caseData.client.transactions
  const wallets = caseData.client.wallets

  // Calculate holdings from transactions
  const holdingsMap = new Map<string, { amount: number; source: 'CEX' | 'ON_CHAIN'; exchange?: string }>()

  for (const tx of transactions) {
    const key = `${tx.asset}-${tx.source === 'CEX_IMPORT' ? tx.exchange : 'ON_CHAIN'}`
    const current = holdingsMap.get(key) ?? {
      amount: 0,
      source: tx.source === 'CEX_IMPORT' ? ('CEX' as const) : ('ON_CHAIN' as const),
      exchange: tx.exchange ?? undefined,
    }

    if (tx.type === 'BUY' || tx.type === 'DEPOSIT' || tx.type === 'REWARD') {
      current.amount += Number(tx.amount)
    } else if (tx.type === 'SELL' || tx.type === 'WITHDRAWAL') {
      current.amount -= Number(tx.amount)
    }

    holdingsMap.set(key, current)
  }

  const holdings: PortfolioHolding[] = Array.from(holdingsMap.entries())
    .filter(([, data]) => data.amount > 0)
    .map(([key, data]) => {
      const asset = key.split('-')[0]
      return {
        asset,
        amount: data.amount,
        valueUSD: 0,
        priceUSD: 0,
        percentageOfPortfolio: 0,
        source: data.source,
        location: data.exchange,
      }
    })

  // Allocation by asset
  const assetTotals = new Map<string, number>()
  for (const h of holdings) {
    assetTotals.set(h.asset, (assetTotals.get(h.asset) ?? 0) + h.amount)
  }
  const allocationByAsset: AllocationItem[] = Array.from(assetTotals.entries()).map(([label, value]) => ({
    label,
    value,
    percentage: 0,
  }))

  // Allocation by source
  const sourceTotals: Record<string, number> = { CEX: 0, ON_CHAIN: 0 }
  for (const h of holdings) {
    if (h.source === 'CEX' || h.source === 'ON_CHAIN') {
      sourceTotals[h.source] += h.amount
    }
  }
  const allocationBySource: AllocationItem[] = [
    { label: 'CEX', value: sourceTotals.CEX, percentage: 0 },
    { label: 'On-Chain', value: sourceTotals.ON_CHAIN, percentage: 0 },
  ]

  // Allocation by blockchain
  const blockchainTotals = new Map<string, number>()
  for (const wallet of wallets) {
    blockchainTotals.set(wallet.blockchain, (blockchainTotals.get(wallet.blockchain) ?? 0) + 1)
  }
  const allocationByBlockchain: AllocationItem[] = Array.from(blockchainTotals.entries()).map(
    ([label, value]) => ({
      label,
      value,
      percentage: 0,
    })
  )

  return {
    totalValueUSD: 0,
    asOfDate: new Date(),
    holdings,
    allocationByAsset,
    allocationBySource,
    allocationByBlockchain,
  }
}

function buildCEXAnalysis(caseData: CaseDataType): CEXAnalysisSection[] {
  const transactions = caseData.client.transactions.filter((t) => t.source === 'CEX_IMPORT')
  const findings = caseData.findings

  // Group by exchange
  const exchangeMap = new Map<string, typeof transactions>()
  for (const tx of transactions) {
    const exchange = tx.exchange ?? 'Unknown'
    const existing = exchangeMap.get(exchange) ?? []
    existing.push(tx)
    exchangeMap.set(exchange, existing)
  }

  return Array.from(exchangeMap.entries()).map(([exchange, txs]): CEXAnalysisSection => {
    const sorted = [...txs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Transaction type breakdown
    const typeGroups = new Map<string, { count: number; volume: number }>()
    for (const tx of txs) {
      const current = typeGroups.get(tx.type) ?? { count: 0, volume: 0 }
      current.count++
      current.volume += Number(tx.amount)
      typeGroups.set(tx.type, current)
    }

    // Top assets
    const assetGroups = new Map<string, { buy: number; sell: number; count: number }>()
    for (const tx of txs) {
      const current = assetGroups.get(tx.asset) ?? { buy: 0, sell: 0, count: 0 }
      current.count++
      if (tx.type === 'BUY') current.buy += Number(tx.amount)
      if (tx.type === 'SELL') current.sell += Number(tx.amount)
      assetGroups.set(tx.asset, current)
    }

    // Monthly activity
    const monthlyMap = new Map<string, { count: number; volume: number; deposits: number; withdrawals: number }>()
    for (const tx of txs) {
      const month = tx.timestamp.toISOString().slice(0, 7)
      const current = monthlyMap.get(month) ?? { count: 0, volume: 0, deposits: 0, withdrawals: 0 }
      current.count++
      current.volume += Number(tx.amount)
      if (tx.type === 'DEPOSIT') current.deposits += Number(tx.amount)
      if (tx.type === 'WITHDRAWAL') current.withdrawals += Number(tx.amount)
      monthlyMap.set(month, current)
    }

    // Related flags
    const exchangeFlags: CEXFlagData[] = findings
      .filter((f) => f.transaction?.type && ['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL'].includes(f.transaction.type))
      .map((f) => ({
        flagId: f.id,
        title: f.title,
        description: f.description ?? '',
        severity: f.severity,
        category: f.category,
        createdAt: f.createdAt,
        isResolved: f.isResolved,
        resolution: f.resolution ?? undefined,
      }))

    return {
      exchange,
      accountSummary: {
        firstActivityDate: sorted[0]?.timestamp ?? new Date(),
        lastActivityDate: sorted[sorted.length - 1]?.timestamp ?? new Date(),
        totalTransactions: txs.length,
        dataSource: 'CSV_IMPORT',
      },
      activity: {
        transactionsByType: Array.from(typeGroups.entries()).map(([type, data]) => ({
          type: type as Parameters<typeof buildCEXAnalysis>[0]['client']['transactions'][0]['type'],
          count: data.count,
          volumeUSD: 0,
        })),
        topAssets: Array.from(assetGroups.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 10)
          .map(([asset, data]) => ({
            asset,
            buyVolume: data.buy,
            sellVolume: data.sell,
            netVolume: data.buy - data.sell,
            transactionCount: data.count,
          })),
        monthlyActivity: Array.from(monthlyMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, data]) => ({
            month,
            transactionCount: data.count,
            volumeUSD: 0,
            depositsUSD: 0,
            withdrawalsUSD: 0,
          })),
      },
      gainsLosses: {
        methodology: 'FIFO',
        periodStart: sorted[0]?.timestamp ?? new Date(),
        periodEnd: sorted[sorted.length - 1]?.timestamp ?? new Date(),
        totalRealizedGains: 0,
        totalRealizedLosses: 0,
        netRealizedPnL: 0,
        perAsset: [],
      },
      patterns: {
        tradingBehavior: {
          averageTradeSize: txs.length > 0 ? txs.reduce((sum, tx) => sum + Number(tx.amount), 0) / txs.length : 0,
          medianTradeSize: 0,
          largestTrade: txs.length > 0 ? Math.max(...txs.map((tx) => Number(tx.amount))) : 0,
          smallestTrade: txs.length > 0 ? Math.min(...txs.filter((tx) => Number(tx.amount) > 0).map((tx) => Number(tx.amount))) : 0,
          preferredAssets: Array.from(assetGroups.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3)
            .map(([asset]) => asset),
          tradingFrequency: 'MEDIUM',
          averageTradesPerDay: 0,
        },
        depositWithdrawalPatterns: {
          averageDepositSize: 0,
          averageWithdrawalSize: 0,
          totalDeposited: txs.filter((t) => t.type === 'DEPOSIT').reduce((sum, t) => sum + Number(t.amount), 0),
          totalWithdrawn: txs.filter((t) => t.type === 'WITHDRAWAL').reduce((sum, t) => sum + Number(t.amount), 0),
          netFlow: 0,
        },
        anomalies: [],
      },
      flags: exchangeFlags,
    }
  })
}

function buildOnChainAnalysis(caseData: CaseDataType): OnChainAnalysisSection[] {
  const wallets = caseData.client.wallets

  return wallets.map((wallet): OnChainAnalysisSection => {
    const txs = wallet.transactions
    const sorted = [...txs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    // Calculate totals
    let totalReceived = 0
    let totalSent = 0
    const counterpartyMap = new Map<string, CounterpartyDetail>()

    for (const tx of txs) {
      const amount = Number(tx.amount)
      if (tx.type === 'DEPOSIT' || tx.toAddress?.toLowerCase() === wallet.address.toLowerCase()) {
        totalReceived += amount
        if (tx.fromAddress) {
          const cp = counterpartyMap.get(tx.fromAddress) ?? createEmptyCounterparty(tx.fromAddress, tx.timestamp)
          cp.totalReceived += amount
          cp.transactionCount++
          cp.lastInteraction = tx.timestamp
          counterpartyMap.set(tx.fromAddress, cp)
        }
      } else if (tx.type === 'WITHDRAWAL' || tx.fromAddress?.toLowerCase() === wallet.address.toLowerCase()) {
        totalSent += amount
        if (tx.toAddress) {
          const cp = counterpartyMap.get(tx.toAddress) ?? createEmptyCounterparty(tx.toAddress, tx.timestamp)
          cp.totalSent += amount
          cp.transactionCount++
          cp.lastInteraction = tx.timestamp
          counterpartyMap.set(tx.toAddress, cp)
        }
      }
    }

    // Timeline events
    const events: WalletTimelineEvent[] = sorted.slice(0, 50).map((tx) => ({
      timestamp: tx.timestamp,
      type: mapTxTypeToTimelineType(tx.type),
      txHash: tx.txHash ?? '',
      direction: (tx.type === 'DEPOSIT' || tx.type === 'REWARD') ? 'IN' : 'OUT',
      asset: tx.asset,
      amount: Number(tx.amount),
      counterparty: tx.fromAddress ?? tx.toAddress ?? 'Unknown',
    }))

    // Monthly activity
    const monthlyMap = new Map<string, { count: number; received: number; sent: number }>()
    for (const tx of txs) {
      const month = tx.timestamp.toISOString().slice(0, 7)
      const current = monthlyMap.get(month) ?? { count: 0, received: 0, sent: 0 }
      current.count++
      const amount = Number(tx.amount)
      if (tx.type === 'DEPOSIT' || tx.type === 'REWARD') {
        current.received += amount
      } else if (tx.type === 'WITHDRAWAL') {
        current.sent += amount
      }
      monthlyMap.set(month, current)
    }

    // Wallet flags
    const walletFlags: WalletFlagData[] = wallet.findings.map((f) => ({
      flagId: f.id,
      title: f.title,
      description: f.description ?? '',
      severity: f.severity,
      category: f.category,
      createdAt: f.createdAt,
      isResolved: f.isResolved,
      resolution: f.resolution ?? undefined,
    }))

    return {
      wallet: {
        id: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        label: wallet.label ?? undefined,
        isVerified: wallet.isVerified,
      },
      summary: {
        firstTransactionDate: sorted[0]?.timestamp,
        lastTransactionDate: sorted[sorted.length - 1]?.timestamp,
        totalTransactions: txs.length,
        totalReceived,
        totalSent,
        currentBalance: totalReceived - totalSent,
        balanceUSD: 0,
        uniqueCounterparties: counterpartyMap.size,
        assets: [],
      },
      timeline: {
        events,
        monthlyActivity: Array.from(monthlyMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, data]) => ({
            month,
            transactionCount: data.count,
            received: data.received,
            sent: data.sent,
            netFlow: data.received - data.sent,
          })),
      },
      counterparties: {
        topCounterparties: Array.from(counterpartyMap.values())
          .sort((a, b) => b.transactionCount - a.transactionCount)
          .slice(0, 10),
        knownEntities: [],
        unknownEntities: Array.from(counterpartyMap.values()),
        highRiskInteractions: [],
      },
      flags: walletFlags,
    }
  })
}

function buildDEXActivity(caseData: CaseDataType): DEXActivityData {
  const swaps = caseData.client.transactions.filter((t) => t.type === 'SWAP')

  if (swaps.length === 0) {
    return { hasDEXActivity: false }
  }

  const sorted = [...swaps].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  return {
    hasDEXActivity: true,
    summary: {
      totalSwaps: swaps.length,
      totalVolumeUSD: 0,
      uniqueDEXs: [],
      dateRange: {
        from: sorted[0]?.timestamp ?? new Date(),
        to: sorted[sorted.length - 1]?.timestamp ?? new Date(),
      },
    },
  }
}

function buildRiskAssessment(
  caseData: CaseDataType,
  riskBreakdown: RiskBreakdownType
): RiskAssessmentData {
  const findings = caseData.findings

  // Category details
  const categoryDetails: RiskCategoryDetail[] = riskBreakdown.categories.map((cat) => {
    const categoryFindings = findings.filter((f) => f.category === cat.category)
    return {
      category: cat.category as FindingCategory,
      score: cat.score,
      weight: cat.weight,
      description: cat.description,
      findingsCount: categoryFindings.filter((f) => !f.isResolved).length,
      criticalCount: categoryFindings.filter((f) => f.severity === 'CRITICAL' && !f.isResolved).length,
      highCount: categoryFindings.filter((f) => f.severity === 'HIGH' && !f.isResolved).length,
      mediumCount: categoryFindings.filter((f) => f.severity === 'MEDIUM' && !f.isResolved).length,
      lowCount: categoryFindings.filter((f) => f.severity === 'LOW' && !f.isResolved).length,
      infoCount: categoryFindings.filter((f) => f.severity === 'INFO' && !f.isResolved).length,
      topFindings: categoryFindings.slice(0, 5).map((f): FindingDetail => ({
        id: f.id,
        title: f.title,
        description: f.description ?? undefined,
        severity: f.severity,
        category: f.category,
        createdAt: f.createdAt,
        isResolved: f.isResolved,
        resolution: f.resolution ?? undefined,
        resolvedAt: f.resolvedAt ?? undefined,
        resolvedBy: f.resolvedBy?.name,
        linkedWallet: f.wallet
          ? { address: f.wallet.address, blockchain: f.wallet.blockchain }
          : undefined,
        linkedTransaction: f.transaction
          ? { txHash: f.transaction.txHash ?? '', type: f.transaction.type }
          : undefined,
      })),
    }
  })

  // All findings
  const allFindings: FindingDetail[] = findings.map((f) => ({
    id: f.id,
    title: f.title,
    description: f.description ?? undefined,
    severity: f.severity,
    category: f.category,
    createdAt: f.createdAt,
    isResolved: f.isResolved,
    resolution: f.resolution ?? undefined,
    resolvedAt: f.resolvedAt ?? undefined,
    resolvedBy: f.resolvedBy?.name,
    linkedWallet: f.wallet
      ? { address: f.wallet.address, blockchain: f.wallet.blockchain }
      : undefined,
    linkedTransaction: f.transaction
      ? { txHash: f.transaction.txHash ?? '', type: f.transaction.type }
      : undefined,
  }))

  // Generate narrative
  const narrative = generateRiskNarrative(riskBreakdown, findings.length)

  return {
    overallRiskScore: riskBreakdown.overallScore,
    overallRiskLevel: riskBreakdown.riskLevel,
    breakdown: riskBreakdown,
    categoryDetails,
    allFindings,
    screeningResults: {
      sanctions: {
        checked: true,
        matchesFound: findings.some((f) => f.category === 'SANCTIONS'),
        matches: [],
      },
      mixerExposure: {
        checked: true,
        detected: findings.some((f) => f.category === 'MIXER'),
        protocols: [],
        totalInteractions: 0,
        totalValueUSD: 0,
      },
      privacyCoins: {
        checked: true,
        detected: findings.some((f) => f.category === 'PRIVACY'),
        coins: [],
        totalValueUSD: 0,
      },
      highRiskJurisdictions: {
        checked: true,
        detected: findings.some((f) => f.category === 'JURISDICTION'),
        jurisdictions: [],
      },
    },
    narrative,
    mitigatingFactors: generateMitigatingFactors(riskBreakdown),
    riskFactors: generateRiskFactors(riskBreakdown),
  }
}

function buildConclusion(
  caseData: CaseDataType,
  riskBreakdown: RiskBreakdownType
): ConclusionData {
  const checklistComplete = caseData.checklistItems
    .filter((i) => i.isRequired)
    .every((i) => i.isCompleted)

  const recommendation = getRecommendation(
    riskBreakdown.riskLevel,
    riskBreakdown.criticalFindings,
    riskBreakdown.highFindings,
    checklistComplete
  )

  const keyFindings: string[] = []
  if (riskBreakdown.criticalFindings > 0) {
    keyFindings.push(`${riskBreakdown.criticalFindings} critical finding(s) identified`)
  }
  if (riskBreakdown.highFindings > 0) {
    keyFindings.push(`${riskBreakdown.highFindings} high severity finding(s) require attention`)
  }
  if (!checklistComplete) {
    keyFindings.push('Compliance checklist incomplete')
  }

  return {
    recommendation,
    summary: generateConclusionSummary(recommendation, riskBreakdown),
    keyFindings,
    conditions: recommendation === 'CONDITIONAL_APPROVE' ? generateConditions(riskBreakdown) : undefined,
    actionsRequired: generateActionsRequired(recommendation),
    reviewedBy: caseData.reviewedBy
      ? {
          id: caseData.reviewedBy.id,
          name: caseData.reviewedBy.name,
          role: 'Compliance Officer',
        }
      : undefined,
    reviewedAt: caseData.reviewedAt ?? undefined,
    reviewNotes: caseData.reviewNotes ?? undefined,
  }
}

function buildAppendices(caseData: CaseDataType): AppendixData[] {
  const appendices: AppendixData[] = []

  // Transaction list
  if (caseData.client.transactions.length > 0) {
    appendices.push({
      id: 'appendix-transactions',
      title: 'Transaction List',
      type: 'TRANSACTION_LIST',
      content: {
        transactions: caseData.client.transactions.slice(0, 100).map((t) => ({
          id: t.id,
          timestamp: t.timestamp,
          type: t.type,
          asset: t.asset,
          amount: Number(t.amount),
          price: t.price ? Number(t.price) : undefined,
          source: t.source,
          exchange: t.exchange ?? undefined,
          txHash: t.txHash ?? undefined,
        })),
        totalCount: caseData.client.transactions.length,
      },
    })
  }

  // Document list
  if (caseData.client.documents.length > 0) {
    appendices.push({
      id: 'appendix-documents',
      title: 'Document List',
      type: 'DOCUMENT_LIST',
      content: {
        documents: caseData.client.documents.map((d) => ({
          id: d.id,
          filename: d.originalName,
          category: d.category,
          status: d.status,
          uploadedAt: d.createdAt,
          verifiedAt: d.verifiedAt ?? undefined,
          verifiedBy: d.verifiedBy?.name,
        })),
      },
    })
  }

  // Methodology
  appendices.push({
    id: 'appendix-methodology',
    title: 'Methodology',
    type: 'METHODOLOGY',
    content: {
      sections: DEFAULT_METHODOLOGY_SECTIONS,
    },
  })

  // Glossary
  appendices.push({
    id: 'appendix-glossary',
    title: 'Glossary',
    type: 'GLOSSARY',
    content: {
      terms: DEFAULT_GLOSSARY_TERMS,
    },
  })

  return appendices
}

// ============================================
// Helper Functions
// ============================================

function createEmptyCounterparty(address: string, firstInteraction: Date): CounterpartyDetail {
  return {
    address,
    transactionCount: 0,
    totalReceived: 0,
    totalSent: 0,
    firstInteraction,
    lastInteraction: firstInteraction,
  }
}

function mapTxTypeToTimelineType(type: string): WalletTimelineEvent['type'] {
  switch (type) {
    case 'DEPOSIT':
      return 'DEPOSIT'
    case 'WITHDRAWAL':
      return 'WITHDRAWAL'
    case 'SWAP':
      return 'SWAP'
    default:
      return 'OTHER'
  }
}

function generateRecommendations(
  riskBreakdown: RiskBreakdownType,
  docPercentage: number
): string[] {
  const recommendations: string[] = []

  if (docPercentage < 100) {
    recommendations.push('Complete all required documentation')
  }
  if (riskBreakdown.highFindings > 0 || riskBreakdown.criticalFindings > 0) {
    recommendations.push('Address all high and critical severity findings')
  }
  if (riskBreakdown.overallScore >= 50) {
    recommendations.push('Enhanced due diligence recommended')
  }

  return recommendations
}

function generateRiskNarrative(
  riskBreakdown: RiskBreakdownType,
  totalFindings: number
): string {
  const level = riskBreakdown.riskLevel
  const score = riskBreakdown.overallScore

  if (level === 'CRITICAL') {
    return `This case presents CRITICAL risk (score: ${score}/100) with ${totalFindings} findings identified. Immediate attention required.`
  }
  if (level === 'HIGH') {
    return `This case presents HIGH risk (score: ${score}/100) with ${totalFindings} findings. Enhanced monitoring and additional review recommended.`
  }
  if (level === 'MEDIUM') {
    return `This case presents MEDIUM risk (score: ${score}/100) with ${totalFindings} findings. Standard due diligence procedures apply.`
  }
  return `This case presents LOW risk (score: ${score}/100). ${totalFindings} findings identified, all within acceptable parameters.`
}

function generateMitigatingFactors(riskBreakdown: RiskBreakdownType): string[] {
  const factors: string[] = []

  if (riskBreakdown.overallScore < 25) {
    factors.push('Overall low risk profile')
  }
  if (riskBreakdown.criticalFindings === 0) {
    factors.push('No critical findings identified')
  }
  if (riskBreakdown.categories.find((c) => c.category === 'SANCTIONS')?.score === 0) {
    factors.push('No sanctions exposure detected')
  }

  return factors
}

function generateRiskFactors(riskBreakdown: RiskBreakdownType): string[] {
  const factors: string[] = []

  const highScoreCategories = riskBreakdown.categories.filter((c) => c.score >= 50)
  for (const cat of highScoreCategories) {
    factors.push(`Elevated ${cat.category.toLowerCase()} risk (score: ${cat.score})`)
  }

  if (riskBreakdown.criticalFindings > 0) {
    factors.push(`${riskBreakdown.criticalFindings} critical finding(s)`)
  }
  if (riskBreakdown.highFindings > 0) {
    factors.push(`${riskBreakdown.highFindings} high severity finding(s)`)
  }

  return factors
}

function generateConditions(riskBreakdown: RiskBreakdownType): string[] {
  const conditions: string[] = []

  if (riskBreakdown.highFindings > 0) {
    conditions.push('Resolve all high severity findings before proceeding')
  }
  conditions.push('Implement enhanced monitoring for 6 months')
  conditions.push('Quarterly review of transaction activity')

  return conditions
}

function generateActionsRequired(
  recommendation: ConclusionData['recommendation']
): string[] {
  const actions: string[] = []

  if (recommendation === 'REJECT') {
    actions.push('Document rejection rationale')
    actions.push('Notify relevant stakeholders')
  } else if (recommendation === 'CONDITIONAL_APPROVE') {
    actions.push('Set up enhanced monitoring')
    actions.push('Schedule follow-up review')
    actions.push('Document conditions and acceptance')
  } else if (recommendation === 'FURTHER_REVIEW') {
    actions.push('Complete outstanding checklist items')
    actions.push('Request additional documentation')
    actions.push('Escalate to senior compliance if needed')
  }

  return actions
}

function generateConclusionSummary(
  recommendation: ConclusionData['recommendation'],
  riskBreakdown: RiskBreakdownType
): string {
  switch (recommendation) {
    case 'APPROVE':
      return `Based on the comprehensive due diligence review, this case is recommended for APPROVAL. The risk score of ${riskBreakdown.overallScore}/100 is within acceptable parameters.`
    case 'CONDITIONAL_APPROVE':
      return `Based on the review, this case is recommended for CONDITIONAL APPROVAL subject to the conditions outlined. Risk score: ${riskBreakdown.overallScore}/100.`
    case 'REJECT':
      return `Based on the review findings, this case is recommended for REJECTION. The risk score of ${riskBreakdown.overallScore}/100 and identified findings exceed acceptable thresholds.`
    case 'FURTHER_REVIEW':
      return `Additional review is required before a final recommendation can be made. Outstanding items must be addressed.`
  }
}
