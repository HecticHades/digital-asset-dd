/**
 * Report Download API Route
 *
 * GET /api/reports/[caseId]/download/[reportId] - Download a specific report PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ caseId: string; reportId: string }>
}

/**
 * GET /api/reports/[caseId]/download/[reportId]
 * Download a specific report PDF
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth()
    const { caseId, reportId } = await params

    // Verify report exists and belongs to the case/org
    const report = await prisma.report.findFirst({
      where: {
        id: reportId,
        caseId,
        organizationId: user.organizationId,
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Build full file path
    const filePath = path.join(process.cwd(), report.path)

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Report file not found on disk' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await readFile(filePath)

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${report.filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache',
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error downloading report:', error)
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    )
  }
}
