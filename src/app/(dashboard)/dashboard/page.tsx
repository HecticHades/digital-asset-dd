import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { CaseStatus, FindingSeverity } from '@prisma/client'
import { DashboardOverview } from '@/components/dashboard'

export const dynamic = 'force-dynamic'

interface DashboardStats {
  totalClients: number
  activeCases: number
  pendingReviews: number
  highRiskFlags: number
}

interface RecentActivity {
  id: string
  type: 'case_created' | 'case_status_changed' | 'client_created' | 'finding_added'
  title: string
  description: string
  timestamp: Date
  link?: string
}

interface CasesByStatus {
  status: CaseStatus
  count: number
}

async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  try {
    const [totalClients, activeCases, pendingReviews, highRiskFlags] = await Promise.all([
      prisma.client.count({
        where: { organizationId },
      }),
      prisma.case.count({
        where: {
          organizationId,
          status: { in: ['DRAFT', 'IN_PROGRESS'] },
        },
      }),
      prisma.case.count({
        where: {
          organizationId,
          status: 'PENDING_REVIEW',
        },
      }),
      prisma.finding.count({
        where: {
          organizationId,
          severity: { in: ['HIGH', 'CRITICAL'] },
          isResolved: false,
        },
      }),
    ])

    return { totalClients, activeCases, pendingReviews, highRiskFlags }
  } catch {
    return { totalClients: 0, activeCases: 0, pendingReviews: 0, highRiskFlags: 0 }
  }
}

async function getRecentActivity(organizationId: string): Promise<RecentActivity[]> {
  try {
    const [recentCases, recentClients, recentFindings] = await Promise.all([
      prisma.case.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { client: { select: { name: true } } },
      }),
      prisma.client.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.finding.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { case: { select: { id: true, title: true } } },
      }),
    ])

    const activities: RecentActivity[] = [
      ...recentCases.map((c) => ({
        id: `case-${c.id}`,
        type: 'case_created' as const,
        title: 'Case created',
        description: `${c.title} for ${c.client.name}`,
        timestamp: c.createdAt,
        link: `/cases/${c.id}`,
      })),
      ...recentClients.map((c) => ({
        id: `client-${c.id}`,
        type: 'client_created' as const,
        title: 'Client added',
        description: c.name,
        timestamp: c.createdAt,
        link: `/clients/${c.id}`,
      })),
      ...recentFindings.map((f) => ({
        id: `finding-${f.id}`,
        type: 'finding_added' as const,
        title: 'Finding added',
        description: `${f.title} on ${f.case.title}`,
        timestamp: f.createdAt,
        link: `/cases/${f.case.id}`,
      })),
    ]

    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10)
  } catch {
    return []
  }
}

async function getCasesByStatus(organizationId: string): Promise<CasesByStatus[]> {
  try {
    const cases = await prisma.case.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { status: true },
    })

    return cases.map((c) => ({
      status: c.status,
      count: c._count.status,
    }))
  } catch {
    return []
  }
}

const statusLabels: Record<CaseStatus, string> = {
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  PENDING_REVIEW: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const organizationId = user.organizationId

  const resolvedParams = await searchParams
  const [stats, recentActivity, casesByStatus] = await Promise.all([
    getDashboardStats(organizationId),
    getRecentActivity(organizationId),
    getCasesByStatus(organizationId),
  ])

  // Transform data for the new DashboardOverview component
  const formattedCasesByStatus = casesByStatus.map((c) => ({
    status: c.status,
    count: c.count,
    label: statusLabels[c.status] || c.status,
  }))

  // Generate alerts from high-risk findings
  type AlertSeverity = 'critical' | 'high' | 'medium'
  const alerts: Array<{
    id: string
    title: string
    description: string
    severity: AlertSeverity
    timestamp: Date
    link?: string
  }> = []

  if (stats.highRiskFlags > 0) {
    alerts.push({
      id: 'high-risk-alert',
      title: `${stats.highRiskFlags} High-Risk Finding${stats.highRiskFlags > 1 ? 's' : ''} Detected`,
      description: 'Unresolved high or critical severity findings require attention',
      severity: 'critical',
      timestamp: new Date(),
      link: '/cases',
    })
  }

  if (stats.pendingReviews > 0) {
    alerts.push({
      id: 'pending-reviews-alert',
      title: `${stats.pendingReviews} Case${stats.pendingReviews > 1 ? 's' : ''} Pending Review`,
      description: 'Cases are awaiting compliance review and approval',
      severity: 'high',
      timestamp: new Date(),
      link: '/cases?status=PENDING_REVIEW',
    })
  }

  return (
    <div>
      {/* Access Denied Alert */}
      {resolvedParams.error === 'access_denied' && (
        <div className="mb-6 p-4 bg-risk-500/10 border border-risk-500/30 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-risk-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-risk-400">Access Denied</h3>
            <p className="text-sm text-void-400">You do not have permission to access that page. Contact your administrator if you believe this is an error.</p>
          </div>
        </div>
      )}

      <DashboardOverview
        stats={stats}
        recentActivity={recentActivity}
        casesByStatus={formattedCasesByStatus}
        alerts={alerts}
        userName={user.name || undefined}
      />
    </div>
  )
}
