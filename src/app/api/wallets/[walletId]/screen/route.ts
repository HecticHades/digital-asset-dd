/**
 * Wallet Screening API
 * POST /api/wallets/[walletId]/screen
 *
 * Performs risk screening on a wallet and its transactions:
 * - OFAC SDN list check
 * - Tornado Cash / mixer detection
 * - Privacy coin flagging
 *
 * Creates Finding records for any risks detected.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { screenAddress, screenTransaction } from '@/lib/screening/sanctions'
import type { Blockchain, FindingSeverity, FindingCategory } from '@prisma/client'

// Temporary organization ID until auth is implemented
const TEMP_ORG_ID = 'temp-org-id'

interface ScreeningResponse {
  success: boolean
  walletId: string
  address: string
  blockchain: Blockchain
  screenedAt: string
  summary: {
    totalFlags: number
    criticalFlags: number
    highFlags: number
    mediumFlags: number
    lowFlags: number
    newFindingsCreated: number
    existingFindingsSkipped: number
  }
  flags: Array<{
    title: string
    description: string
    severity: FindingSeverity
    category: FindingCategory
    source: string
    findingId?: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
): Promise<NextResponse<ScreeningResponse | { error: string }>> {
  try {
    const { walletId } = await params

    // Fetch wallet with transactions and associated case
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        client: {
          include: {
            cases: {
              where: {
                status: { notIn: ['COMPLETED', 'ARCHIVED'] },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
        transactions: {
          where: { source: 'ON_CHAIN' },
          orderBy: { timestamp: 'desc' },
        },
        findings: {
          where: { isResolved: false },
        },
      },
    })

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Get the active case for this client (to link findings)
    const activeCase = wallet.client.cases[0]
    if (!activeCase) {
      return NextResponse.json(
        { error: 'No active case found for this client. Create a case before screening.' },
        { status: 400 }
      )
    }

    const allFlags: Array<{
      title: string
      description: string
      severity: FindingSeverity
      category: FindingCategory
      source: string
      transactionId?: string
      findingId?: string
    }> = []

    // Screen the wallet address itself
    const walletScreening = screenAddress(wallet.address, wallet.blockchain)
    for (const flag of walletScreening.flags) {
      allFlags.push({
        ...flag,
      })
    }

    // Screen all transactions
    for (const tx of wallet.transactions) {
      const txScreening = screenTransaction(
        tx.txHash || tx.id,
        tx.fromAddress || undefined,
        tx.toAddress || undefined,
        tx.asset,
        wallet.blockchain
      )

      for (const flag of txScreening.flags) {
        allFlags.push({
          ...flag,
          transactionId: tx.id,
        })
      }
    }

    // Deduplicate flags by title + category (same flag from multiple transactions)
    const seenFlags = new Set<string>()
    const uniqueFlags = allFlags.filter(flag => {
      const key = `${flag.title}:${flag.category}`
      if (seenFlags.has(key)) {
        return false
      }
      seenFlags.add(key)
      return true
    })

    // Check existing findings to avoid duplicates
    const existingFindingTitles = new Set(wallet.findings.map(f => f.title))

    // Create findings for new flags
    let newFindingsCreated = 0
    let existingFindingsSkipped = 0

    for (const flag of uniqueFlags) {
      // Skip if a finding with this title already exists
      if (existingFindingTitles.has(flag.title)) {
        existingFindingsSkipped++
        continue
      }

      const finding = await prisma.finding.create({
        data: {
          title: flag.title,
          description: flag.description,
          severity: flag.severity,
          category: flag.category,
          isResolved: false,
          organizationId: TEMP_ORG_ID,
          caseId: activeCase.id,
          walletId: wallet.id,
          transactionId: flag.transactionId,
        },
      })

      flag.findingId = finding.id
      newFindingsCreated++
    }

    // Calculate summary statistics
    const summary = {
      totalFlags: uniqueFlags.length,
      criticalFlags: uniqueFlags.filter(f => f.severity === 'CRITICAL').length,
      highFlags: uniqueFlags.filter(f => f.severity === 'HIGH').length,
      mediumFlags: uniqueFlags.filter(f => f.severity === 'MEDIUM').length,
      lowFlags: uniqueFlags.filter(f => f.severity === 'LOW').length,
      newFindingsCreated,
      existingFindingsSkipped,
    }

    // Update case risk level if critical/high flags found
    if (summary.criticalFlags > 0 || summary.highFlags > 0) {
      const newRiskLevel = summary.criticalFlags > 0 ? 'CRITICAL' : 'HIGH'

      // Only update if new risk level is higher
      const riskPriority = { UNASSESSED: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
      if (riskPriority[newRiskLevel] > riskPriority[activeCase.riskLevel]) {
        await prisma.case.update({
          where: { id: activeCase.id },
          data: { riskLevel: newRiskLevel },
        })
      }
    }

    const response: ScreeningResponse = {
      success: true,
      walletId: wallet.id,
      address: wallet.address,
      blockchain: wallet.blockchain,
      screenedAt: new Date().toISOString(),
      summary,
      flags: uniqueFlags.map(f => ({
        title: f.title,
        description: f.description,
        severity: f.severity,
        category: f.category,
        source: f.source,
        findingId: f.findingId,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Screening error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Screening failed' },
      { status: 500 }
    )
  }
}
