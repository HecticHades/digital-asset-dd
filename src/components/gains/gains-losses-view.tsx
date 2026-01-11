'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
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
  COST_BASIS_METHODS,
  type CostBasisMethod,
  type GainsLossesResult,
  type DisposalEvent,
  type AssetHolding,
  type AssetGainsLosses,
  formatGainLoss,
} from '@/lib/analyzers/gains'

interface GainsLossesViewProps {
  clientId: string
}

// Method options for select
const METHOD_OPTIONS = Object.entries(COST_BASIS_METHODS).map(([value, { label }]) => ({
  value,
  label,
}))

// Tab type
type ViewTab = 'summary' | 'disposals' | 'holdings' | 'assets'

export function GainsLossesView({ clientId }: GainsLossesViewProps) {
  const [method, setMethod] = useState<CostBasisMethod>('FIFO')
  const [result, setResult] = useState<GainsLossesResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ViewTab>('summary')
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())

  // Year options (last 5 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 5 }, (_, i) => ({
    value: String(currentYear - i),
    label: String(currentYear - i),
  }))

  const fetchGainsLosses = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const startDate = `${year}-01-01`
      const endDate = `${year}-12-31`

      const response = await fetch(
        `/api/gains/${clientId}?method=${method}&startDate=${startDate}&endDate=${endDate}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to calculate gains/losses')
      }

      const data = await response.json()

      // Parse dates back from ISO strings
      const parsedResult: GainsLossesResult = {
        ...data.result,
        period: {
          start: new Date(data.result.period.start),
          end: new Date(data.result.period.end),
        },
        disposalEvents: data.result.disposalEvents.map((e: DisposalEvent & { disposalDate: string }) => ({
          ...e,
          disposalDate: new Date(e.disposalDate),
        })),
        currentHoldings: data.result.currentHoldings.map((h: Record<string, unknown>) => ({
          ...h,
          earliestAcquisition: h.earliestAcquisition ? new Date(h.earliestAcquisition as string) : undefined,
          latestAcquisition: h.latestAcquisition ? new Date(h.latestAcquisition as string) : undefined,
          lots: (h.lots as Array<Record<string, unknown>>).map((l) => ({
            ...l,
            acquisitionDate: new Date(l.acquisitionDate as string),
          })),
        })),
      }

      setResult(parsedResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }, [clientId, method, year])

  useEffect(() => {
    fetchGainsLosses()
  }, [fetchGainsLosses])

  const handleExportCSV = async () => {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`

    window.open(
      `/api/gains/${clientId}?method=${method}&startDate=${startDate}&endDate=${endDate}&format=csv`,
      '_blank'
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(value)
  }

  const GainLossDisplay = ({ value }: { value: number }) => {
    const { formatted, colorClass } = formatGainLoss(value)
    return <span className={colorClass}>{formatted}</span>
  }

  if (loading && !result) {
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
            <span className="ml-3 text-slate-600">Calculating gains and losses...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-600">
            <p className="font-medium">Error calculating gains/losses</p>
            <p className="text-sm mt-1">{error}</p>
            <Button onClick={fetchGainsLosses} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-48">
              <Select
                label="Cost Basis Method"
                options={METHOD_OPTIONS}
                value={method}
                onChange={(e) => setMethod(e.target.value as CostBasisMethod)}
              />
            </div>
            <div className="w-32">
              <Select
                label="Tax Year"
                options={yearOptions}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <Button onClick={fetchGainsLosses} disabled={loading}>
              {loading ? 'Calculating...' : 'Calculate'}
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              Export CSV
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {COST_BASIS_METHODS[method].description}
          </p>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Net Realized Gain/Loss</p>
                <p className="text-2xl font-bold">
                  <GainLossDisplay value={result.summary.netRealizedGainLoss} />
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Short-Term Gain/Loss</p>
                <p className="text-xl font-semibold">
                  <GainLossDisplay value={result.summary.shortTermGainLoss} />
                </p>
                <p className="text-xs text-slate-400 mt-1">Held &lt; 1 year</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Long-Term Gain/Loss</p>
                <p className="text-xl font-semibold">
                  <GainLossDisplay value={result.summary.longTermGainLoss} />
                </p>
                <p className="text-xs text-slate-400 mt-1">Held &gt; 1 year</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">Total Proceeds</p>
                <p className="text-xl font-semibold">
                  {formatCurrency(result.summary.totalProceeds)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {result.disposalEvents.length} disposals
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Card>
            <CardHeader>
              <div className="flex gap-2 border-b pb-2">
                {(['summary', 'disposals', 'holdings', 'assets'] as ViewTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium rounded-t ${
                      activeTab === tab
                        ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-600'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {tab === 'summary' && 'Summary'}
                    {tab === 'disposals' && `Disposals (${result.disposalEvents.length})`}
                    {tab === 'holdings' && `Holdings (${result.currentHoldings.length})`}
                    {tab === 'assets' && `By Asset (${result.assetBreakdown.length})`}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'summary' && (
                <SummaryTab result={result} formatCurrency={formatCurrency} />
              )}
              {activeTab === 'disposals' && (
                <DisposalsTab
                  disposals={result.disposalEvents}
                  formatCurrency={formatCurrency}
                  formatAmount={formatAmount}
                />
              )}
              {activeTab === 'holdings' && (
                <HoldingsTab
                  holdings={result.currentHoldings}
                  formatCurrency={formatCurrency}
                  formatAmount={formatAmount}
                />
              )}
              {activeTab === 'assets' && (
                <AssetsTab
                  assets={result.assetBreakdown}
                  formatCurrency={formatCurrency}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// Summary Tab Component
function SummaryTab({
  result,
  formatCurrency,
}: {
  result: GainsLossesResult
  formatCurrency: (v: number) => string
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-slate-500 mb-2">Proceeds & Cost Basis</h4>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-slate-600">Total Proceeds</dt>
              <dd className="font-medium">{formatCurrency(result.summary.totalProceeds)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Total Cost Basis</dt>
              <dd className="font-medium">{formatCurrency(result.summary.totalCostBasis)}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h4 className="text-sm font-medium text-slate-500 mb-2">Gains & Losses</h4>
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-slate-600">Total Gains</dt>
              <dd className="font-medium text-green-600">
                {formatCurrency(result.summary.totalRealizedGain)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Total Losses</dt>
              <dd className="font-medium text-red-600">
                ({formatCurrency(result.summary.totalRealizedLoss)})
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-slate-500 mb-2">Calculation Period</h4>
        <p className="text-slate-600">
          {format(result.period.start, 'MMM d, yyyy')} - {format(result.period.end, 'MMM d, yyyy')}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Method: {COST_BASIS_METHODS[result.method].label}
        </p>
      </div>

      {result.currentHoldings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-500 mb-2">Current Holdings Summary</h4>
          <p className="text-slate-600">
            {result.currentHoldings.length} assets with total cost basis of{' '}
            {formatCurrency(result.currentHoldings.reduce((sum, h) => sum + h.totalCostBasis, 0))}
          </p>
        </div>
      )}
    </div>
  )
}

// Disposals Tab Component
function DisposalsTab({
  disposals,
  formatCurrency,
  formatAmount,
}: {
  disposals: DisposalEvent[]
  formatCurrency: (v: number) => string
  formatAmount: (v: number) => string
}) {
  if (disposals.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No disposals in the selected period
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Proceeds</TableHead>
            <TableHead className="text-right">Cost Basis</TableHead>
            <TableHead className="text-right">Gain/Loss</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Days Held</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {disposals.map((disposal, index) => {
            const { colorClass } = formatGainLoss(disposal.gainLoss)
            return (
              <TableRow key={`${disposal.transactionId}-${index}`}>
                <TableCell className="whitespace-nowrap">
                  {format(disposal.disposalDate, 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Badge>{disposal.asset}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatAmount(disposal.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(disposal.proceeds)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(disposal.costBasis)}
                </TableCell>
                <TableCell className={`text-right font-medium ${colorClass}`}>
                  {formatCurrency(disposal.gainLoss)}
                </TableCell>
                <TableCell>
                  <Badge variant={disposal.shortTerm ? 'warning' : 'success'}>
                    {disposal.shortTerm ? 'Short' : 'Long'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{disposal.holdingPeriod}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// Holdings Tab Component
function HoldingsTab({
  holdings,
  formatCurrency,
  formatAmount,
}: {
  holdings: AssetHolding[]
  formatCurrency: (v: number) => string
  formatAmount: (v: number) => string
}) {
  if (holdings.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No current holdings
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Avg Cost</TableHead>
            <TableHead className="text-right">Total Cost Basis</TableHead>
            <TableHead>First Acquired</TableHead>
            <TableHead className="text-right">Lots</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((holding) => (
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
              <TableCell className="whitespace-nowrap">
                {holding.earliestAcquisition
                  ? format(holding.earliestAcquisition, 'MMM d, yyyy')
                  : '-'}
              </TableCell>
              <TableCell className="text-right">{holding.lots.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Assets Tab Component
function AssetsTab({
  assets,
  formatCurrency,
}: {
  assets: AssetGainsLosses[]
  formatCurrency: (v: number) => string
}) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No assets traded in the selected period
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Proceeds</TableHead>
            <TableHead className="text-right">Cost Basis</TableHead>
            <TableHead className="text-right">Net Gain/Loss</TableHead>
            <TableHead className="text-right">Short-Term</TableHead>
            <TableHead className="text-right">Long-Term</TableHead>
            <TableHead className="text-right">Disposals</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => {
            const { colorClass } = formatGainLoss(asset.netRealizedGainLoss)
            return (
              <TableRow key={asset.asset}>
                <TableCell>
                  <Badge>{asset.asset}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(asset.totalProceeds)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(asset.totalCostBasis)}
                </TableCell>
                <TableCell className={`text-right font-medium ${colorClass}`}>
                  {formatCurrency(asset.netRealizedGainLoss)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={asset.shortTermGain - asset.shortTermLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(asset.shortTermGain - asset.shortTermLoss)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={asset.longTermGain - asset.longTermLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(asset.longTermGain - asset.longTermLoss)}
                  </span>
                </TableCell>
                <TableCell className="text-right">{asset.disposalCount}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
