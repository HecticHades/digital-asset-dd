'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

type TransactionType = 'buy' | 'sell' | 'deposit' | 'withdrawal' | 'transfer' | 'swap' | 'stake' | 'unstake'
type TransactionSource = 'CEX_IMPORT' | 'ON_CHAIN' | 'MANUAL' | 'DEX'

interface Transaction {
  id: string
  timestamp: Date
  type: TransactionType
  asset: string
  amount: number
  price?: number
  fee?: number
  feeAsset?: string
  exchange?: string
  source: TransactionSource
  hash?: string
  fromAddress?: string
  toAddress?: string
  counterparty?: string
  riskFlags?: string[]
  usdValue?: number
}

interface TransactionTimelineProps {
  transactions: Transaction[]
  onTransactionClick?: (transaction: Transaction) => void
  showFilters?: boolean
  maxItems?: number
}

// Filter state
interface FilterState {
  types: TransactionType[]
  sources: TransactionSource[]
  dateRange: 'all' | '7d' | '30d' | '90d' | '1y'
  showFlagged: boolean
  search: string
}

// Transaction type configuration
const typeConfig: Record<TransactionType, { label: string; color: string; icon: React.ReactNode }> = {
  buy: {
    label: 'Buy',
    color: 'text-profit-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  sell: {
    label: 'Sell',
    color: 'text-risk-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
      </svg>
    ),
  },
  deposit: {
    label: 'Deposit',
    color: 'text-neon-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  withdrawal: {
    label: 'Withdrawal',
    color: 'text-caution-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ),
  },
  transfer: {
    label: 'Transfer',
    color: 'text-signal-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  swap: {
    label: 'Swap',
    color: 'text-purple-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  stake: {
    label: 'Stake',
    color: 'text-emerald-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  unstake: {
    label: 'Unstake',
    color: 'text-amber-400',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
  },
}

const sourceConfig: Record<TransactionSource, { label: string; color: string }> = {
  CEX_IMPORT: { label: 'CEX', color: 'bg-signal-500/20 text-signal-400 border-signal-500/30' },
  ON_CHAIN: { label: 'On-chain', color: 'bg-neon-500/20 text-neon-400 border-neon-500/30' },
  DEX: { label: 'DEX', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  MANUAL: { label: 'Manual', color: 'bg-void-600/50 text-void-300 border-void-500/30' },
}

// Format crypto amounts
function formatAmount(amount: number, asset: string): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(2)}M ${asset}`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(2)}K ${asset}`
  }
  if (amount < 0.0001) {
    return `${amount.toExponential(2)} ${asset}`
  }
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset}`
}

// Format USD value
function formatUSD(value?: number): string {
  if (!value) return ''
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Truncate address
function truncateAddress(address?: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Transaction row component
function TransactionRow({
  transaction,
  index,
  onClick,
}: {
  transaction: Transaction
  index: number
  onClick?: () => void
}) {
  const config = typeConfig[transaction.type]
  const source = sourceConfig[transaction.source]
  const hasRiskFlags = transaction.riskFlags && transaction.riskFlags.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="group"
    >
      <button
        onClick={onClick}
        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
          hasRiskFlags
            ? 'bg-risk-500/5 border border-risk-500/20 hover:border-risk-500/40'
            : 'hover:bg-void-800/50'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Timeline dot and line */}
          <div className="relative flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              hasRiskFlags ? 'bg-risk-500/20' : 'bg-void-800'
            } ${config.color}`}>
              {config.icon}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-medium ${config.color}`}>{config.label}</span>
              <span className={`text-2xs px-2 py-0.5 rounded border ${source.color}`}>
                {source.label}
              </span>
              {hasRiskFlags && (
                <span className="text-2xs px-2 py-0.5 rounded bg-risk-500/20 text-risk-400 border border-risk-500/30 animate-pulse">
                  FLAGGED
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-mono font-semibold text-void-100">
                {formatAmount(transaction.amount, transaction.asset)}
              </span>
              {transaction.usdValue && (
                <span className="text-sm text-void-500">
                  {formatUSD(transaction.usdValue)}
                </span>
              )}
            </div>
            {(transaction.fromAddress || transaction.toAddress || transaction.exchange) && (
              <div className="mt-1 flex items-center gap-2 text-xs text-void-500 font-mono">
                {transaction.exchange && <span>{transaction.exchange}</span>}
                {transaction.fromAddress && (
                  <>
                    <span className="text-void-600">from</span>
                    <span className="text-void-400">{truncateAddress(transaction.fromAddress)}</span>
                  </>
                )}
                {transaction.toAddress && (
                  <>
                    <span className="text-void-600">to</span>
                    <span className="text-void-400">{truncateAddress(transaction.toAddress)}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right side - timestamp and fee */}
          <div className="text-right shrink-0">
            <p className="text-sm text-void-400">
              {format(new Date(transaction.timestamp), 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-void-500 font-mono">
              {format(new Date(transaction.timestamp), 'HH:mm:ss')}
            </p>
            {transaction.fee && (
              <p className="text-xs text-void-500 mt-1">
                Fee: {transaction.fee} {transaction.feeAsset || transaction.asset}
              </p>
            )}
          </div>

          {/* Expand icon */}
          <svg
            className="w-4 h-4 text-void-600 group-hover:text-void-400 transition-colors shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Risk flags detail */}
        {hasRiskFlags && (
          <div className="mt-2 ml-12 flex flex-wrap gap-1">
            {transaction.riskFlags!.map((flag, i) => (
              <span
                key={i}
                className="text-2xs px-2 py-0.5 rounded bg-risk-500/10 text-risk-400 border border-risk-500/20"
              >
                {flag}
              </span>
            ))}
          </div>
        )}
      </button>
    </motion.div>
  )
}

// Filter bar component
function FilterBar({
  filters,
  onChange,
  transactionCount,
  filteredCount,
}: {
  filters: FilterState
  onChange: (filters: FilterState) => void
  transactionCount: number
  filteredCount: number
}) {
  const [showTypeFilter, setShowTypeFilter] = useState(false)

  return (
    <div className="space-y-3">
      {/* Search and quick filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-void-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="input-dark pl-10 py-2"
            />
          </div>
        </div>

        {/* Date range filter */}
        <select
          value={filters.dateRange}
          onChange={(e) => onChange({ ...filters, dateRange: e.target.value as FilterState['dateRange'] })}
          className="input-dark py-2 w-auto"
        >
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>

        {/* Flagged only toggle */}
        <button
          onClick={() => onChange({ ...filters, showFlagged: !filters.showFlagged })}
          className={`px-4 py-2 rounded-lg border transition-all ${
            filters.showFlagged
              ? 'bg-risk-500/10 border-risk-500/50 text-risk-400'
              : 'bg-void-800/50 border-void-700/50 text-void-400 hover:border-void-600'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
            Flagged
          </span>
        </button>

        {/* Type filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTypeFilter(!showTypeFilter)}
            className="px-4 py-2 rounded-lg bg-void-800/50 border border-void-700/50 text-void-300 hover:border-void-600 transition-all"
          >
            <span className="flex items-center gap-2">
              Type
              {filters.types.length > 0 && (
                <span className="px-1.5 py-0.5 text-2xs rounded bg-neon-500/20 text-neon-400">
                  {filters.types.length}
                </span>
              )}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          <AnimatePresence>
            {showTypeFilter && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full right-0 mt-2 w-48 p-2 rounded-lg bg-void-900 border border-void-700 shadow-xl z-10"
              >
                {Object.entries(typeConfig).map(([type, config]) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 px-3 py-2 rounded hover:bg-void-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filters.types.includes(type as TransactionType)}
                      onChange={(e) => {
                        const newTypes = e.target.checked
                          ? [...filters.types, type as TransactionType]
                          : filters.types.filter((t) => t !== type)
                        onChange({ ...filters, types: newTypes })
                      }}
                      className="rounded border-void-600 bg-void-800 text-neon-500 focus:ring-neon-500/50"
                    />
                    <span className={config.color}>{config.icon}</span>
                    <span className="text-sm text-void-200">{config.label}</span>
                  </label>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-void-400">
          Showing <span className="text-void-200 font-medium">{filteredCount}</span> of{' '}
          <span className="text-void-200 font-medium">{transactionCount}</span> transactions
        </span>
        {(filters.types.length > 0 || filters.showFlagged || filters.search) && (
          <button
            onClick={() =>
              onChange({ types: [], sources: [], dateRange: 'all', showFlagged: false, search: '' })
            }
            className="text-neon-400 hover:text-neon-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

// Summary stats component
function TransactionSummary({ transactions }: { transactions: Transaction[] }) {
  const stats = useMemo(() => {
    const totalVolume = transactions.reduce((sum, t) => sum + (t.usdValue || 0), 0)
    const buyCount = transactions.filter((t) => t.type === 'buy').length
    const sellCount = transactions.filter((t) => t.type === 'sell').length
    const flaggedCount = transactions.filter((t) => t.riskFlags && t.riskFlags.length > 0).length
    const uniqueAssets = new Set(transactions.map((t) => t.asset)).size

    return { totalVolume, buyCount, sellCount, flaggedCount, uniqueAssets }
  }, [transactions])

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {[
        { label: 'Total Volume', value: formatUSD(stats.totalVolume), color: 'text-void-100' },
        { label: 'Buys', value: stats.buyCount, color: 'text-profit-400' },
        { label: 'Sells', value: stats.sellCount, color: 'text-risk-400' },
        { label: 'Assets', value: stats.uniqueAssets, color: 'text-neon-400' },
        { label: 'Flagged', value: stats.flaggedCount, color: stats.flaggedCount > 0 ? 'text-risk-400' : 'text-void-400' },
      ].map((stat, i) => (
        <div key={i} className="data-panel text-center">
          <p className="text-xs text-void-500 mb-1">{stat.label}</p>
          <p className={`text-lg font-mono font-semibold ${stat.color}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  )
}

export function TransactionTimeline({
  transactions,
  onTransactionClick,
  showFilters = true,
  maxItems,
}: TransactionTimelineProps) {
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    sources: [],
    dateRange: 'all',
    showFlagged: false,
    search: '',
  })

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions]

    // Type filter
    if (filters.types.length > 0) {
      result = result.filter((t) => filters.types.includes(t.type))
    }

    // Source filter
    if (filters.sources.length > 0) {
      result = result.filter((t) => filters.sources.includes(t.source))
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[filters.dateRange]
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      result = result.filter((t) => new Date(t.timestamp) >= cutoff)
    }

    // Flagged filter
    if (filters.showFlagged) {
      result = result.filter((t) => t.riskFlags && t.riskFlags.length > 0)
    }

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase()
      result = result.filter(
        (t) =>
          t.asset.toLowerCase().includes(search) ||
          t.exchange?.toLowerCase().includes(search) ||
          t.hash?.toLowerCase().includes(search) ||
          t.fromAddress?.toLowerCase().includes(search) ||
          t.toAddress?.toLowerCase().includes(search)
      )
    }

    // Sort by timestamp descending
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Limit if specified
    if (maxItems) {
      result = result.slice(0, maxItems)
    }

    return result
  }, [transactions, filters, maxItems])

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-display font-semibold text-void-100">Transaction History</h2>
          <p className="text-sm text-void-400 mt-1">
            Complete record of all digital asset movements
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-void-500">
          <div className="w-2 h-2 rounded-full bg-neon-400 animate-pulse" />
          Live sync
        </div>
      </div>

      <TransactionSummary transactions={transactions} />

      {showFilters && (
        <FilterBar
          filters={filters}
          onChange={setFilters}
          transactionCount={transactions.length}
          filteredCount={filteredTransactions.length}
        />
      )}

      <div className="mt-6 space-y-2 max-h-[600px] overflow-y-auto pr-2">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-void-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-void-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-void-400">No transactions found</p>
            {filters.search || filters.types.length > 0 || filters.showFlagged ? (
              <button
                onClick={() =>
                  setFilters({ types: [], sources: [], dateRange: 'all', showFlagged: false, search: '' })
                }
                className="text-neon-400 hover:text-neon-300 text-sm mt-2"
              >
                Clear filters
              </button>
            ) : (
              <p className="text-void-500 text-sm mt-1">Import transactions to get started</p>
            )}
          </div>
        ) : (
          filteredTransactions.map((transaction, index) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              index={index}
              onClick={() => onTransactionClick?.(transaction)}
            />
          ))
        )}
      </div>
    </div>
  )
}
