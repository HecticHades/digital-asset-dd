import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'
import { CaseFilters } from './case-filters'

export const dynamic = 'force-dynamic'

interface CasesPageProps {
  searchParams: Promise<{
    status?: string
    riskLevel?: string
    assignedToId?: string
  }>
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

async function getCases(organizationId: string, filters: {
  status?: string
  riskLevel?: string
  assignedToId?: string
}) {
  try {
    const where: Record<string, unknown> = {
      organizationId,
    }

    if (filters.status) {
      where.status = filters.status
    }
    if (filters.riskLevel) {
      where.riskLevel = filters.riskLevel
    }
    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId
    }

    return await prisma.case.findMany({
      where,
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
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  } catch {
    return []
  }
}

async function getAnalysts(organizationId: string) {
  try {
    return await prisma.user.findMany({
      where: {
        organizationId,
        role: {
          in: ['ANALYST', 'MANAGER'],
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  } catch {
    return []
  }
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const organizationId = user.organizationId

  const params = await searchParams
  const [cases, analysts] = await Promise.all([
    getCases(organizationId, params),
    getAnalysts(organizationId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-void-100">Cases</h1>
          <p className="text-void-400 mt-2">Manage due diligence cases</p>
        </div>
        <Link
          href="/cases/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-500/10 border border-neon-500/30 text-neon-400 hover:bg-neon-500/20 hover:border-neon-400/50 transition-all text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Case
        </Link>
      </div>

      {/* Filters */}
      <CaseFilters analysts={analysts} currentFilters={params} />

      {cases.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-void-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-void-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-display font-semibold text-void-100 mb-2">No cases found</h3>
          <p className="text-void-400 text-sm mb-4">
            {Object.keys(params).length > 0
              ? 'Try adjusting your filters or create a new case.'
              : 'Get started by creating your first case.'}
          </p>
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-500/10 border border-neon-500/30 text-neon-400 hover:bg-neon-500/20 transition-colors text-sm font-medium"
          >
            New Case
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="table-dark">
            <thead>
              <tr>
                <th>Title</th>
                <th>Client</th>
                <th>Status</th>
                <th>Risk Level</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseItem) => {
                const statusStyle = STATUS_STYLES[caseItem.status] || STATUS_STYLES.DRAFT
                const riskStyle = RISK_STYLES[caseItem.riskLevel] || RISK_STYLES.MEDIUM

                return (
                  <tr key={caseItem.id} className="group">
                    <td className="font-medium text-void-100">{caseItem.title}</td>
                    <td>
                      <Link
                        href={`/clients/${caseItem.client.id}`}
                        className="text-neon-400 hover:text-neon-300 transition-colors"
                      >
                        {caseItem.client.name}
                      </Link>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-mono ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                        {caseItem.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-mono ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
                        {caseItem.riskLevel}
                      </span>
                    </td>
                    <td className="text-void-400">{caseItem.assignedTo?.name || '-'}</td>
                    <td className="text-void-400 font-mono text-sm">
                      {caseItem.dueDate ? format(caseItem.dueDate, 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="text-void-400 font-mono text-sm">{format(caseItem.createdAt, 'MMM d, yyyy')}</td>
                    <td className="text-right">
                      <Link
                        href={`/cases/${caseItem.id}`}
                        className="text-neon-400 hover:text-neon-300 text-sm font-medium transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
