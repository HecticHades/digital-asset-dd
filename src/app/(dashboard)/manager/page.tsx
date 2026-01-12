import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { getAnalystsWorkload, getTeamProgress, getCasesForAssignment, getOverdueCases, getAvailableAnalysts } from './actions'
import { ManagerDashboard } from './manager-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Manager Dashboard | DADD',
  description: 'Team workload and case management',
}

export default async function ManagerPage() {
  // Check permission
  const user = await getCurrentUser()
  const role = user?.role || 'MANAGER' // Fallback for dev

  if (!hasPermission(role, 'workload:view')) {
    redirect('/dashboard?error=access_denied')
  }

  // Fetch all data in parallel
  const [
    workloadResult,
    progressResult,
    casesResult,
    overdueResult,
    analystsResult,
  ] = await Promise.all([
    getAnalystsWorkload(),
    getTeamProgress(),
    getCasesForAssignment(),
    getOverdueCases(),
    getAvailableAnalysts(),
  ])

  // Serialize data for client components
  const workload = workloadResult.data
  const progress = progressResult.data
  const cases = casesResult.data.map(c => ({
    ...c,
    dueDate: c.dueDate?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
  }))
  const overdueCases = overdueResult.data.map(c => ({
    ...c,
    dueDate: c.dueDate?.toISOString() || null,
    createdAt: c.createdAt.toISOString(),
  }))
  const analysts = analystsResult.data

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Manager Dashboard</h1>
        <p className="text-slate-600 mt-1">Team workload and case progress</p>
      </div>

      {/* Team Progress Summary */}
      {progress && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            title="Total Cases"
            value={progress.totalCases}
            variant="default"
          />
          <StatCard
            title="Active Cases"
            value={progress.activeCases}
            variant="info"
          />
          <StatCard
            title="Pending Review"
            value={progress.pendingReview}
            variant="warning"
          />
          <StatCard
            title="Overdue"
            value={progress.overdueCases}
            variant={progress.overdueCases > 0 ? 'error' : 'default'}
          />
          <StatCard
            title="Due Soon"
            value={progress.dueSoon}
            variant={progress.dueSoon > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Completed (7d)"
            value={progress.completedThisWeek}
            variant="success"
          />
        </div>
      )}

      {/* Main Dashboard Content */}
      <ManagerDashboard
        workload={workload}
        progress={progress}
        cases={cases}
        overdueCases={overdueCases}
        analysts={analysts}
      />
    </div>
  )
}

function StatCard({
  title,
  value,
  variant = 'default',
}: {
  title: string
  value: number
  variant?: 'default' | 'info' | 'warning' | 'error' | 'success'
}) {
  const variantStyles = {
    default: '',
    info: 'border-blue-200 bg-blue-50',
    warning: 'border-yellow-200 bg-yellow-50',
    error: 'border-red-200 bg-red-50',
    success: 'border-green-200 bg-green-50',
  }

  const valueStyles = {
    default: 'text-slate-900',
    info: 'text-blue-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
    success: 'text-green-700',
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className={`text-2xl font-bold ${valueStyles[variant]}`}>{value}</p>
      </CardContent>
    </Card>
  )
}
