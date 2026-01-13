import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { TransactionList } from './transaction-list'
import type { Prisma, TransactionType, TransactionSource } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    type?: string
    asset?: string
    source?: string
    startDate?: string
    endDate?: string
    sort?: string
    order?: 'asc' | 'desc'
    page?: string
  }>
}

export default async function ClientTransactionsPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const organizationId = user.organizationId

  const { id } = await params
  const search = await searchParams

  // Fetch client to verify it exists
  const client = await prisma.client.findFirst({
    where: {
      id,
      organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  })

  if (!client) {
    notFound()
  }

  // Build filter conditions
  const where: Prisma.TransactionWhereInput = {
    clientId: id,
    organizationId: organizationId,
  }

  if (search.type) {
    where.type = { in: search.type.split(',') as TransactionType[] }
  }

  if (search.asset) {
    where.asset = { contains: search.asset, mode: 'insensitive' }
  }

  if (search.source) {
    where.source = { in: search.source.split(',') as TransactionSource[] }
  }

  if (search.startDate || search.endDate) {
    const timestampFilter: { gte?: Date; lte?: Date } = {}
    if (search.startDate) {
      timestampFilter.gte = new Date(search.startDate)
    }
    if (search.endDate) {
      // End of the day
      const endDate = new Date(search.endDate)
      endDate.setHours(23, 59, 59, 999)
      timestampFilter.lte = endDate
    }
    where.timestamp = timestampFilter
  }

  // Pagination
  const page = parseInt(search.page || '1', 10)
  const pageSize = 25
  const skip = (page - 1) * pageSize

  // Sorting
  const sortField = search.sort || 'timestamp'
  const sortOrder = search.order || 'desc'
  const orderBy = { [sortField]: sortOrder }

  // Fetch transactions with pagination
  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ])

  // Calculate summary stats (across all filtered transactions, not just current page)
  const allFilteredTransactions = await prisma.transaction.findMany({
    where,
    select: {
      asset: true,
      amount: true,
      price: true,
      value: true,
      timestamp: true,
    },
  })

  const stats = calculateStats(allFilteredTransactions)

  // Get unique assets for the filter dropdown
  const uniqueAssets = await prisma.transaction.findMany({
    where: {
      clientId: id,
      organizationId: organizationId,
    },
    select: { asset: true },
    distinct: ['asset'],
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href="/clients" className="hover:text-primary-600">
          Clients
        </Link>
        <span>/</span>
        <Link href={`/clients/${client.id}`} className="hover:text-primary-600">
          {client.name}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">Transactions</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount} transaction{totalCount !== 1 ? 's' : ''} for {client.name}
          </p>
        </div>
      </div>

      <TransactionList
        transactions={transactions.map((t) => ({
          ...t,
          amount: t.amount.toString(),
          price: t.price?.toString() || null,
          fee: t.fee?.toString() || null,
          value: t.value?.toString() || null,
        }))}
        stats={stats}
        assets={uniqueAssets.map((a) => a.asset)}
        currentFilters={{
          type: search.type || '',
          asset: search.asset || '',
          source: search.source || '',
          startDate: search.startDate || '',
          endDate: search.endDate || '',
        }}
        currentSort={{
          field: sortField,
          order: sortOrder,
        }}
        pagination={{
          page,
          pageSize,
          totalCount,
          totalPages,
        }}
        clientId={id}
      />
    </div>
  )
}

interface TransactionForStats {
  asset: string
  amount: { toString(): string }
  price: { toString(): string } | null
  value: { toString(): string } | null
  timestamp: Date
}

function calculateStats(transactions: TransactionForStats[]) {
  if (transactions.length === 0) {
    return {
      totalVolume: '0',
      uniqueAssets: 0,
      dateRange: null,
      assetBreakdown: [],
    }
  }

  const uniqueAssets = new Set(transactions.map((t) => t.asset))

  // Calculate total volume (sum of absolute values where available)
  let totalVolume = 0
  for (const t of transactions) {
    if (t.value) {
      totalVolume += Math.abs(parseFloat(t.value.toString()))
    } else if (t.price) {
      totalVolume += Math.abs(parseFloat(t.amount.toString()) * parseFloat(t.price.toString()))
    }
  }

  // Get date range
  const dates = transactions.map((t) => t.timestamp)
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())))

  // Asset breakdown (top 5 by transaction count)
  const assetCounts = new Map<string, number>()
  for (const t of transactions) {
    assetCounts.set(t.asset, (assetCounts.get(t.asset) || 0) + 1)
  }
  const assetBreakdown = Array.from(assetCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([asset, count]) => ({ asset, count }))

  return {
    totalVolume: formatCurrency(totalVolume),
    uniqueAssets: uniqueAssets.size,
    dateRange: {
      start: minDate.toISOString(),
      end: maxDate.toISOString(),
    },
    assetBreakdown,
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return `$${value.toFixed(2)}`
}
