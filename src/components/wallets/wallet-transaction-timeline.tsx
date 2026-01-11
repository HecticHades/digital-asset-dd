'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Transaction, TransactionType, Blockchain } from '@prisma/client'

interface WalletTransactionTimelineProps {
  walletId: string
  walletAddress: string
  blockchain: Blockchain
  transactions: Transaction[]
  onSync?: () => void
}

const TYPE_COLORS: Record<TransactionType, string> = {
  BUY: 'bg-green-100 text-green-800',
  SELL: 'bg-red-100 text-red-800',
  DEPOSIT: 'bg-blue-100 text-blue-800',
  WITHDRAWAL: 'bg-orange-100 text-orange-800',
  TRANSFER: 'bg-slate-100 text-slate-800',
  SWAP: 'bg-purple-100 text-purple-800',
  STAKE: 'bg-teal-100 text-teal-800',
  UNSTAKE: 'bg-yellow-100 text-yellow-800',
  REWARD: 'bg-emerald-100 text-emerald-800',
  FEE: 'bg-gray-100 text-gray-800',
  OTHER: 'bg-slate-100 text-slate-800',
}

const TYPE_ICONS: Record<TransactionType, string> = {
  BUY: '↓',
  SELL: '↑',
  DEPOSIT: '↓',
  WITHDRAWAL: '↑',
  TRANSFER: '↔',
  SWAP: '⇄',
  STAKE: '🔒',
  UNSTAKE: '🔓',
  REWARD: '🎁',
  FEE: '💸',
  OTHER: '•',
}

export function WalletTransactionTimeline({
  walletId,
  walletAddress,
  blockchain,
  transactions,
  onSync,
}: WalletTransactionTimelineProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)
  const [displayCount, setDisplayCount] = useState(10)

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch(`/api/wallets/${walletId}/sync`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed')
      }

      setSyncResult({
        success: true,
        message: data.message,
      })

      if (onSync && data.imported > 0) {
        onSync()
      }
    } catch (error) {
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const displayedTransactions = transactions.slice(0, displayCount)
  const hasMore = transactions.length > displayCount

  const formatAmount = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
    if (num >= 1) return num.toFixed(4)
    return num.toFixed(8)
  }

  const truncateAddress = (address: string): string => {
    if (address.length <= 13) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getExplorerUrl = (txHash: string): string | null => {
    const explorers: Partial<Record<Blockchain, string>> = {
      ETHEREUM: `https://etherscan.io/tx/${txHash}`,
      BITCOIN: `https://blockchair.com/bitcoin/transaction/${txHash}`,
      POLYGON: `https://polygonscan.com/tx/${txHash}`,
      ARBITRUM: `https://arbiscan.io/tx/${txHash}`,
      OPTIMISM: `https://optimistic.etherscan.io/tx/${txHash}`,
      BSC: `https://bscscan.com/tx/${txHash}`,
      AVALANCHE: `https://snowtrace.io/tx/${txHash}`,
    }
    return explorers[blockchain] || null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">On-Chain Transactions</CardTitle>
        <Button
          onClick={handleSync}
          disabled={isSyncing}
          size="sm"
          variant="outline"
        >
          <RefreshIcon className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Transactions'}
        </Button>
      </CardHeader>

      <CardContent>
        {/* Sync Result Message */}
        {syncResult && (
          <div
            className={`mb-4 p-3 rounded-md ${
              syncResult.success
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {syncResult.message}
          </div>
        )}

        {/* Transaction Count */}
        <div className="text-sm text-slate-500 mb-4">
          {transactions.length} on-chain transaction{transactions.length !== 1 ? 's' : ''}
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <ChainIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium">No on-chain transactions</p>
            <p className="text-sm mt-1">Click &quot;Sync Transactions&quot; to fetch from the blockchain</p>
          </div>
        ) : (
          <>
            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />

              <div className="space-y-4">
                {displayedTransactions.map((tx, index) => {
                  const rawData = tx.rawData as { from?: string; to?: string } | null
                  const counterparty =
                    tx.type === 'DEPOSIT' || tx.type === 'BUY'
                      ? rawData?.from
                      : rawData?.to

                  return (
                    <div key={tx.id} className="relative pl-10">
                      {/* Timeline Dot */}
                      <div
                        className={`absolute left-2 top-2 w-4 h-4 rounded-full flex items-center justify-center text-xs ${TYPE_COLORS[tx.type]}`}
                      >
                        {TYPE_ICONS[tx.type]}
                      </div>

                      {/* Transaction Card */}
                      <div className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={TYPE_COLORS[tx.type]}>{tx.type}</Badge>
                              <span className="font-mono font-medium">
                                {formatAmount(tx.amount.toString())} {tx.asset}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {format(tx.timestamp, 'MMM d, yyyy HH:mm:ss')}
                            </div>
                          </div>

                          {tx.txHash && (
                            <a
                              href={getExplorerUrl(tx.txHash) || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:text-primary-700 font-mono"
                            >
                              {truncateAddress(tx.txHash)}
                              <ExternalLinkIcon className="w-3 h-3 inline ml-1" />
                            </a>
                          )}
                        </div>

                        {counterparty && (
                          <div className="mt-2 text-xs text-slate-600">
                            <span className="text-slate-400">
                              {tx.type === 'DEPOSIT' || tx.type === 'BUY' ? 'From: ' : 'To: '}
                            </span>
                            <span className="font-mono">{truncateAddress(counterparty)}</span>
                          </div>
                        )}

                        {tx.fee && parseFloat(tx.fee.toString()) > 0 && (
                          <div className="mt-1 text-xs text-slate-500">
                            Fee: {formatAmount(tx.fee.toString())}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisplayCount((c) => c + 10)}
                >
                  Load More ({transactions.length - displayCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Icons
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

function ChainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}
