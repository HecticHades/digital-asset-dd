import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge, RiskBadge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { PendingCaseCard } from './pending-case-card'
import { processCaseApproval } from '../actions'

// TODO: Get actual org from session
const TEMP_ORG_ID = 'temp-org-id'

async function getPendingCases() {
  try {
    return await prisma.case.findMany({
      where: {
        organizationId: TEMP_ORG_ID,
        status: 'PENDING_REVIEW',
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        findings: {
          where: {
            isResolved: false,
          },
          select: {
            id: true,
            title: true,
            severity: true,
            category: true,
          },
        },
        checklistItems: {
          select: {
            id: true,
            title: true,
            isCompleted: true,
            isRequired: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'asc' },
      ],
    })
  } catch {
    return []
  }
}

async function getReviewStats() {
  try {
    const [pendingCount, approvedToday, rejectedToday] = await Promise.all([
      prisma.case.count({
        where: {
          organizationId: TEMP_ORG_ID,
          status: 'PENDING_REVIEW',
        },
      }),
      prisma.case.count({
        where: {
          organizationId: TEMP_ORG_ID,
          status: 'APPROVED',
          reviewedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.case.count({
        where: {
          organizationId: TEMP_ORG_ID,
          status: 'REJECTED',
          reviewedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ])

    return { pendingCount, approvedToday, rejectedToday }
  } catch {
    return { pendingCount: 0, approvedToday: 0, rejectedToday: 0 }
  }
}

export default async function CaseReviewPage() {
  const [pendingCases, stats] = await Promise.all([
    getPendingCases(),
    getReviewStats(),
  ])

  // Sort by risk level priority and due date
  const sortedCases = pendingCases.sort((a, b) => {
    const riskOrder: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
      UNASSESSED: 4,
    }
    const riskDiff = (riskOrder[a.riskLevel] ?? 5) - (riskOrder[b.riskLevel] ?? 5)
    if (riskDiff !== 0) return riskDiff

    // Then by due date
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })

  // Serialize for client component
  const serializedCases = sortedCases.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    dueDate: c.dueDate?.toISOString() || null,
    reviewedAt: c.reviewedAt?.toISOString() || null,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Case Review</h1>
          <p className="text-slate-600 mt-1">Review and approve pending cases</p>
        </div>
        <Link
          href="/cases?status=PENDING_REVIEW"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          View in full list
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${stats.pendingCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {stats.pendingCount}
              </span>
              <span className="text-sm text-slate-500">cases</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Approved Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-600">{stats.approvedToday}</span>
              <span className="text-sm text-slate-500">cases</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Rejected Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-600">{stats.rejectedToday}</span>
              <span className="text-sm text-slate-500">cases</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Cases List */}
      {serializedCases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-4 text-lg font-medium text-slate-900">All caught up!</h3>
          <p className="mt-2 text-sm text-slate-500">
            There are no cases pending review at this time.
          </p>
          <div className="mt-6">
            <Link
              href="/cases"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all cases
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {serializedCases.map((caseItem) => (
            <PendingCaseCard
              key={caseItem.id}
              caseData={caseItem}
              onApprove={async (caseId: string, comment: string) => {
                'use server'
                return processCaseApproval({ caseId, decision: 'APPROVE', comment })
              }}
              onReject={async (caseId: string, comment: string) => {
                'use server'
                return processCaseApproval({ caseId, decision: 'REJECT', comment })
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
