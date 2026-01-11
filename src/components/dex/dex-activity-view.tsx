'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import {
  analyzeDEXTransactions,
  getProtocolDisplayName,
  formatSwapDescription,
  calculateVolumeByProtocol,
  type DEXAnalysisResult,
  type SwapEvent,
  type LiquidityEvent,
  type DEXProtocol,
  type DEXTransaction,
} from '@/lib/analyzers/dex'
import type { Blockchain } from '@prisma/client'

interface DEXActivityViewProps {
  walletId: string
  walletAddress: string
  blockchain: Blockchain
}

type ViewTab = 'summary' | 'swaps' | 'liquidity' | 'wash-trades'

export function DEXActivityView({ walletId, walletAddress, blockchain }: DEXActivityViewProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<DEXAnalysisResult | null>(null)
  const [activeTab, setActiveTab] = useState<ViewTab>('summary')

  const fetchAndAnalyzeDEX = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch transactions for this wallet
      const response = await fetch(`/api/wallets/${walletId}/transactions`)
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      const data = await response.json()

      // Convert to DEXTransaction format
      const dexTransactions: DEXTransaction[] = data.transactions.map((tx: Record<string, unknown>) => ({
        hash: tx.txHash as string,
        blockNumber: tx.blockNumber as string || '0',
        timestamp: new Date(tx.timestamp as string).getTime() / 1000,
        from: tx.fromAddress as string || '',
        to: tx.toAddress as string || '',
        value: tx.amount as string || '0',
        input: tx.rawData && typeof tx.rawData === 'object' && 'input' in tx.rawData
          ? (tx.rawData as Record<string, unknown>).input as string
          : '',
        methodId: tx.rawData && typeof tx.rawData === 'object' && 'methodId' in tx.rawData
          ? (tx.rawData as Record<string, unknown>).methodId as string
          : undefined,
        tokenTransfers: tx.rawData && typeof tx.rawData === 'object' && 'tokenTransfers' in tx.rawData
          ? (tx.rawData as Record<string, unknown>).tokenTransfers as DEXTransaction['tokenTransfers']
          : undefined,
      }))

      // Analyze DEX transactions
      const result = analyzeDEXTransactions(dexTransactions, walletAddress, blockchain)
      setAnalysisResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [walletId, walletAddress, blockchain])

  useEffect(() => {
    fetchAndAnalyzeDEX()
  }, [fetchAndAnalyzeDEX])

  // Calculate volume by protocol
  const volumeByProtocol = useMemo(() => {
    if (!analysisResult) return new Map()
    return calculateVolumeByProtocol(analysisResult.swaps)
  }, [analysisResult])

  const formatAmount = (value: number) => {
    if (value === 0) return '0'
    if (Math.abs(value) < 0.0001) {
      return value.toExponential(4)
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <svg
              className="animate-spin h-8 w-8 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="ml-3 text-slate-600">Analyzing DEX activity...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchAndAnalyzeDEX}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (!analysisResult || (analysisResult.swaps.length === 0 && analysisResult.liquidityEvents.length === 0)) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          No DEX activity detected for this wallet.
        </CardContent>
      </Card>
    )
  }

  const { summary } = analysisResult

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Swaps</p>
            <p className="text-2xl font-bold">{summary.totalSwaps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Unique Tokens</p>
            <p className="text-2xl font-bold">{summary.uniqueTokens.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Liquidity Events</p>
            <p className="text-2xl font-bold">{summary.liquidityAdds + summary.liquidityRemoves}</p>
            <p className="text-xs text-slate-400">
              {summary.liquidityAdds} adds, {summary.liquidityRemoves} removes
            </p>
          </CardContent>
        </Card>
        <Card className={summary.potentialWashTrades > 0 ? 'border-yellow-400 bg-yellow-50' : ''}>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Potential Wash Trades</p>
            <p className={`text-2xl font-bold ${summary.potentialWashTrades > 0 ? 'text-yellow-600' : ''}`}>
              {summary.potentialWashTrades}
            </p>
            {summary.potentialWashTrades > 0 && (
              <p className="text-xs text-yellow-600">Review recommended</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex gap-2 border-b pb-2">
            {(['summary', 'swaps', 'liquidity', 'wash-trades'] as ViewTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t ${
                  activeTab === tab
                    ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-600'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                {tab === 'summary' && 'By Protocol'}
                {tab === 'swaps' && `Swaps (${analysisResult.swaps.length})`}
                {tab === 'liquidity' && `Liquidity (${analysisResult.liquidityEvents.length})`}
                {tab === 'wash-trades' && `Wash Trades (${summary.potentialWashTrades})`}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'summary' && (
            <ProtocolSummaryTab
              volumeByProtocol={volumeByProtocol}
              tokenPairBreakdown={summary.tokenPairBreakdown}
            />
          )}
          {activeTab === 'swaps' && (
            <SwapsTab swaps={analysisResult.swaps} formatAmount={formatAmount} />
          )}
          {activeTab === 'liquidity' && (
            <LiquidityTab events={analysisResult.liquidityEvents} formatAmount={formatAmount} />
          )}
          {activeTab === 'wash-trades' && (
            <WashTradesTab
              swaps={analysisResult.swaps}
              potentialCount={summary.potentialWashTrades}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Protocol Summary Tab
function ProtocolSummaryTab({
  volumeByProtocol,
  tokenPairBreakdown,
}: {
  volumeByProtocol: Map<DEXProtocol, { swapCount: number; pairs: string[] }>
  tokenPairBreakdown: Record<string, number>
}) {
  const protocols = Array.from(volumeByProtocol.entries())
    .sort((a, b) => b[1].swapCount - a[1].swapCount)

  const pairs = Object.entries(tokenPairBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Protocol Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Trading Volume by Protocol</h4>
        <div className="space-y-3">
          {protocols.map(([protocol, data]) => {
            const maxCount = protocols[0]?.[1].swapCount || 1
            const percentage = (data.swapCount / maxCount) * 100
            return (
              <div key={protocol}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{getProtocolDisplayName(protocol)}</span>
                  <span className="text-slate-600">{data.swapCount} swaps</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {data.pairs.slice(0, 3).map((pair) => (
                    <Badge key={pair} variant="info">
                      {pair}
                    </Badge>
                  ))}
                  {data.pairs.length > 3 && (
                    <span className="text-xs text-slate-400">+{data.pairs.length - 3} more</span>
                  )}
                </div>
              </div>
            )
          })}
          {protocols.length === 0 && (
            <p className="text-slate-500 text-sm">No protocol data available</p>
          )}
        </div>
      </div>

      {/* Token Pair Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Top Trading Pairs</h4>
        <div className="space-y-2">
          {pairs.map(([pair, count]) => (
            <div key={pair} className="flex justify-between items-center">
              <Badge>{pair}</Badge>
              <span className="text-sm text-slate-600">{count} trades</span>
            </div>
          ))}
          {pairs.length === 0 && (
            <p className="text-slate-500 text-sm">No trading pair data available</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Swaps Tab
function SwapsTab({
  swaps,
  formatAmount,
}: {
  swaps: SwapEvent[]
  formatAmount: (v: number) => string
}) {
  if (swaps.length === 0) {
    return <p className="text-slate-500 text-center py-4">No swaps detected</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Protocol</TableHead>
            <TableHead>Token In</TableHead>
            <TableHead className="text-right">Amount In</TableHead>
            <TableHead>Token Out</TableHead>
            <TableHead className="text-right">Amount Out</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {swaps.map((swap, index) => (
            <TableRow key={`${swap.transactionHash}-${index}`}>
              <TableCell className="whitespace-nowrap">
                {format(swap.timestamp, 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <Badge variant="info">{getProtocolDisplayName(swap.protocol)}</Badge>
              </TableCell>
              <TableCell>
                <Badge>{swap.tokenIn.symbol}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatAmount(swap.amountIn)}
              </TableCell>
              <TableCell>
                <Badge>{swap.tokenOut.symbol}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatAmount(swap.amountOut)}
              </TableCell>
              <TableCell className="text-right text-sm text-slate-600">
                1 {swap.tokenIn.symbol} = {formatAmount(swap.effectivePrice)} {swap.tokenOut.symbol}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Liquidity Tab
function LiquidityTab({
  events,
  formatAmount,
}: {
  events: LiquidityEvent[]
  formatAmount: (v: number) => string
}) {
  if (events.length === 0) {
    return <p className="text-slate-500 text-center py-4">No liquidity events detected</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Protocol</TableHead>
            <TableHead>Token 0</TableHead>
            <TableHead className="text-right">Amount 0</TableHead>
            <TableHead>Token 1</TableHead>
            <TableHead className="text-right">Amount 1</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event, index) => (
            <TableRow key={`${event.transactionHash}-${index}`}>
              <TableCell className="whitespace-nowrap">
                {format(event.timestamp, 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <Badge variant={event.eventType === 'ADD' ? 'success' : 'warning'}>
                  {event.eventType === 'ADD' ? 'Add' : 'Remove'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="info">{getProtocolDisplayName(event.protocol)}</Badge>
              </TableCell>
              <TableCell>
                <Badge>{event.token0.symbol}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatAmount(event.amount0)}
              </TableCell>
              <TableCell>
                <Badge>{event.token1.symbol}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatAmount(event.amount1)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Wash Trades Tab
function WashTradesTab({
  swaps,
  potentialCount,
}: {
  swaps: SwapEvent[]
  potentialCount: number
}) {
  // Find potential wash trade pairs (same token pair, opposite direction, similar amounts)
  const washTradePairs: Array<{ swap1: SwapEvent; swap2: SwapEvent }> = []
  const TIME_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
  const AMOUNT_TOLERANCE = 0.05 // 5%

  const sortedSwaps = [...swaps].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  )

  for (let i = 0; i < sortedSwaps.length - 1; i++) {
    const swap1 = sortedSwaps[i]

    for (let j = i + 1; j < sortedSwaps.length; j++) {
      const swap2 = sortedSwaps[j]

      if (swap2.timestamp.getTime() - swap1.timestamp.getTime() > TIME_WINDOW_MS) {
        break
      }

      const isReverse =
        swap1.tokenIn.address.toLowerCase() === swap2.tokenOut.address.toLowerCase() &&
        swap1.tokenOut.address.toLowerCase() === swap2.tokenIn.address.toLowerCase()

      if (isReverse) {
        const amountRatio = swap1.amountIn / swap2.amountOut
        if (Math.abs(1 - amountRatio) < AMOUNT_TOLERANCE) {
          washTradePairs.push({ swap1, swap2 })
        }
      }
    }
  }

  if (potentialCount === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-green-600 mb-2">
          <svg
            className="w-12 h-12 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-slate-900">No Wash Trading Detected</p>
        <p className="text-sm text-slate-500 mt-1">
          No suspicious self-trading patterns were identified.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex">
          <svg
            className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-yellow-800">
              {potentialCount} Potential Wash Trade Pattern{potentialCount > 1 ? 's' : ''} Detected
            </h4>
            <p className="text-sm text-yellow-700 mt-1">
              Wash trading involves trading with yourself to artificially inflate volume.
              Review these transactions for suspicious activity.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {washTradePairs.map(({ swap1, swap2 }, index) => (
          <div key={index} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="warning">Pattern #{index + 1}</Badge>
              <span className="text-sm text-slate-600">
                {format(swap1.timestamp, 'MMM d, yyyy')} - {format(swap2.timestamp, 'MMM d, yyyy')}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded p-3">
                <p className="text-xs text-slate-500 mb-1">First Trade</p>
                <p className="text-sm">{formatSwapDescription(swap1)}</p>
                <p className="text-xs text-slate-400 mt-1">{format(swap1.timestamp, 'HH:mm:ss')}</p>
              </div>
              <div className="bg-slate-50 rounded p-3">
                <p className="text-xs text-slate-500 mb-1">Reverse Trade</p>
                <p className="text-sm">{formatSwapDescription(swap2)}</p>
                <p className="text-xs text-slate-400 mt-1">{format(swap2.timestamp, 'HH:mm:ss')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
