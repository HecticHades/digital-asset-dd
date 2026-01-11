/**
 * CEX Gains/Losses Calculator
 *
 * Calculates realized gains/losses per asset with support for:
 * - FIFO (First In, First Out)
 * - LIFO (Last In, First Out)
 * - Average Cost (Weighted Average)
 *
 * Also tracks acquisition dates and calculates holdings value at specific dates.
 */

import { TransactionType } from '@prisma/client'

// ============================================
// Types
// ============================================

export type CostBasisMethod = 'FIFO' | 'LIFO' | 'AVERAGE_COST'

export interface TransactionInput {
  id: string
  timestamp: Date
  type: TransactionType
  asset: string
  amount: string // Use string for Decimal compatibility
  price?: string | null
  fee?: string | null
  exchange?: string | null
}

/**
 * Represents a single lot of an asset acquired at a specific cost
 */
export interface CostBasisLot {
  id: string // Transaction ID that created this lot
  acquisitionDate: Date
  amount: number // Remaining amount in lot
  originalAmount: number // Original amount acquired
  costBasis: number // Cost per unit
  totalCost: number // Total cost of acquisition
  exchange?: string | null
}

/**
 * Represents a single disposal event and its gain/loss
 */
export interface DisposalEvent {
  transactionId: string
  disposalDate: Date
  asset: string
  amount: number
  proceeds: number // Sale price * amount
  costBasis: number // Cost basis used
  gainLoss: number // Proceeds - cost basis
  shortTerm: boolean // Less than 1 year holding
  lotId: string // The lot this came from
  holdingPeriod: number // Days held
  exchange?: string | null
}

/**
 * Summary of gains/losses for a single asset
 */
export interface AssetGainsLosses {
  asset: string
  totalRealizedGain: number
  totalRealizedLoss: number
  netRealizedGainLoss: number
  shortTermGain: number
  shortTermLoss: number
  longTermGain: number
  longTermLoss: number
  totalProceeds: number
  totalCostBasis: number
  disposalCount: number
  disposals: DisposalEvent[]
}

/**
 * Current holdings for a single asset
 */
export interface AssetHolding {
  asset: string
  totalAmount: number
  averageCost: number
  totalCostBasis: number
  currentValue?: number
  unrealizedGainLoss?: number
  lots: CostBasisLot[]
  earliestAcquisition?: Date
  latestAcquisition?: Date
}

/**
 * Portfolio holdings at a specific point in time
 */
export interface PortfolioSnapshot {
  date: Date
  holdings: AssetHolding[]
  totalCostBasis: number
  totalValue?: number
}

/**
 * Complete gains/losses calculation result
 */
export interface GainsLossesResult {
  method: CostBasisMethod
  period: {
    start: Date
    end: Date
  }
  summary: {
    totalRealizedGain: number
    totalRealizedLoss: number
    netRealizedGainLoss: number
    shortTermGainLoss: number
    longTermGainLoss: number
    totalProceeds: number
    totalCostBasis: number
  }
  assetBreakdown: AssetGainsLosses[]
  currentHoldings: AssetHolding[]
  disposalEvents: DisposalEvent[]
}

// ============================================
// Constants
// ============================================

/**
 * Cost basis method descriptions
 */
export const COST_BASIS_METHODS: Record<CostBasisMethod, { label: string; description: string }> = {
  FIFO: {
    label: 'First In, First Out',
    description: 'Oldest acquired assets are sold first. Most common method for tax reporting.',
  },
  LIFO: {
    label: 'Last In, First Out',
    description: 'Most recently acquired assets are sold first. May minimize short-term gains.',
  },
  AVERAGE_COST: {
    label: 'Average Cost',
    description: 'Uses weighted average cost of all holdings. Simpler to track.',
  },
}

/**
 * Transaction types that increase holdings (acquisitions)
 */
export const ACQUISITION_TYPES: TransactionType[] = [
  'BUY',
  'DEPOSIT',
  'REWARD',
  'UNSTAKE',
  'TRANSFER', // Incoming transfers
]

/**
 * Transaction types that decrease holdings (disposals)
 */
export const DISPOSAL_TYPES: TransactionType[] = [
  'SELL',
  'WITHDRAWAL',
  'SWAP', // Swap out
  'FEE',
  'STAKE',
]

// ============================================
// Helper Functions
// ============================================

/**
 * Parse a string/Decimal to number safely
 */
function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const parsed = parseFloat(value)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Check if a transaction is an acquisition
 */
function isAcquisition(type: TransactionType): boolean {
  return ACQUISITION_TYPES.includes(type)
}

/**
 * Check if a transaction is a disposal
 */
function isDisposal(type: TransactionType): boolean {
  return DISPOSAL_TYPES.includes(type)
}

/**
 * Calculate holding period in days
 */
function calculateHoldingPeriod(acquisitionDate: Date, disposalDate: Date): number {
  const diffTime = disposalDate.getTime() - acquisitionDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if holding qualifies as long-term (> 365 days in most jurisdictions)
 */
function isLongTerm(holdingPeriod: number): boolean {
  return holdingPeriod > 365
}

/**
 * Sort transactions by timestamp
 */
function sortTransactionsByTimestamp(transactions: TransactionInput[]): TransactionInput[] {
  return [...transactions].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

/**
 * Deep clone lots array
 */
function cloneLots(lots: CostBasisLot[]): CostBasisLot[] {
  return lots.map(lot => ({ ...lot, acquisitionDate: new Date(lot.acquisitionDate) }))
}

// ============================================
// Cost Basis Calculation Engines
// ============================================

/**
 * Process disposal using FIFO method
 * Returns the lots consumed and remaining lots
 */
function processFIFODisposal(
  lots: CostBasisLot[],
  amount: number
): { consumed: { lot: CostBasisLot; amountUsed: number }[]; remaining: CostBasisLot[] } {
  const consumed: { lot: CostBasisLot; amountUsed: number }[] = []
  const remaining: CostBasisLot[] = []
  let amountToDispose = amount

  // Sort lots by acquisition date (oldest first)
  const sortedLots = [...lots].sort((a, b) =>
    a.acquisitionDate.getTime() - b.acquisitionDate.getTime()
  )

  for (const lot of sortedLots) {
    if (amountToDispose <= 0) {
      remaining.push({ ...lot })
      continue
    }

    if (lot.amount <= amountToDispose) {
      // Use entire lot
      consumed.push({ lot: { ...lot }, amountUsed: lot.amount })
      amountToDispose -= lot.amount
    } else {
      // Partial lot usage
      consumed.push({ lot: { ...lot }, amountUsed: amountToDispose })
      remaining.push({
        ...lot,
        amount: lot.amount - amountToDispose,
        totalCost: (lot.amount - amountToDispose) * lot.costBasis,
      })
      amountToDispose = 0
    }
  }

  return { consumed, remaining }
}

/**
 * Process disposal using LIFO method
 * Returns the lots consumed and remaining lots
 */
function processLIFODisposal(
  lots: CostBasisLot[],
  amount: number
): { consumed: { lot: CostBasisLot; amountUsed: number }[]; remaining: CostBasisLot[] } {
  const consumed: { lot: CostBasisLot; amountUsed: number }[] = []
  const remaining: CostBasisLot[] = []
  let amountToDispose = amount

  // Sort lots by acquisition date (newest first)
  const sortedLots = [...lots].sort((a, b) =>
    b.acquisitionDate.getTime() - a.acquisitionDate.getTime()
  )

  for (const lot of sortedLots) {
    if (amountToDispose <= 0) {
      remaining.push({ ...lot })
      continue
    }

    if (lot.amount <= amountToDispose) {
      // Use entire lot
      consumed.push({ lot: { ...lot }, amountUsed: lot.amount })
      amountToDispose -= lot.amount
    } else {
      // Partial lot usage
      consumed.push({ lot: { ...lot }, amountUsed: amountToDispose })
      remaining.push({
        ...lot,
        amount: lot.amount - amountToDispose,
        totalCost: (lot.amount - amountToDispose) * lot.costBasis,
      })
      amountToDispose = 0
    }
  }

  return { consumed, remaining }
}

/**
 * Process disposal using Average Cost method
 * Returns the average cost used and updates lots to single average lot
 */
function processAverageCostDisposal(
  lots: CostBasisLot[],
  amount: number
): { averageCost: number; remaining: CostBasisLot[] } {
  if (lots.length === 0) {
    return { averageCost: 0, remaining: [] }
  }

  // Calculate weighted average cost
  const totalAmount = lots.reduce((sum, lot) => sum + lot.amount, 0)
  const totalCost = lots.reduce((sum, lot) => sum + lot.totalCost, 0)
  const averageCost = totalAmount > 0 ? totalCost / totalAmount : 0

  // Calculate remaining amount
  const remainingAmount = totalAmount - amount

  if (remainingAmount <= 0) {
    return { averageCost, remaining: [] }
  }

  // Create single consolidated lot at average cost
  const earliestLot = lots.reduce((earliest, lot) =>
    lot.acquisitionDate < earliest.acquisitionDate ? lot : earliest
  )

  const remaining: CostBasisLot[] = [{
    id: 'average-cost-lot',
    acquisitionDate: earliestLot.acquisitionDate, // Use earliest for holding period
    amount: remainingAmount,
    originalAmount: remainingAmount,
    costBasis: averageCost,
    totalCost: remainingAmount * averageCost,
    exchange: lots[0].exchange,
  }]

  return { averageCost, remaining }
}

// ============================================
// Main Calculation Functions
// ============================================

/**
 * Calculate realized gains/losses for a set of transactions
 *
 * @param transactions - Array of transactions to analyze
 * @param method - Cost basis method to use (FIFO, LIFO, or AVERAGE_COST)
 * @param startDate - Optional start date for filtering
 * @param endDate - Optional end date for filtering
 * @returns Complete gains/losses calculation result
 */
export function calculateGainsLosses(
  transactions: TransactionInput[],
  method: CostBasisMethod = 'FIFO',
  startDate?: Date,
  endDate?: Date
): GainsLossesResult {
  // Sort transactions chronologically
  const sortedTransactions = sortTransactionsByTimestamp(transactions)

  // Filter by date range if provided
  const effectiveStart = startDate || (sortedTransactions.length > 0 ? new Date(sortedTransactions[0].timestamp) : new Date())
  const effectiveEnd = endDate || new Date()

  // Track lots per asset
  const lotsByAsset: Map<string, CostBasisLot[]> = new Map()
  const disposalEvents: DisposalEvent[] = []

  // Process each transaction
  for (const tx of sortedTransactions) {
    const txDate = new Date(tx.timestamp)
    const amount = toNumber(tx.amount)
    const price = toNumber(tx.price)
    const asset = tx.asset.toUpperCase()

    if (!lotsByAsset.has(asset)) {
      lotsByAsset.set(asset, [])
    }

    if (isAcquisition(tx.type) && amount > 0) {
      // Add new lot
      const lots = lotsByAsset.get(asset)!
      lots.push({
        id: tx.id,
        acquisitionDate: txDate,
        amount: amount,
        originalAmount: amount,
        costBasis: price,
        totalCost: amount * price,
        exchange: tx.exchange,
      })
    } else if (isDisposal(tx.type) && amount > 0) {
      const lots = lotsByAsset.get(asset)!

      // Only record disposals within date range
      if (txDate >= effectiveStart && txDate <= effectiveEnd) {
        const proceeds = amount * price

        // Process disposal based on method
        if (method === 'AVERAGE_COST') {
          const { averageCost, remaining } = processAverageCostDisposal(lots, amount)
          const costBasis = averageCost * amount
          const gainLoss = proceeds - costBasis

          // Use earliest acquisition date for holding period
          const earliestAcquisition = lots.length > 0
            ? lots.reduce((min, lot) => lot.acquisitionDate < min ? lot.acquisitionDate : min, lots[0].acquisitionDate)
            : txDate
          const holdingPeriod = calculateHoldingPeriod(earliestAcquisition, txDate)

          disposalEvents.push({
            transactionId: tx.id,
            disposalDate: txDate,
            asset,
            amount,
            proceeds,
            costBasis,
            gainLoss,
            shortTerm: !isLongTerm(holdingPeriod),
            lotId: 'average-cost',
            holdingPeriod,
            exchange: tx.exchange,
          })

          lotsByAsset.set(asset, remaining)
        } else {
          // FIFO or LIFO
          const processDisposal = method === 'FIFO' ? processFIFODisposal : processLIFODisposal
          const { consumed, remaining } = processDisposal(lots, amount)

          // Create disposal events for each consumed lot
          for (const { lot, amountUsed } of consumed) {
            const lotProceeds = (proceeds / amount) * amountUsed
            const lotCostBasis = lot.costBasis * amountUsed
            const gainLoss = lotProceeds - lotCostBasis
            const holdingPeriod = calculateHoldingPeriod(lot.acquisitionDate, txDate)

            disposalEvents.push({
              transactionId: tx.id,
              disposalDate: txDate,
              asset,
              amount: amountUsed,
              proceeds: lotProceeds,
              costBasis: lotCostBasis,
              gainLoss,
              shortTerm: !isLongTerm(holdingPeriod),
              lotId: lot.id,
              holdingPeriod,
              exchange: tx.exchange,
            })
          }

          lotsByAsset.set(asset, remaining)
        }
      } else {
        // Process disposal outside date range (update lots but don't record)
        if (method === 'AVERAGE_COST') {
          const { remaining } = processAverageCostDisposal(lots, amount)
          lotsByAsset.set(asset, remaining)
        } else {
          const processDisposal = method === 'FIFO' ? processFIFODisposal : processLIFODisposal
          const { remaining } = processDisposal(lots, amount)
          lotsByAsset.set(asset, remaining)
        }
      }
    }
  }

  // Calculate asset-level breakdown
  const assetBreakdown = calculateAssetBreakdown(disposalEvents)

  // Calculate current holdings
  const currentHoldings = calculateCurrentHoldings(lotsByAsset)

  // Calculate summary
  const summary = calculateSummary(assetBreakdown)

  return {
    method,
    period: {
      start: effectiveStart,
      end: effectiveEnd,
    },
    summary,
    assetBreakdown,
    currentHoldings,
    disposalEvents,
  }
}

/**
 * Calculate asset-level gains/losses breakdown
 */
function calculateAssetBreakdown(disposalEvents: DisposalEvent[]): AssetGainsLosses[] {
  const assetMap = new Map<string, AssetGainsLosses>()

  for (const event of disposalEvents) {
    if (!assetMap.has(event.asset)) {
      assetMap.set(event.asset, {
        asset: event.asset,
        totalRealizedGain: 0,
        totalRealizedLoss: 0,
        netRealizedGainLoss: 0,
        shortTermGain: 0,
        shortTermLoss: 0,
        longTermGain: 0,
        longTermLoss: 0,
        totalProceeds: 0,
        totalCostBasis: 0,
        disposalCount: 0,
        disposals: [],
      })
    }

    const breakdown = assetMap.get(event.asset)!
    breakdown.totalProceeds += event.proceeds
    breakdown.totalCostBasis += event.costBasis
    breakdown.disposalCount++
    breakdown.disposals.push(event)

    if (event.gainLoss >= 0) {
      breakdown.totalRealizedGain += event.gainLoss
      if (event.shortTerm) {
        breakdown.shortTermGain += event.gainLoss
      } else {
        breakdown.longTermGain += event.gainLoss
      }
    } else {
      breakdown.totalRealizedLoss += Math.abs(event.gainLoss)
      if (event.shortTerm) {
        breakdown.shortTermLoss += Math.abs(event.gainLoss)
      } else {
        breakdown.longTermLoss += Math.abs(event.gainLoss)
      }
    }

    breakdown.netRealizedGainLoss = breakdown.totalRealizedGain - breakdown.totalRealizedLoss
  }

  return Array.from(assetMap.values())
}

/**
 * Calculate current holdings from remaining lots
 */
function calculateCurrentHoldings(lotsByAsset: Map<string, CostBasisLot[]>): AssetHolding[] {
  const holdings: AssetHolding[] = []

  lotsByAsset.forEach((lots, asset) => {
    if (lots.length === 0 || lots.reduce((sum: number, lot: CostBasisLot) => sum + lot.amount, 0) <= 0) {
      return
    }

    const totalAmount = lots.reduce((sum: number, lot: CostBasisLot) => sum + lot.amount, 0)
    const totalCostBasis = lots.reduce((sum: number, lot: CostBasisLot) => sum + lot.totalCost, 0)
    const averageCost = totalAmount > 0 ? totalCostBasis / totalAmount : 0

    const sortedLots = [...lots].sort((a, b) =>
      a.acquisitionDate.getTime() - b.acquisitionDate.getTime()
    )

    holdings.push({
      asset,
      totalAmount,
      averageCost,
      totalCostBasis,
      lots: cloneLots(lots),
      earliestAcquisition: sortedLots[0]?.acquisitionDate,
      latestAcquisition: sortedLots[sortedLots.length - 1]?.acquisitionDate,
    })
  })

  return holdings.sort((a, b) => b.totalCostBasis - a.totalCostBasis)
}

/**
 * Calculate overall summary from asset breakdown
 */
function calculateSummary(assetBreakdown: AssetGainsLosses[]): GainsLossesResult['summary'] {
  return assetBreakdown.reduce(
    (summary, asset) => ({
      totalRealizedGain: summary.totalRealizedGain + asset.totalRealizedGain,
      totalRealizedLoss: summary.totalRealizedLoss + asset.totalRealizedLoss,
      netRealizedGainLoss: summary.netRealizedGainLoss + asset.netRealizedGainLoss,
      shortTermGainLoss: summary.shortTermGainLoss + (asset.shortTermGain - asset.shortTermLoss),
      longTermGainLoss: summary.longTermGainLoss + (asset.longTermGain - asset.longTermLoss),
      totalProceeds: summary.totalProceeds + asset.totalProceeds,
      totalCostBasis: summary.totalCostBasis + asset.totalCostBasis,
    }),
    {
      totalRealizedGain: 0,
      totalRealizedLoss: 0,
      netRealizedGainLoss: 0,
      shortTermGainLoss: 0,
      longTermGainLoss: 0,
      totalProceeds: 0,
      totalCostBasis: 0,
    }
  )
}

/**
 * Calculate holdings value at a specific date
 *
 * @param transactions - Array of transactions to analyze
 * @param targetDate - The date to calculate holdings for
 * @param prices - Optional map of asset to price at target date
 * @returns Portfolio snapshot at the target date
 */
export function calculateHoldingsAtDate(
  transactions: TransactionInput[],
  targetDate: Date,
  prices?: Map<string, number>
): PortfolioSnapshot {
  // Filter transactions up to target date
  const relevantTransactions = transactions.filter(
    tx => new Date(tx.timestamp) <= targetDate
  )

  // Calculate gains to get current holdings (this rebuilds lot tracking)
  const result = calculateGainsLosses(relevantTransactions, 'FIFO')

  // Add current values if prices provided
  let totalValue = 0
  const holdingsWithValue = result.currentHoldings.map(holding => {
    const price = prices?.get(holding.asset)
    const currentValue = price ? holding.totalAmount * price : undefined
    const unrealizedGainLoss = currentValue !== undefined
      ? currentValue - holding.totalCostBasis
      : undefined

    if (currentValue !== undefined) {
      totalValue += currentValue
    }

    return {
      ...holding,
      currentValue,
      unrealizedGainLoss,
    }
  })

  return {
    date: targetDate,
    holdings: holdingsWithValue,
    totalCostBasis: result.currentHoldings.reduce((sum, h) => sum + h.totalCostBasis, 0),
    totalValue: prices ? totalValue : undefined,
  }
}

/**
 * Get acquisition history for an asset
 *
 * @param transactions - Array of transactions to analyze
 * @param asset - The asset to get history for
 * @returns Array of acquisition lots for the asset
 */
export function getAssetAcquisitionHistory(
  transactions: TransactionInput[],
  asset: string
): CostBasisLot[] {
  const result = calculateGainsLosses(transactions, 'FIFO')
  const holding = result.currentHoldings.find(h => h.asset.toUpperCase() === asset.toUpperCase())
  return holding?.lots || []
}

// ============================================
// CSV Export Functions
// ============================================

export interface CSVExportOptions {
  includeHeaders: boolean
  dateFormat?: 'ISO' | 'US' | 'EU'
  currencySymbol?: string
}

/**
 * Format date for CSV export
 */
function formatDate(date: Date, format: CSVExportOptions['dateFormat'] = 'ISO'): string {
  if (format === 'US') {
    return date.toLocaleDateString('en-US')
  }
  if (format === 'EU') {
    return date.toLocaleDateString('en-GB')
  }
  return date.toISOString().split('T')[0]
}

/**
 * Format number for CSV export
 */
function formatNumber(value: number, decimals: number = 8): string {
  return value.toFixed(decimals)
}

/**
 * Escape CSV value
 */
function escapeCSV(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Export disposal events to CSV format for tax purposes
 *
 * @param result - Gains/losses calculation result
 * @param options - Export options
 * @returns CSV string
 */
export function exportDisposalsToCSV(
  result: GainsLossesResult,
  options: CSVExportOptions = { includeHeaders: true }
): string {
  const rows: string[] = []
  const { dateFormat = 'ISO', currencySymbol = '$' } = options

  if (options.includeHeaders) {
    rows.push([
      'Asset',
      'Disposal Date',
      'Amount',
      'Proceeds',
      'Cost Basis',
      'Gain/Loss',
      'Term',
      'Holding Period (Days)',
      'Exchange',
      'Transaction ID',
    ].join(','))
  }

  for (const event of result.disposalEvents) {
    rows.push([
      escapeCSV(event.asset),
      escapeCSV(formatDate(event.disposalDate, dateFormat)),
      escapeCSV(formatNumber(event.amount)),
      escapeCSV(`${currencySymbol}${formatNumber(event.proceeds, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(event.costBasis, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(event.gainLoss, 2)}`),
      escapeCSV(event.shortTerm ? 'Short-term' : 'Long-term'),
      escapeCSV(event.holdingPeriod.toString()),
      escapeCSV(event.exchange || ''),
      escapeCSV(event.transactionId),
    ].join(','))
  }

  return rows.join('\n')
}

/**
 * Export summary by asset to CSV format
 *
 * @param result - Gains/losses calculation result
 * @param options - Export options
 * @returns CSV string
 */
export function exportAssetSummaryToCSV(
  result: GainsLossesResult,
  options: CSVExportOptions = { includeHeaders: true }
): string {
  const rows: string[] = []
  const { currencySymbol = '$' } = options

  if (options.includeHeaders) {
    rows.push([
      'Asset',
      'Total Proceeds',
      'Total Cost Basis',
      'Net Gain/Loss',
      'Short-Term Gain',
      'Short-Term Loss',
      'Long-Term Gain',
      'Long-Term Loss',
      'Disposal Count',
    ].join(','))
  }

  for (const asset of result.assetBreakdown) {
    rows.push([
      escapeCSV(asset.asset),
      escapeCSV(`${currencySymbol}${formatNumber(asset.totalProceeds, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(asset.totalCostBasis, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(asset.netRealizedGainLoss, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(asset.shortTermGain, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(asset.shortTermLoss, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(asset.longTermGain, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(asset.longTermLoss, 2)}`),
      escapeCSV(asset.disposalCount.toString()),
    ].join(','))
  }

  // Add summary row
  rows.push([
    escapeCSV('TOTAL'),
    escapeCSV(`${currencySymbol}${formatNumber(result.summary.totalProceeds, 2)}`),
    escapeCSV(`${currencySymbol}${formatNumber(result.summary.totalCostBasis, 2)}`),
    escapeCSV(`${currencySymbol}${formatNumber(result.summary.netRealizedGainLoss, 2)}`),
    escapeCSV(`${currencySymbol}${formatNumber(result.summary.shortTermGainLoss, 2)}`),
    escapeCSV(''),
    escapeCSV(`${currencySymbol}${formatNumber(result.summary.longTermGainLoss, 2)}`),
    escapeCSV(''),
    escapeCSV(result.disposalEvents.length.toString()),
  ].join(','))

  return rows.join('\n')
}

/**
 * Export current holdings to CSV format
 *
 * @param result - Gains/losses calculation result
 * @param options - Export options
 * @returns CSV string
 */
export function exportHoldingsToCSV(
  result: GainsLossesResult,
  options: CSVExportOptions = { includeHeaders: true }
): string {
  const rows: string[] = []
  const { dateFormat = 'ISO', currencySymbol = '$' } = options

  if (options.includeHeaders) {
    rows.push([
      'Asset',
      'Amount',
      'Average Cost',
      'Total Cost Basis',
      'Earliest Acquisition',
      'Latest Acquisition',
      'Number of Lots',
    ].join(','))
  }

  for (const holding of result.currentHoldings) {
    rows.push([
      escapeCSV(holding.asset),
      escapeCSV(formatNumber(holding.totalAmount)),
      escapeCSV(`${currencySymbol}${formatNumber(holding.averageCost, 2)}`),
      escapeCSV(`${currencySymbol}${formatNumber(holding.totalCostBasis, 2)}`),
      escapeCSV(holding.earliestAcquisition ? formatDate(holding.earliestAcquisition, dateFormat) : ''),
      escapeCSV(holding.latestAcquisition ? formatDate(holding.latestAcquisition, dateFormat) : ''),
      escapeCSV(holding.lots.length.toString()),
    ].join(','))
  }

  return rows.join('\n')
}

/**
 * Export complete tax report to CSV format
 * Returns an object with separate CSVs for different sections
 *
 * @param result - Gains/losses calculation result
 * @param options - Export options
 * @returns Object with separate CSV strings
 */
export function exportTaxReport(
  result: GainsLossesResult,
  options: CSVExportOptions = { includeHeaders: true }
): {
  disposals: string
  assetSummary: string
  holdings: string
  summary: string
} {
  const { currencySymbol = '$' } = options

  // Create summary CSV
  const summaryRows: string[] = []
  summaryRows.push('Tax Report Summary')
  summaryRows.push(`Period,${formatDate(result.period.start)} - ${formatDate(result.period.end)}`)
  summaryRows.push(`Cost Basis Method,${COST_BASIS_METHODS[result.method].label}`)
  summaryRows.push('')
  summaryRows.push('Metric,Value')
  summaryRows.push(`Total Proceeds,${currencySymbol}${formatNumber(result.summary.totalProceeds, 2)}`)
  summaryRows.push(`Total Cost Basis,${currencySymbol}${formatNumber(result.summary.totalCostBasis, 2)}`)
  summaryRows.push(`Net Realized Gain/Loss,${currencySymbol}${formatNumber(result.summary.netRealizedGainLoss, 2)}`)
  summaryRows.push(`Short-Term Gain/Loss,${currencySymbol}${formatNumber(result.summary.shortTermGainLoss, 2)}`)
  summaryRows.push(`Long-Term Gain/Loss,${currencySymbol}${formatNumber(result.summary.longTermGainLoss, 2)}`)
  summaryRows.push(`Total Disposals,${result.disposalEvents.length}`)
  summaryRows.push(`Assets Traded,${result.assetBreakdown.length}`)

  return {
    disposals: exportDisposalsToCSV(result, options),
    assetSummary: exportAssetSummaryToCSV(result, options),
    holdings: exportHoldingsToCSV(result, options),
    summary: summaryRows.join('\n'),
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format gain/loss for display with color class
 */
export function formatGainLoss(value: number): { formatted: string; colorClass: string } {
  const formatted = value >= 0
    ? `+$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `-$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const colorClass = value >= 0 ? 'text-green-600' : 'text-red-600'

  return { formatted, colorClass }
}

/**
 * Get summary statistics for quick display
 */
export function getQuickStats(result: GainsLossesResult): {
  netGainLoss: { value: number; formatted: string; isGain: boolean }
  shortTermGainLoss: { value: number; formatted: string; isGain: boolean }
  longTermGainLoss: { value: number; formatted: string; isGain: boolean }
  totalProceeds: number
  totalCostBasis: number
  disposalCount: number
  assetsTraded: number
} {
  const formatValue = (value: number) => ({
    value,
    formatted: formatGainLoss(value).formatted,
    isGain: value >= 0,
  })

  return {
    netGainLoss: formatValue(result.summary.netRealizedGainLoss),
    shortTermGainLoss: formatValue(result.summary.shortTermGainLoss),
    longTermGainLoss: formatValue(result.summary.longTermGainLoss),
    totalProceeds: result.summary.totalProceeds,
    totalCostBasis: result.summary.totalCostBasis,
    disposalCount: result.disposalEvents.length,
    assetsTraded: result.assetBreakdown.length,
  }
}
