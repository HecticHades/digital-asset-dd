import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'
import type { ParsedTransactionType } from '@/types/transaction'
import { TransactionType, TransactionSource, Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const transactionSchema = z.object({
  timestamp: z.string().or(z.date()),
  type: z.enum(['buy', 'sell', 'deposit', 'withdrawal', 'transfer', 'swap', 'stake', 'unstake', 'reward', 'fee', 'other']),
  asset: z.string().min(1),
  amount: z.number(),
  price: z.number().optional(),
  fee: z.number().optional(),
  feeAsset: z.string().optional(),
  exchange: z.string(),
  source: z.enum(['CEX_IMPORT', 'ON_CHAIN', 'API_SYNC', 'MANUAL']),
  rawData: z.record(z.unknown()).optional(),
})

const importSchema = z.object({
  clientId: z.string().min(1),
  transactions: z.array(transactionSchema),
  exchange: z.string().nullable(),
})

function mapTransactionType(type: ParsedTransactionType): TransactionType {
  const mapping: Record<ParsedTransactionType, TransactionType> = {
    buy: TransactionType.BUY,
    sell: TransactionType.SELL,
    deposit: TransactionType.DEPOSIT,
    withdrawal: TransactionType.WITHDRAWAL,
    transfer: TransactionType.TRANSFER,
    swap: TransactionType.SWAP,
    stake: TransactionType.STAKE,
    unstake: TransactionType.UNSTAKE,
    reward: TransactionType.REWARD,
    fee: TransactionType.FEE,
    other: TransactionType.OTHER,
  }
  return mapping[type]
}

function mapTransactionSource(source: string): TransactionSource {
  const mapping: Record<string, TransactionSource> = {
    CEX_IMPORT: TransactionSource.CEX_IMPORT,
    ON_CHAIN: TransactionSource.ON_CHAIN,
    API_SYNC: TransactionSource.API_SYNC,
    MANUAL: TransactionSource.MANUAL,
  }
  return mapping[source] || TransactionSource.MANUAL
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()

    const validated = importSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validated.error.errors },
        { status: 400 }
      )
    }

    const { clientId, transactions, exchange } = validated.data

    // Verify client exists and belongs to the organization
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: user.organizationId,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Prepare transaction records
    const transactionRecords: Prisma.TransactionCreateManyInput[] = transactions.map((tx) => ({
      timestamp: new Date(tx.timestamp),
      type: mapTransactionType(tx.type as ParsedTransactionType),
      asset: tx.asset,
      amount: tx.amount,
      price: tx.price ?? null,
      fee: tx.fee ?? null,
      value: tx.price && tx.amount ? tx.amount * tx.price : null,
      exchange: tx.exchange || exchange || null,
      source: mapTransactionSource(tx.source),
      rawData: tx.rawData ? (tx.rawData as Prisma.InputJsonValue) : Prisma.JsonNull,
      clientId: clientId,
      organizationId: user.organizationId,
    }))

    // Batch insert transactions
    const result = await prisma.transaction.createMany({
      data: transactionRecords,
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully imported ${result.count} transactions`,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Failed to import transactions:', error)
    return NextResponse.json(
      { error: 'Failed to import transactions' },
      { status: 500 }
    )
  }
}
