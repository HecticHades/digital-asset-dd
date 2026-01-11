/**
 * API Route: Fetch Wallet Transactions
 *
 * GET /api/wallets/[walletId]/transactions
 * Returns all transactions for a wallet for DEX analysis
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Temporary org ID for development
const TEMP_ORG_ID = 'temp-org-id'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ walletId: string }> }
) {
  try {
    const { walletId } = await params

    // Verify wallet exists and belongs to organization
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // Fetch all transactions for the wallet
    const transactions = await prisma.transaction.findMany({
      where: {
        walletId,
        organizationId: TEMP_ORG_ID,
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    // Format transactions for DEX analysis
    const formattedTransactions = transactions.map(tx => ({
      id: tx.id,
      txHash: tx.txHash,
      timestamp: tx.timestamp.toISOString(),
      type: tx.type,
      asset: tx.asset,
      amount: tx.amount.toString(),
      price: tx.price?.toString() || null,
      fee: tx.fee?.toString() || null,
      value: tx.value?.toString() || null,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      source: tx.source,
      rawData: tx.rawData,
    }))

    return NextResponse.json({
      success: true,
      walletId,
      walletAddress: wallet.address,
      blockchain: wallet.blockchain,
      count: formattedTransactions.length,
      transactions: formattedTransactions,
    })
  } catch (error) {
    console.error('Error fetching wallet transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
