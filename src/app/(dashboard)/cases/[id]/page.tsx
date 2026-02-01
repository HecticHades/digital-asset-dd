import { cache } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'
import { CaseTabs } from './case-tabs'
import { CaseArchiveButton } from './case-archive-button'
import { calculateRiskBreakdown, getRiskScoreColor } from '@/lib/analyzers/risk'
import { createFinding, resolveFinding, reopenFinding } from './findings/actions'
import {
  initializeChecklist,
  completeChecklistItem,
  uncompleteChecklistItem,
  createChecklistItem,
  deleteChecklistItem,
} from './checklist/actions'
import { updateCase, processCaseApproval, reopenRejectedCase, markCaseCompleted } from '../actions'
import { canArchiveCase } from '@/lib/retention'
import type { FindingSeverity, FindingCategory } from '@/lib/validators/finding'
import type { ChecklistCompletionStatus } from '@/lib/validators/checklist'
import type { CaseStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: 'bg-void-700', text: 'text-void-300', border: 'border-void-600' },
  IN_PROGRESS: { bg: 'bg-neon-500/10', text: 'text-neon-400', border: 'border-neon-500/30' },
  PENDING_REVIEW: { bg: 'bg-caution-500/10', text: 'text-caution-400', border: 'border-caution-500/30' },
  APPROVED: { bg: 'bg-profit-500/10', text: 'text-profit-400', border: 'border-profit-500/30' },
  REJECTED: { bg: 'bg-risk-500/10', text: 'text-risk-400', border: 'border-risk-500/30' },
  COMPLETED: { bg: 'bg-signal-500/10', text: 'text-signal-400', border: 'border-signal-500/30' },
  ARCHIVED: { bg: 'bg-void-800', text: 'text-void-500', border: 'border-void-700' },
}

const RISK_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-profit-500/10', text: 'text-profit-400', border: 'border-profit-500/30' },
  MEDIUM: { bg: 'bg-caution-500/10', text: 'text-caution-400', border: 'border-caution-500/30' },
  HIGH: { bg: 'bg-risk-500/10', text: 'text-risk-400', border: 'border-risk-500/30' },
  CRITICAL: { bg: 'bg-risk-500/20', text: 'text-risk-300', border: 'border-risk-500/50' },
}

// Cache case fetching for request deduplication
const getCase = cache(async (id: string, organizationId: string) => {
  try {
    return await prisma.case.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        client: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        findings: {
          include: {
            wallet: {
              select: {
                id: true,
                address: true,
                blockchain: true,
                label: true,
              },
            },
            transaction: {
              select: {
                id: true,
                txHash: true,
                type: true,
                asset: true,
              },
            },
            resolvedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [
            { isResolved: 'asc' },
            { severity: 'desc' },
            { createdAt: 'desc' },
          ],
        },
        checklistItems: {
          include: {
            completedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        reports: {
          include: {
            generatedBy: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            version: 'desc',
          },
        },
      },
    })
  } catch {
    return null
  }
})

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const organizationId = user.organizationId

  const { id } = await params
  const caseData = await getCase(id, organizationId)

  if (!caseData) {
    notFound()
  }

  const statusStyle = STATUS_STYLES[caseData.status] || STATUS_STYLES.DRAFT
  const riskStyle = RISK_STYLES[caseData.riskLevel] || RISK_STYLES.MEDIUM

  // Calculate timeline events
  const timelineEvents = [
    {
      date: caseData.createdAt,
      title: 'Case Created',
      description: caseData.createdBy ? `Created by ${caseData.createdBy.name}` : 'Case was created',
      type: 'created',
    },
  ]

  if (caseData.assignedTo) {
    timelineEvents.push({
      date: caseData.updatedAt,
      title: 'Analyst Assigned',
      description: `Assigned to ${caseData.assignedTo.name}`,
      type: 'assigned',
    })
  }

  if (caseData.reviewedAt && caseData.reviewedBy) {
    timelineEvents.push({
      date: caseData.reviewedAt,
      title: caseData.status === 'APPROVED' ? 'Case Approved' : caseData.status === 'REJECTED' ? 'Case Rejected' : 'Case Reviewed',
      description: `Reviewed by ${caseData.reviewedBy.name}`,
      type: caseData.status === 'APPROVED' ? 'approved' : caseData.status === 'REJECTED' ? 'rejected' : 'reviewed',
    })
  }

  // Sort timeline by date
  timelineEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Calculate risk breakdown from findings
  const riskBreakdown = calculateRiskBreakdown(
    caseData.findings.map((f) => ({
      category: f.category,
      severity: f.severity,
      isResolved: f.isResolved,
    }))
  )

  // Calculate checklist completion status
  const checklistItems = caseData.checklistItems
  const requiredItems = checklistItems.filter((i) => i.isRequired)
  const checklistCompletionStatus: ChecklistCompletionStatus = {
    total: checklistItems.length,
    completed: checklistItems.filter((i) => i.isCompleted).length,
    required: requiredItems.length,
    requiredCompleted: requiredItems.filter((i) => i.isCompleted).length,
    percentage: checklistItems.length > 0 ? Math.round((checklistItems.filter((i) => i.isCompleted).length / checklistItems.length) * 100) : 0,
    requiredPercentage: requiredItems.length > 0 ? Math.round((requiredItems.filter((i) => i.isCompleted).length / requiredItems.length) * 100) : 100,
    isComplete: requiredItems.every((i) => i.isCompleted),
    missingRequired: requiredItems.filter((i) => !i.isCompleted).map((i) => i.title),
  }

  // Serialize for client components
  const serializedCase = {
    ...caseData,
    createdAt: caseData.createdAt.toISOString(),
    updatedAt: caseData.updatedAt.toISOString(),
    dueDate: caseData.dueDate?.toISOString() || null,
    reviewedAt: caseData.reviewedAt?.toISOString() || null,
    client: {
      ...caseData.client,
      createdAt: caseData.client.createdAt.toISOString(),
      updatedAt: caseData.client.updatedAt.toISOString(),
    },
    findings: caseData.findings.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      resolvedAt: f.resolvedAt?.toISOString() || null,
    })),
    checklistItems: caseData.checklistItems.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      completedAt: c.completedAt?.toISOString() || null,
      completedBy: c.completedBy,
    })),
    reports: caseData.reports.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      generatedBy: r.generatedBy,
    })),
  }

  const serializedTimeline = timelineEvents.map((e) => ({
    ...e,
    date: e.date.toISOString(),
  }))

  // Get risk score color for dark theme
  const getRiskColorClass = (score: number) => {
    if (score < 30) return 'text-profit-400'
    if (score < 60) return 'text-caution-400'
    return 'text-risk-400'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/cases"
          className="text-sm text-void-500 hover:text-neon-400 flex items-center gap-1 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Cases
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-void-100">{caseData.title}</h1>
            <p className="text-void-400 mt-1">
              Client:{' '}
              <Link href={`/clients/${caseData.client.id}`} className="text-neon-400 hover:text-neon-300 transition-colors">
                {caseData.client.name}
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded text-xs font-mono ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {caseData.status.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-mono ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
              {caseData.riskLevel} Risk
            </span>
            {canArchiveCase(caseData.status as CaseStatus) && (
              <CaseArchiveButton caseId={caseData.id} caseTitle={caseData.title} />
            )}
            <Link
              href={`/cases/${caseData.id}/edit`}
              className="px-4 py-2 rounded-lg bg-void-800/50 border border-void-700/50 text-void-200 hover:bg-void-700/50 hover:border-void-600 transition-all text-sm font-medium"
            >
              Edit Case
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm text-void-500 mb-1">Risk Score</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-display font-bold ${getRiskColorClass(riskBreakdown.overallScore)}`}>
              {riskBreakdown.overallScore}
            </span>
            <span className="text-sm text-void-500">/ 100</span>
          </div>
          <div className={`text-xs mt-1 ${getRiskColorClass(riskBreakdown.overallScore)}`}>
            {riskBreakdown.riskLevel}
          </div>
        </div>

        <div className="stat-card border-caution-500/30 hover:border-caution-400/50">
          <p className="text-sm text-void-500 mb-1">Findings</p>
          <div className="text-2xl font-display font-bold text-caution-400">{caseData.findings.length}</div>
        </div>

        <div className="stat-card border-signal-500/30 hover:border-signal-400/50">
          <p className="text-sm text-void-500 mb-1">Checklist</p>
          <div className="text-2xl font-display font-bold text-signal-400">
            {caseData.checklistItems.filter((c) => c.isCompleted).length}/
            {caseData.checklistItems.length}
          </div>
        </div>

        <div className="stat-card">
          <p className="text-sm text-void-500 mb-1">Due Date</p>
          <div className="text-lg font-display font-medium text-void-200">
            {caseData.dueDate ? format(caseData.dueDate, 'MMM d, yyyy') : 'Not set'}
          </div>
        </div>
      </div>

      {/* Assignment & Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-void-500 mb-2">Assigned Analyst</p>
          {caseData.assignedTo ? (
            <div>
              <div className="font-medium text-void-100">{caseData.assignedTo.name}</div>
              <div className="text-sm text-void-400">{caseData.assignedTo.email}</div>
            </div>
          ) : (
            <div className="text-void-500">Unassigned</div>
          )}
        </div>

        <div className="glass-card p-4">
          <p className="text-sm text-void-500 mb-2">Reviewer</p>
          {caseData.reviewedBy ? (
            <div>
              <div className="font-medium text-void-100">{caseData.reviewedBy.name}</div>
              <div className="text-sm text-void-400">{caseData.reviewedBy.email}</div>
            </div>
          ) : (
            <div className="text-void-500">Not reviewed yet</div>
          )}
        </div>

        <div className="glass-card p-4">
          <p className="text-sm text-void-500 mb-2">Created</p>
          <div className="font-medium text-void-100">{format(caseData.createdAt, 'MMM d, yyyy')}</div>
          <div className="text-sm text-void-400 font-mono">{format(caseData.createdAt, 'h:mm a')}</div>
        </div>
      </div>

      {/* Tabs */}
      <CaseTabs
        caseData={serializedCase}
        timeline={serializedTimeline}
        riskBreakdown={riskBreakdown}
        checklistCompletionStatus={checklistCompletionStatus}
        onCreateFinding={async (data: {
          title: string
          description?: string
          severity: FindingSeverity
          category: FindingCategory
          caseId: string
        }) => {
          'use server'
          return createFinding(data)
        }}
        onResolveFinding={async (findingId: string, resolution: string) => {
          'use server'
          return resolveFinding(findingId, { resolution })
        }}
        onReopenFinding={async (findingId: string) => {
          'use server'
          return reopenFinding(findingId)
        }}
        onInitializeChecklist={async () => {
          'use server'
          return initializeChecklist(id)
        }}
        onCompleteChecklistItem={async (itemId: string, notes?: string) => {
          'use server'
          return completeChecklistItem(itemId, notes ? { notes } : undefined)
        }}
        onUncompleteChecklistItem={async (itemId: string) => {
          'use server'
          return uncompleteChecklistItem(itemId)
        }}
        onAddChecklistItem={async (data: { title: string; description?: string; isRequired: boolean }) => {
          'use server'
          const nextOrder = checklistItems.length
          return createChecklistItem({
            caseId: id,
            title: data.title,
            description: data.description,
            isRequired: data.isRequired,
            order: nextOrder,
          })
        }}
        onDeleteChecklistItem={async (itemId: string) => {
          'use server'
          return deleteChecklistItem(itemId)
        }}
        onSubmitForReview={async () => {
          'use server'
          // Check if all required items are complete
          const required = checklistItems.filter((i) => i.isRequired)
          const allComplete = required.every((i) => i.isCompleted)
          if (!allComplete) {
            return { success: false, error: 'All required checklist items must be completed before submitting for review' }
          }
          return updateCase(id, { status: 'PENDING_REVIEW' })
        }}
        onApproveCase={async (caseId: string, comment: string) => {
          'use server'
          return processCaseApproval({ caseId, decision: 'APPROVE', comment })
        }}
        onRejectCase={async (caseId: string, comment: string) => {
          'use server'
          return processCaseApproval({ caseId, decision: 'REJECT', comment })
        }}
        onReopenRejectedCase={async (caseId: string) => {
          'use server'
          return reopenRejectedCase(caseId)
        }}
        onMarkCaseCompleted={async (caseId: string) => {
          'use server'
          return markCaseCompleted(caseId)
        }}
      />
    </div>
  )
}
