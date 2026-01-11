/**
 * Report Generation API Route
 *
 * POST /api/reports/[caseId] - Generate a new PDF report for a case
 * GET /api/reports/[caseId] - Get the latest report for a case
 */

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { prisma } from '@/lib/db'
import { collectReportData } from '@/lib/reports/collector'
import { ReportDocument } from '@/lib/reports/pdf-document'
import { mkdir, writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import React from 'react'

export const dynamic = 'force-dynamic'

// TODO: Get actual org and user from session
const TEMP_ORG_ID = 'temp-org-id'
const TEMP_USER_ID = 'temp-user-id'

interface RouteParams {
  params: Promise<{ caseId: string }>
}

/**
 * POST /api/reports/[caseId]
 * Generate a new PDF report for a case
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params

    // Verify case exists and belongs to org
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId: TEMP_ORG_ID,
      },
      select: {
        id: true,
        title: true,
        status: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Collect all report data
    const reportData = await collectReportData({
      caseId,
      organizationId: TEMP_ORG_ID,
      userId: TEMP_USER_ID,
      includeAppendices: true,
    })

    // Generate PDF buffer
    // Type assertion needed due to @react-pdf/renderer type definitions
    const element = React.createElement(ReportDocument, { data: reportData })
    const pdfBuffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0])

    // Determine version number
    const lastReport = await prisma.report.findFirst({
      where: { caseId },
      orderBy: { version: 'desc' },
    })
    const version = (lastReport?.version ?? 0) + 1

    // Create reports directory if needed
    const reportsDir = path.join(process.cwd(), 'uploads', 'reports', caseId)
    if (!existsSync(reportsDir)) {
      await mkdir(reportsDir, { recursive: true })
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const safeClientName = caseData.client.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    const filename = `report-${safeClientName}-v${version}-${timestamp}.pdf`
    const filePath = path.join(reportsDir, filename)
    const relativePath = `uploads/reports/${caseId}/${filename}`

    // Write PDF to disk
    await writeFile(filePath, pdfBuffer)

    // Lock previous final reports if this case is approved/completed
    if (caseData.status === 'APPROVED' || caseData.status === 'COMPLETED') {
      await prisma.report.updateMany({
        where: {
          caseId,
          isLocked: false,
        },
        data: {
          isLocked: true,
        },
      })
    }

    // Create report record in database
    const report = await prisma.report.create({
      data: {
        version,
        filename,
        path: relativePath,
        size: pdfBuffer.length,
        isLocked: caseData.status === 'COMPLETED' || caseData.status === 'APPROVED',
        organizationId: TEMP_ORG_ID,
        caseId,
        generatedById: TEMP_USER_ID,
      },
    })

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        version: report.version,
        filename: report.filename,
        size: report.size,
        isLocked: report.isLocked,
        createdAt: report.createdAt.toISOString(),
        downloadUrl: `/api/reports/${caseId}/download/${report.id}`,
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports/[caseId]
 * Get all reports for a case
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { caseId } = await params

    // Verify case exists and belongs to org
    const caseData = await prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId: TEMP_ORG_ID,
      },
      select: { id: true },
    })

    if (!caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Get all reports for case
    const reports = await prisma.report.findMany({
      where: {
        caseId,
        organizationId: TEMP_ORG_ID,
      },
      include: {
        generatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { version: 'desc' },
    })

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        version: r.version,
        filename: r.filename,
        size: r.size,
        isLocked: r.isLocked,
        createdAt: r.createdAt.toISOString(),
        generatedBy: r.generatedBy,
        downloadUrl: `/api/reports/${caseId}/download/${r.id}`,
      })),
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
