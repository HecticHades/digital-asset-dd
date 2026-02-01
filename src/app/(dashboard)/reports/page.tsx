import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

interface ReportsPageProps {
  searchParams: Promise<{
    caseId?: string
  }>
}

async function getReports(organizationId: string, caseId?: string) {
  try {
    return await prisma.report.findMany({
      where: {
        organizationId,
        ...(caseId ? { caseId } : {}),
      },
      include: {
        case: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
        generatedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  } catch {
    return []
  }
}

async function getCasesWithReports(organizationId: string) {
  try {
    return await prisma.case.findMany({
      where: {
        organizationId,
        reports: { some: {} },
      },
      select: {
        id: true,
        title: true,
        _count: { select: { reports: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })
  } catch {
    return []
  }
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const organizationId = user.organizationId

  const resolvedParams = await searchParams
  const [reports, casesWithReports] = await Promise.all([
    getReports(organizationId, resolvedParams.caseId),
    getCasesWithReports(organizationId),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-void-100">Reports</h1>
          <p className="text-void-400 mt-2">
            Generated due diligence reports and documentation
          </p>
        </div>
      </div>

      {/* Filter by Case */}
      {casesWithReports.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-4 overflow-x-auto">
            <span className="text-sm text-void-400 whitespace-nowrap">Filter by case:</span>
            <Link
              href="/reports"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                !resolvedParams.caseId
                  ? 'bg-neon-500/20 text-neon-400 border border-neon-500/30'
                  : 'text-void-300 hover:bg-void-800'
              }`}
            >
              All Reports
            </Link>
            {casesWithReports.map((c) => (
              <Link
                key={c.id}
                href={`/reports?caseId=${c.id}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  resolvedParams.caseId === c.id
                    ? 'bg-neon-500/20 text-neon-400 border border-neon-500/30'
                    : 'text-void-300 hover:bg-void-800'
                }`}
              >
                {c.title} ({c._count.reports})
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-void-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-void-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-display font-semibold text-void-100 mb-2">No reports yet</h3>
          <p className="text-void-400 text-sm mb-4">
            Reports are generated from completed case investigations.
          </p>
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neon-500/10 border border-neon-500/30 text-neon-400 hover:bg-neon-500/20 transition-colors text-sm font-medium"
          >
            View Cases
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/cases/${report.caseId}/reports/${report.id}`}
              className="glass-card p-6 hover:border-neon-500/30 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-signal-500/10 text-signal-400 border border-signal-500/30">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-display font-semibold text-void-100 group-hover:text-neon-400 transition-colors">
                        {report.filename}
                      </h3>
                      <p className="text-sm text-void-400">
                        {report.case.title} · {report.case.client.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-4">
                    <span className={`text-xs font-mono px-2 py-1 rounded ${
                      report.isLocked
                        ? 'bg-profit-500/20 text-profit-400'
                        : 'bg-void-700 text-void-400'
                    }`}>
                      {report.isLocked ? 'LOCKED' : 'DRAFT'}
                    </span>
                    <span className="text-xs text-void-500">
                      v{report.version}
                    </span>
                    <span className="text-xs text-void-500">
                      Generated {format(report.createdAt, 'MMM d, yyyy')}
                    </span>
                    {report.generatedBy && (
                      <span className="text-xs text-void-500">
                        by {report.generatedBy.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {report.path && (
                    <span className="text-xs text-void-500 font-mono">PDF</span>
                  )}
                  <svg className="w-5 h-5 text-void-600 group-hover:text-neon-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
