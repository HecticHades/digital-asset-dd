import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge, RiskBadge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { CaseStatus, FindingSeverity } from '@prisma/client'
import { CasesByStatusChart } from './cases-by-status-chart'

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

function StatCard({
  title,
  value,
  icon,
  href,
  variant = 'default',
}: {
  title: string
  value: number
  icon: React.ReactNode
  href?: string
  variant?: 'default' | 'warning' | 'error'
}) {
  const content = (
    <Card className={variant === 'error' ? 'border-red-200 bg-red-50' : variant === 'warning' ? 'border-yellow-200 bg-yellow-50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <div className={variant === 'error' ? 'text-red-600' : variant === 'warning' ? 'text-yellow-600' : 'text-slate-400'}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${variant === 'error' ? 'text-red-700' : variant === 'warning' ? 'text-yellow-700' : 'text-slate-900'}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

function getActivityIcon(type: RecentActivity['type']) {
  switch (type) {
    case 'case_created':
      return (
        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      )
    case 'client_created':
      return (
        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )
    case 'finding_added':
      return (
        <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      )
    default:
      return (
        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
  }
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

  return (
    <div>
      {/* Access Denied Alert */}
      {resolvedParams.error === 'access_denied' && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
            <p className="text-sm text-red-700">You do not have permission to access that page. Contact your administrator if you believe this is an error.</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your due diligence operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          href="/clients"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Cases"
          value={stats.activeCases}
          href="/cases?status=IN_PROGRESS"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          href="/cases?status=PENDING_REVIEW"
          variant="warning"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="High-Risk Flags"
          value={stats.highRiskFlags}
          variant={stats.highRiskFlags > 0 ? 'error' : 'default'}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cases by Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cases by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {casesByStatus.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No cases yet</p>
                <Link href="/cases/new" className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block">
                  Create your first case
                </Link>
              </div>
            ) : (
              <CasesByStatusChart data={casesByStatus} />
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                      <p className="text-sm text-slate-500 truncate">{activity.description}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(activity.timestamp, 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    {activity.link && (
                      <Link
                        href={activity.link}
                        className="text-primary-600 hover:text-primary-700 text-sm flex-shrink-0"
                      >
                        View
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/clients/new">
              <Button>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add Client
              </Button>
            </Link>
            <Link href="/cases/new">
              <Button variant="secondary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                New Case
              </Button>
            </Link>
            <Link href="/cases?status=PENDING_REVIEW">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Review Cases
              </Button>
            </Link>
            <Link href="/reports">
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                View Reports
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
