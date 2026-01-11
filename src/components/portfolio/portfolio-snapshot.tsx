'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  calculateHoldingsAtDate,
  type PortfolioSnapshot as PortfolioSnapshotType,
  type AssetHolding,
  type TransactionInput,
} from '@/lib/analyzers/gains'

interface PortfolioSnapshotProps {
  clientId: string
}

interface PortfolioData {
  holdings: AssetHolding[]
  totalCostBasis: number
  totalValue?: number
  transactions: TransactionInput[]
}

interface ExchangeHoldings {
  exchange: string
  holdings: { asset: string; amount: number }[]
  totalValue?: number
}

export function PortfolioSnapshot({ clientId }: PortfolioSnapshotProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [historicalDate, setHistoricalDate] = useState<string>('')
  const [historicalSnapshot, setHistoricalSnapshot] = useState<PortfolioSnapshotType | null>(null)
  const [loadingHistorical, setLoadingHistorical] = useState(false)

  // Fetch current holdings from the gains API
  const fetchPortfolio = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gains/${clientId}?method=FIFO`)
      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data')
      }

      const data = await response.json()

      // Parse holdings with proper date conversion
      const holdings = data.result.currentHoldings.map((h: Record<string, unknown>) => ({
        ...h,
        earliestAcquisition: h.earliestAcquisition ? new Date(h.earliestAcquisition as string) : undefined,
        latestAcquisition: h.latestAcquisition ? new Date(h.latestAcquisition as string) : undefined,
        lots: (h.lots as Array<Record<string, unknown>>).map((l) => ({
          ...l,
          acquisitionDate: new Date(l.acquisitionDate as string),
        })),
      })) as AssetHolding[]

      setPortfolioData({
        holdings,
        totalCostBasis: holdings.reduce((sum, h) => sum + h.totalCostBasis, 0),
        transactions: [], // Will be used for historical calculations
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  // Fetch full transactions for historical calculations
  const fetchTransactionsForHistorical = useCallback(async () => {
    try {
      const response = await fetch(`/api/portfolio/${clientId}/transactions`)
      if (response.ok) {
        const data = await response.json()
        if (portfolioData) {
          setPortfolioData({
            ...portfolioData,
            transactions: data.transactions,
          })
        }
      }
    } catch {
      // Ignore error, historical calculations will use current data
    }
  }, [clientId, portfolioData])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  const handleHistoricalDateChange = async () => {
    if (!historicalDate || !portfolioData) return

    setLoadingHistorical(true)
    try {
      // Fetch transactions if not already loaded
      if (portfolioData.transactions.length === 0) {
        await fetchTransactionsForHistorical()
      }

      const targetDate = new Date(historicalDate)
      const snapshot = calculateHoldingsAtDate(portfolioData.transactions, targetDate)
      setHistoricalSnapshot(snapshot)
    } catch (err) {
      console.error('Error calculating historical snapshot:', err)
    } finally {
      setLoadingHistorical(false)
    }
  }

  // Aggregate holdings by asset across all sources
  const aggregatedHoldings = useMemo(() => {
    if (!portfolioData) return []

    const assetMap = new Map<string, {
      asset: string
      totalAmount: number
      totalCostBasis: number
      averageCost: number
      sources: string[]
    }>()

    for (const holding of portfolioData.holdings) {
      const existing = assetMap.get(holding.asset)
      if (existing) {
        existing.totalAmount += holding.totalAmount
        existing.totalCostBasis += holding.totalCostBasis
        existing.averageCost = existing.totalCostBasis / existing.totalAmount
        // Track sources from lots
        holding.lots.forEach(lot => {
          if (lot.exchange && !existing.sources.includes(lot.exchange)) {
            existing.sources.push(lot.exchange)
          }
        })
      } else {
        const sources: string[] = []
        holding.lots.forEach(lot => {
          if (lot.exchange && !sources.includes(lot.exchange)) {
            sources.push(lot.exchange)
          }
        })
        assetMap.set(holding.asset, {
          asset: holding.asset,
          totalAmount: holding.totalAmount,
          totalCostBasis: holding.totalCostBasis,
          averageCost: holding.averageCost,
          sources,
        })
      }
    }

    return Array.from(assetMap.values()).sort((a, b) => b.totalCostBasis - a.totalCostBasis)
  }, [portfolioData])

  // Get exchange breakdown
  const exchangeBreakdown = useMemo((): ExchangeHoldings[] => {
    if (!portfolioData) return []

    const exchangeMap = new Map<string, Map<string, number>>()

    for (const holding of portfolioData.holdings) {
      for (const lot of holding.lots) {
        const exchange = lot.exchange || 'Unknown'
        if (!exchangeMap.has(exchange)) {
          exchangeMap.set(exchange, new Map())
        }
        const assetMap = exchangeMap.get(exchange)!
        const current = assetMap.get(holding.asset) || 0
        assetMap.set(holding.asset, current + lot.amount)
      }
    }

    const result: ExchangeHoldings[] = []
    exchangeMap.forEach((assets, exchange) => {
      const holdings: { asset: string; amount: number }[] = []
      assets.forEach((amount, asset) => {
        holdings.push({ asset, amount })
      })
      result.push({
        exchange,
        holdings: holdings.sort((a, b) => b.amount - a.amount),
      })
    })

    return result.sort((a, b) => b.holdings.length - a.holdings.length)
  }, [portfolioData])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatAmount = (value: number) => {
    if (value === 0) return '0'
    if (Math.abs(value) < 0.0001) {
      return value.toExponential(4)
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
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
            <span className="ml-3 text-slate-600">Loading portfolio...</span>
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
          <Button onClick={fetchPortfolio}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (!portfolioData || aggregatedHoldings.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-slate-500">
          No holdings found. Import transactions from CEX or on-chain sources to see portfolio data.
        </CardContent>
      </Card>
    )
  }

  // Calculate total for pie chart percentages
  const totalPortfolioCostBasis = portfolioData.totalCostBasis

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Assets</p>
            <p className="text-2xl font-bold">{aggregatedHoldings.length}</p>
            <p className="text-xs text-slate-400 mt-1">unique assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Total Cost Basis</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPortfolioCostBasis)}</p>
            <p className="text-xs text-slate-400 mt-1">amount invested</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Exchanges</p>
            <p className="text-2xl font-bold">{exchangeBreakdown.length}</p>
            <p className="text-xs text-slate-400 mt-1">connected sources</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Composition Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Composition</CardTitle>
          <CardDescription>Asset allocation by cost basis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aggregatedHoldings.slice(0, 10).map((holding, index) => {
              const percentage = totalPortfolioCostBasis > 0
                ? (holding.totalCostBasis / totalPortfolioCostBasis) * 100
                : 0
              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-yellow-500',
                'bg-purple-500',
                'bg-pink-500',
                'bg-indigo-500',
                'bg-red-500',
                'bg-orange-500',
                'bg-teal-500',
                'bg-cyan-500',
              ]
              return (
                <div key={holding.asset} className="flex items-center gap-3">
                  <div className="w-16 font-medium">{holding.asset}</div>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[index % colors.length]} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-24 text-right text-sm">
                    <span className="font-medium">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-32 text-right text-sm text-slate-500">
                    {formatCurrency(holding.totalCostBasis)}
                  </div>
                </div>
              )
            })}
            {aggregatedHoldings.length > 10 && (
              <p className="text-sm text-slate-500 text-center pt-2">
                + {aggregatedHoldings.length - 10} more assets
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aggregated Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Holdings</CardTitle>
          <CardDescription>Aggregated across all exchanges</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Cost Basis</TableHead>
                <TableHead>Sources</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatedHoldings.map((holding) => (
                <TableRow key={holding.asset}>
                  <TableCell>
                    <Badge>{holding.asset}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatAmount(holding.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(holding.averageCost)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(holding.totalCostBasis)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {holding.sources.map((source) => (
                        <Badge key={source} variant="info">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Exchange Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>By Exchange</CardTitle>
          <CardDescription>Holdings per connected exchange</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exchangeBreakdown.map((exchange) => (
              <div
                key={exchange.exchange}
                className="border border-slate-200 rounded-lg p-4"
              >
                <h4 className="font-medium text-slate-900 mb-3">
                  {exchange.exchange}
                </h4>
                <div className="space-y-2">
                  {exchange.holdings.slice(0, 5).map((h) => (
                    <div key={h.asset} className="flex justify-between text-sm">
                      <span className="text-slate-600">{h.asset}</span>
                      <span className="font-mono">{formatAmount(h.amount)}</span>
                    </div>
                  ))}
                  {exchange.holdings.length > 5 && (
                    <p className="text-xs text-slate-400 pt-1">
                      + {exchange.holdings.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Historical Snapshot */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Snapshot</CardTitle>
          <CardDescription>View portfolio holdings at a specific date</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end mb-4">
            <div className="w-48">
              <Input
                type="date"
                label="Date"
                value={historicalDate}
                onChange={(e) => setHistoricalDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            <Button
              onClick={handleHistoricalDateChange}
              disabled={!historicalDate || loadingHistorical}
            >
              {loadingHistorical ? 'Calculating...' : 'View Snapshot'}
            </Button>
          </div>

          {historicalSnapshot && (
            <div className="mt-4">
              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  Snapshot as of {format(historicalSnapshot.date, 'MMMM d, yyyy')}
                </p>
                <p className="text-lg font-medium mt-1">
                  Cost Basis: {formatCurrency(historicalSnapshot.totalCostBasis)}
                </p>
                <p className="text-sm text-slate-500">
                  {historicalSnapshot.holdings.length} assets held
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historicalSnapshot.holdings.map((holding) => (
                    <TableRow key={holding.asset}>
                      <TableCell>
                        <Badge>{holding.asset}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(holding.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(holding.totalCostBasis)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Worth Summary */}
      <Card className="bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
        <CardHeader>
          <CardTitle>Client Net Worth (Digital Assets)</CardTitle>
          <CardDescription>Total digital asset holdings based on cost basis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary-700">
            {formatCurrency(totalPortfolioCostBasis)}
          </div>
          <p className="text-sm text-primary-600 mt-2">
            Based on acquisition cost across {aggregatedHoldings.length} assets
            from {exchangeBreakdown.length} exchange(s)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
