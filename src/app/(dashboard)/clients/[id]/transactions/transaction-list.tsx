'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TransactionType, TransactionSource } from '@prisma/client'

interface SerializedTransaction {
  id: string
  timestamp: Date
  type: TransactionType
  asset: string
  amount: string
  price: string | null
  fee: string | null
  value: string | null
  exchange: string | null
  source: TransactionSource
  txHash: string | null
}

interface TransactionStats {
  totalVolume: string
  uniqueAssets: number
  dateRange: { start: string; end: string } | null
  assetBreakdown: { asset: string; count: number }[]
}

interface TransactionListProps {
  transactions: SerializedTransaction[]
  stats: TransactionStats
  assets: string[]
  currentFilters: {
    type: string
    asset: string
    source: string
    startDate: string
    endDate: string
  }
  currentSort: {
    field: string
    order: 'asc' | 'desc'
  }
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
  clientId: string
}

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'SWAP', label: 'Swap' },
  { value: 'STAKE', label: 'Stake' },
  { value: 'UNSTAKE', label: 'Unstake' },
  { value: 'REWARD', label: 'Reward' },
  { value: 'FEE', label: 'Fee' },
  { value: 'OTHER', label: 'Other' },
]

const TRANSACTION_SOURCES: { value: TransactionSource; label: string }[] = [
  { value: 'CEX_IMPORT', label: 'CEX Import' },
  { value: 'ON_CHAIN', label: 'On-chain' },
  { value: 'API_SYNC', label: 'API Sync' },
  { value: 'MANUAL', label: 'Manual' },
]

export function TransactionList({
  transactions,
  stats,
  assets,
  currentFilters,
  currentSort,
  pagination,
  clientId,
}: TransactionListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState(currentFilters)

  const createQueryString = useCallback(
    (params: Record<string, string | undefined>) => {
      const newParams = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(params)) {
        if (value) {
          newParams.set(key, value)
        } else {
          newParams.delete(key)
        }
      }

      return newParams.toString()
    },
    [searchParams]
  )

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const applyFilters = () => {
    const query = createQueryString({
      type: filters.type || undefined,
      asset: filters.asset || undefined,
      source: filters.source || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      page: '1', // Reset to first page when filtering
    })
    router.push(`${pathname}?${query}`)
  }

  const clearFilters = () => {
    setFilters({
      type: '',
      asset: '',
      source: '',
      startDate: '',
      endDate: '',
    })
    router.push(pathname)
  }

  const handleSort = (field: string) => {
    const newOrder =
      currentSort.field === field && currentSort.order === 'desc' ? 'asc' : 'desc'
    const query = createQueryString({
      sort: field,
      order: newOrder,
    })
    router.push(`${pathname}?${query}`)
  }

  const handlePageChange = (newPage: number) => {
    const query = createQueryString({ page: String(newPage) })
    router.push(`${pathname}?${query}`)
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (currentSort.field !== field) {
      return (
        <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    return currentSort.order === 'desc' ? (
      <svg className="w-4 h-4 ml-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 ml-1 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    )
  }

  const hasActiveFilters = Object.values(currentFilters).some((v) => v !== '')

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.totalVolume}</div>
            <p className="text-sm text-slate-500">Total Volume</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.uniqueAssets}</div>
            <p className="text-sm text-slate-500">Unique Assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{pagination.totalCount}</div>
            <p className="text-sm text-slate-500">Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            {stats.dateRange ? (
              <>
                <div className="text-lg font-bold text-slate-900">
                  {format(new Date(stats.dateRange.start), 'MMM yyyy')} -{' '}
                  {format(new Date(stats.dateRange.end), 'MMM yyyy')}
                </div>
                <p className="text-sm text-slate-500">Date Range</p>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-slate-400">-</div>
                <p className="text-sm text-slate-500">Date Range</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asset Breakdown */}
      {stats.assetBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Assets by Transaction Count</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.assetBreakdown.map(({ asset, count }) => (
                <Badge key={asset} variant="default" className="text-sm">
                  {asset}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              label="Type"
              placeholder="All types"
              options={TRANSACTION_TYPES}
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Asset</label>
              <input
                type="text"
                list="asset-list"
                placeholder="Filter by asset..."
                value={filters.asset}
                onChange={(e) => handleFilterChange('asset', e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500"
              />
              <datalist id="asset-list">
                {assets.map((asset) => (
                  <option key={asset} value={asset} />
                ))}
              </datalist>
            </div>
            <Select
              label="Source"
              placeholder="All sources"
              options={TRANSACTION_SOURCES}
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
            />
            <Input
              label="Start Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={applyFilters}>Apply Filters</Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort('timestamp')}
                  className="flex items-center font-medium hover:text-primary-600"
                >
                  Date
                  <SortIcon field="timestamp" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('type')}
                  className="flex items-center font-medium hover:text-primary-600"
                >
                  Type
                  <SortIcon field="type" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('asset')}
                  className="flex items-center font-medium hover:text-primary-600"
                >
                  Asset
                  <SortIcon field="asset" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button
                  onClick={() => handleSort('amount')}
                  className="flex items-center font-medium hover:text-primary-600 ml-auto"
                >
                  Amount
                  <SortIcon field="amount" />
                </button>
              </TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(tx.timestamp), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <TransactionTypeBadge type={tx.type} />
                  </TableCell>
                  <TableCell className="font-medium">{tx.asset}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAmount(tx.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-600">
                    {tx.price ? formatPrice(tx.price) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {tx.value ? formatValue(tx.value) : '-'}
                  </TableCell>
                  <TableCell>
                    <SourceBadge source={tx.source} exchange={tx.exchange} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount} transactions
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {generatePageNumbers(pagination.page, pagination.totalPages).map((pageNum, idx) =>
                pageNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
                    ...
                  </span>
                ) : (
                  <Button
                    key={pageNum}
                    variant={pageNum === pagination.page ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum as number)}
                  >
                    {pageNum}
                  </Button>
                )
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper components
function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const variants: Record<TransactionType, 'default' | 'success' | 'error' | 'info' | 'warning'> = {
    BUY: 'success',
    SELL: 'error',
    DEPOSIT: 'info',
    WITHDRAWAL: 'warning',
    TRANSFER: 'default',
    SWAP: 'info',
    STAKE: 'success',
    UNSTAKE: 'warning',
    REWARD: 'success',
    FEE: 'default',
    OTHER: 'default',
  }
  return <Badge variant={variants[type]}>{type}</Badge>
}

function SourceBadge({ source, exchange }: { source: TransactionSource; exchange: string | null }) {
  const names: Record<TransactionSource, string> = {
    CEX_IMPORT: 'CEX',
    ON_CHAIN: 'On-chain',
    API_SYNC: 'API',
    MANUAL: 'Manual',
  }
  return (
    <Badge variant="default">
      {exchange ? `${exchange}` : names[source]}
    </Badge>
  )
}

// Helper functions
function formatAmount(amount: string): string {
  const num = parseFloat(amount)
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(2)}M`
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(2)}K`
  if (Math.abs(num) >= 1) return num.toFixed(4)
  return num.toFixed(8)
}

function formatPrice(price: string): string {
  const num = parseFloat(price)
  if (num >= 1000) return `$${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  if (num >= 1) return `$${num.toFixed(2)}`
  return `$${num.toFixed(6)}`
}

function formatValue(value: string): string {
  const num = parseFloat(value)
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
  if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(2)}K`
  return `$${num.toFixed(2)}`
}

function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | string)[] = []

  // Always show first page
  pages.push(1)

  if (current > 3) {
    pages.push('...')
  }

  // Show pages around current
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) {
      pages.push(i)
    }
  }

  if (current < total - 2) {
    pages.push('...')
  }

  // Always show last page
  if (!pages.includes(total)) {
    pages.push(total)
  }

  return pages
}
