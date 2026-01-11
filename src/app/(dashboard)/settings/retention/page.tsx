import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getRetentionPolicy } from '@/lib/retention'
import { RetentionPolicyForm } from './retention-policy-form'
import { ArchivedCasesTable } from './archived-cases-table'
import { DeletionLogsTable } from './deletion-logs-table'
import { getArchivedCasesAction, getDeletionLogsAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function RetentionSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.organizationId) {
    redirect('/login')
  }

  // Only admins can access retention settings
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const [policy, archivedCases, deletionLogs] = await Promise.all([
    getRetentionPolicy(session.user.organizationId),
    getArchivedCasesAction(1, 10),
    getDeletionLogsAction(1, 10),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Data Retention</h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure data retention policies and manage archived cases.
        </p>
      </div>

      {/* Retention Policy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <RetentionPolicyForm initialPolicy={policy} />
        </CardContent>
      </Card>

      {/* Archived Cases */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Archived Cases</CardTitle>
            {archivedCases && (
              <span className="text-sm text-slate-500">
                {archivedCases.total} total
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {archivedCases && archivedCases.cases.length > 0 ? (
            <ArchivedCasesTable initialData={archivedCases} />
          ) : (
            <div className="text-center py-8 text-slate-500">
              No archived cases found.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deletion Logs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Deletion History</CardTitle>
            {deletionLogs && (
              <span className="text-sm text-slate-500">
                {deletionLogs.total} total
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {deletionLogs && deletionLogs.logs.length > 0 ? (
            <DeletionLogsTable initialData={deletionLogs} />
          ) : (
            <div className="text-center py-8 text-slate-500">
              No deletion records found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
