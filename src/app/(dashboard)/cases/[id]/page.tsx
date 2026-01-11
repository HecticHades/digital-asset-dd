import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, RiskBadge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CaseTabs } from './case-tabs'
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
import type { FindingSeverity, FindingCategory } from '@/lib/validators/finding'
import type { ChecklistCompletionStatus } from '@/lib/validators/checklist'

// TODO: Get actual org from session
const TEMP_ORG_ID = 'temp-org-id'

interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

async function getCase(id: string) {
  try {
    return await prisma.case.findFirst({
      where: {
        id,
        organizationId: TEMP_ORG_ID,
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
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params
  const caseData = await getCase(id)

  if (!caseData) {
    notFound()
  }

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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/cases"
          className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Cases
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{caseData.title}</h1>
            <p className="text-slate-600 mt-1">
              Client:{' '}
              <Link href={`/clients/${caseData.client.id}`} className="text-primary-600 hover:text-primary-700">
                {caseData.client.name}
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={caseData.status} />
            <RiskBadge level={caseData.riskLevel} />
            <Link href={`/cases/${caseData.id}/edit`}>
              <Button variant="outline" size="sm">
                Edit Case
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${getRiskScoreColor(riskBreakdown.overallScore)}`}>
                {riskBreakdown.overallScore}
              </span>
              <span className="text-sm text-slate-500">/ 100</span>
            </div>
            <div className={`text-xs mt-1 ${getRiskScoreColor(riskBreakdown.overallScore)}`}>
              {riskBreakdown.riskLevel}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caseData.findings.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {caseData.checklistItems.filter((c) => c.isCompleted).length}/
              {caseData.checklistItems.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Due Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {caseData.dueDate ? format(caseData.dueDate, 'MMM d, yyyy') : 'Not set'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignment & Details Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Assigned Analyst</CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.assignedTo ? (
              <div>
                <div className="font-medium">{caseData.assignedTo.name}</div>
                <div className="text-sm text-slate-500">{caseData.assignedTo.email}</div>
              </div>
            ) : (
              <div className="text-slate-500">Unassigned</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Reviewer</CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.reviewedBy ? (
              <div>
                <div className="font-medium">{caseData.reviewedBy.name}</div>
                <div className="text-sm text-slate-500">{caseData.reviewedBy.email}</div>
              </div>
            ) : (
              <div className="text-slate-500">Not reviewed yet</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">{format(caseData.createdAt, 'MMM d, yyyy')}</div>
            <div className="text-sm text-slate-500">{format(caseData.createdAt, 'h:mm a')}</div>
          </CardContent>
        </Card>
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
