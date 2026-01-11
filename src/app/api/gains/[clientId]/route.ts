/**
 * API Route: Calculate Gains/Losses for a Client
 *
 * GET /api/gains/[clientId]?method=FIFO&startDate=2024-01-01&endDate=2024-12-31
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import {
  calculateGainsLosses,
  exportTaxReport,
  type CostBasisMethod,
  type TransactionInput,
} from '@/lib/analyzers/gains'

export const dynamic = 'force-dynamic'

// Temporary org ID for development
const TEMP_ORG_ID = 'temp-org-id'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const method = (searchParams.get('method') || 'FIFO') as CostBasisMethod
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const format = searchParams.get('format') // 'json' or 'csv'

    // Validate method
    if (!['FIFO', 'LIFO', 'AVERAGE_COST'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid cost basis method. Use FIFO, LIFO, or AVERAGE_COST' },
        { status: 400 }
      )
    }

    // Parse dates
    const startDate = startDateParam ? new Date(startDateParam) : undefined
    const endDate = endDateParam ? new Date(endDateParam) : undefined

    // Verify client exists and belongs to organization
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: TEMP_ORG_ID,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Fetch all transactions for the client
    const transactions = await prisma.transaction.findMany({
      where: {
        clientId,
        organizationId: TEMP_ORG_ID,
      },
      orderBy: {
        timestamp: 'asc',
      },
    })

    // Convert to TransactionInput format
    const transactionInputs: TransactionInput[] = transactions.map(tx => ({
      id: tx.id,
      timestamp: tx.timestamp,
      type: tx.type,
      asset: tx.asset,
      amount: tx.amount.toString(),
      price: tx.price?.toString() || null,
      fee: tx.fee?.toString() || null,
      exchange: tx.exchange,
    }))

    // Calculate gains/losses
    const result = calculateGainsLosses(transactionInputs, method, startDate, endDate)

    // Return CSV if requested
    if (format === 'csv') {
      const csvExport = exportTaxReport(result)

      return new NextResponse(csvExport.disposals, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="gains-losses-${clientId}-${method}.csv"`,
        },
      })
    }

    // Return JSON response
    return NextResponse.json({
      success: true,
      clientId,
      method,
      result: {
        ...result,
        // Convert dates to ISO strings for JSON serialization
        period: {
          start: result.period.start.toISOString(),
          end: result.period.end.toISOString(),
        },
        disposalEvents: result.disposalEvents.map(event => ({
          ...event,
          disposalDate: event.disposalDate.toISOString(),
        })),
        currentHoldings: result.currentHoldings.map(holding => ({
          ...holding,
          earliestAcquisition: holding.earliestAcquisition?.toISOString(),
          latestAcquisition: holding.latestAcquisition?.toISOString(),
          lots: holding.lots.map(lot => ({
            ...lot,
            acquisitionDate: lot.acquisitionDate.toISOString(),
          })),
        })),
      },
    })
  } catch (error) {
    console.error('Error calculating gains/losses:', error)
    return NextResponse.json(
      { error: 'Failed to calculate gains/losses' },
      { status: 500 }
    )
  }
}
