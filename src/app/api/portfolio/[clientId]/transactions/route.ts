/**
 * API Route: Fetch All Transactions for Portfolio Calculations
 *
 * GET /api/portfolio/[clientId]/transactions
 * Returns all transactions for a client in TransactionInput format
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { TransactionInput } from '@/lib/analyzers/gains'

export const dynamic = 'force-dynamic'

// Temporary org ID for development
const TEMP_ORG_ID = 'temp-org-id'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    // Verify client exists and belongs to organization
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Fetch all transactions for the client
    const transactions = await prisma.transaction.findMany({
      where: {
        clientId,
        organizationId: TEMP_ORG_ID,
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // Convert to TransactionInput format
    const transactionInputs: TransactionInput[] = transactions.map(tx => ({
      id: tx.id,
      timestamp: tx.timestamp,
      type: tx.type,
      asset: tx.asset,
      amount: tx.amount.toString(),
      price: tx.price?.toString() || null,
      fee: tx.fee?.toString() || null,
      exchange: tx.exchange,
    }))

    return NextResponse.json({
      success: true,
      clientId,
      count: transactionInputs.length,
      transactions: transactionInputs,
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
