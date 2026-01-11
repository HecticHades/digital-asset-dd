import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuditLogViewer } from './audit-log-viewer'
import { fetchAuditLogs, fetchAuditLogUsers, exportAuditLogs } from './actions'

export default async function AuditLogsPage() {
  // Fetch initial data
  const [logsResult, users] = await Promise.all([
    fetchAuditLogs({}, { page: 1, limit: 50 }),
    fetchAuditLogUsers(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-600 mt-1">
          View all system activity and user actions
        </p>
      </div>

      <Suspense
        fallback={
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              Loading audit logs...
            </CardContent>
          </Card>
        }
      >
        <AuditLogViewer
          initialLogs={logsResult}
          users={users}
          fetchLogsAction={fetchAuditLogs}
          exportLogsAction={exportAuditLogs}
        />
      </Suspense>
    </div>
  )
}
