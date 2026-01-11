import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  isSupportedBlockchain,
  getWalletBalance,
  calculateHistoricalBalance
} from '@/lib/blockchain'
import type { ParsedTransaction } from '@/types/transaction'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  try {
    const { walletId } = await params
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    // Fetch wallet with transactions
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      include: {
        transactions: {
          where: { source: 'ON_CHAIN' },
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // If a specific date is requested, calculate historical balance
    if (dateParam) {
      const targetDate = new Date(dateParam)
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }

      // Convert DB transactions to ParsedTransaction format for the calculator
      const parsedTxs: ParsedTransaction[] = wallet.transactions.map((tx) => ({
        timestamp: tx.timestamp,
        type: tx.type.toLowerCase() as ParsedTransaction['type'],
        asset: tx.asset,
        amount: parseFloat(tx.amount.toString()),
        price: tx.price ? parseFloat(tx.price.toString()) : undefined,
        fee: tx.fee ? parseFloat(tx.fee.toString()) : undefined,
        exchange: tx.exchange || wallet.blockchain,
        source: 'ON_CHAIN',
        rawData: (tx.rawData as Record<string, unknown>) || undefined,
      }))

      const balances = calculateHistoricalBalance(
        parsedTxs,
        wallet.address,
        wallet.blockchain,
        targetDate
      )

      return NextResponse.json({
        success: true,
        wallet: {
          address: wallet.address,
          blockchain: wallet.blockchain,
        },
        asOf: targetDate.toISOString(),
        balances,
        isHistorical: true,
      })
    }

    // Get current balance from blockchain
    if (!isSupportedBlockchain(wallet.blockchain)) {
      return NextResponse.json(
        { error: `Blockchain ${wallet.blockchain} is not supported for balance fetching` },
        { status: 400 }
      )
    }

    const { balance, symbol } = await getWalletBalance(wallet.address, wallet.blockchain)

    return NextResponse.json({
      success: true,
      wallet: {
        address: wallet.address,
        blockchain: wallet.blockchain,
      },
      balance,
      symbol,
      isHistorical: false,
    })
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch balance' },
      { status: 500 }
    )
  }
}
