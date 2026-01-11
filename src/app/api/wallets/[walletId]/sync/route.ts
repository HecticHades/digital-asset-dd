import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchWalletTransactions, isSupportedBlockchain } from '@/lib/blockchain'
import type { TransactionType, TransactionSource, Blockchain } from '@prisma/client'
import type { ParsedTransaction, ParsedTransactionType } from '@/types/transaction'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Temporary org ID until auth is implemented
const TEMP_ORG_ID = 'temp-org-id'

// Map parsed transaction type to Prisma enum
function mapTransactionType(type: ParsedTransactionType): TransactionType {
  const typeMap: Record<ParsedTransactionType, TransactionType> = {
    buy: 'BUY',
    sell: 'SELL',
    deposit: 'DEPOSIT',
    withdrawal: 'WITHDRAWAL',
    transfer: 'TRANSFER',
    swap: 'SWAP',
    stake: 'STAKE',
    unstake: 'UNSTAKE',
    reward: 'REWARD',
    fee: 'FEE',
    other: 'OTHER',
  }
  return typeMap[type]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  try {
    const { walletId } = await params

    // Fetch wallet with client info
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      include: { client: true },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      )
    }

    // Check if blockchain is supported
    if (!isSupportedBlockchain(wallet.blockchain)) {
      return NextResponse.json(
        { error: `Blockchain ${wallet.blockchain} is not yet supported for on-chain fetching` },
        { status: 400 }
      )
    }

    // Fetch transactions from blockchain
    const transactions = await fetchWalletTransactions(
      wallet.address,
      wallet.blockchain
    )

    if (transactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No transactions found',
        imported: 0,
        skipped: 0,
      })
    }

    // Get existing transactions for this wallet to avoid duplicates
    const existingTxHashes = new Set(
      (
        await prisma.transaction.findMany({
          where: {
            walletId: wallet.id,
            source: 'ON_CHAIN',
            txHash: { not: null },
          },
          select: { txHash: true },
        })
      ).map((t) => t.txHash)
    )

    // Filter out already imported transactions
    const newTransactions = transactions.filter((tx) => {
      const txHash = (tx.rawData as { txHash?: string })?.txHash
      return txHash && !existingTxHashes.has(txHash)
    })

    if (newTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All transactions already imported',
        imported: 0,
        skipped: transactions.length,
      })
    }

    // Prepare transactions for insertion
    const txData: Prisma.TransactionCreateManyInput[] = newTransactions.map((tx) => ({
      organizationId: wallet.organizationId,
      clientId: wallet.clientId,
      walletId: wallet.id,
      timestamp: tx.timestamp,
      type: mapTransactionType(tx.type),
      asset: tx.asset,
      amount: new Prisma.Decimal(tx.amount),
      price: tx.price ? new Prisma.Decimal(tx.price) : null,
      fee: tx.fee ? new Prisma.Decimal(tx.fee) : null,
      value: tx.price ? new Prisma.Decimal(tx.amount * tx.price) : null,
      exchange: tx.exchange,
      source: 'ON_CHAIN' as TransactionSource,
      txHash: (tx.rawData as { txHash?: string })?.txHash || null,
      fromAddress: (tx.rawData as { from?: string })?.from || null,
      toAddress: (tx.rawData as { to?: string })?.to || null,
      rawData: tx.rawData ? (tx.rawData as Prisma.InputJsonValue) : Prisma.JsonNull,
    }))

    // Bulk insert transactions
    const result = await prisma.transaction.createMany({
      data: txData,
      skipDuplicates: true,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.count} transactions`,
      imported: result.count,
      skipped: transactions.length - newTransactions.length,
      total: transactions.length,
    })
  } catch (error) {
    console.error('Error syncing wallet transactions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync transactions' },
      { status: 500 }
    )
  }
}
