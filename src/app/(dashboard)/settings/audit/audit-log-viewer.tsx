'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import {
  ACTION_LABELS,
  ENTITY_TYPE_LABELS,
  getActionColor,
  type AuditAction,
  type EntityType,
} from '@/lib/audit'

interface AuditLogEntry {
  id: string
  action: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown> | null
  timestamp: string
  ipAddress: string | null
  userAgent: string | null
  userId: string | null
  organizationId: string
  user?: {
    id: string
    name: string
    email: string
  } | null
}

interface AuditLogsResult {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface AuditLogViewerProps {
  initialLogs: AuditLogsResult
  users: Array<{ id: string; name: string; email: string }>
  fetchLogsAction: (
    filter: {
      userId?: string
      action?: string
      entityType?: string
      startDate?: string
      endDate?: string
    },
    pagination: { page: number; limit: number }
  ) => Promise<AuditLogsResult>
  exportLogsAction: (filter: {
    userId?: string
    action?: string
    entityType?: string
    startDate?: string
    endDate?: string
  }) => Promise<string>
}

// Filter options
const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  ...Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
]

const ENTITY_TYPE_OPTIONS = [
  { value: '', label: 'All Entities' },
  ...Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

export function AuditLogViewer({
  initialLogs,
  users,
  fetchLogsAction,
  exportLogsAction,
}: AuditLogViewerProps) {
  const [logsResult, setLogsResult] = useState(initialLogs)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Filter state
  const [userId, setUserId] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const userOptions = [
    { value: '', label: 'All Users' },
    ...users.map(u => ({ value: u.id, label: `${u.name} (${u.email})` })),
  ]

  const getFilter = useCallback(() => {
    return {
      userId: userId || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }
  }, [userId, action, entityType, startDate, endDate])

  const fetchLogs = useCallback(async (page: number = 1) => {
    setLoading(true)
    try {
      const result = await fetchLogsAction(getFilter(), { page, limit: 50 })
      setLogsResult(result)
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }, [fetchLogsAction, getFilter])

  const handleSearch = () => {
    fetchLogs(1)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const csv = await exportLogsAction(getFilter())

      // Create download
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export logs:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleClearFilters = () => {
    setUserId('')
    setAction('')
    setEntityType('')
    setStartDate('')
    setEndDate('')
    fetchLogs(1)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Select
              label="User"
              options={userOptions}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <Select
              label="Action"
              options={ACTION_OPTIONS}
              value={action}
              onChange={(e) => setAction(e.target.value)}
            />
            <Select
              label="Entity Type"
              options={ENTITY_TYPE_OPTIONS}
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
            />
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base">
              Audit Logs ({logsResult.total.toLocaleString()} total)
            </CardTitle>
            <span className="text-sm text-slate-500">
              Page {logsResult.page} of {logsResult.totalPages}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {logsResult.logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No audit logs found matching your criteria.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="w-32">IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsResult.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          {log.user ? (
                            <div>
                              <div className="font-medium">{log.user.name}</div>
                              <div className="text-xs text-slate-500">{log.user.email}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">System</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${getActionColor(log.action)}`}>
                            {ACTION_LABELS[log.action as AuditAction] || log.action}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="default">
                              {ENTITY_TYPE_LABELS[log.entityType as EntityType] || log.entityType}
                            </Badge>
                            {log.entityId && (
                              <span className="ml-2 text-xs text-slate-500 font-mono">
                                {log.entityId.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.details ? (
                            <DetailsPopover details={log.details} />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 font-mono">
                          {log.ipAddress || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-slate-500">
                  Showing {((logsResult.page - 1) * logsResult.limit) + 1} to{' '}
                  {Math.min(logsResult.page * logsResult.limit, logsResult.total)} of{' '}
                  {logsResult.total.toLocaleString()} entries
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(logsResult.page - 1)}
                    disabled={logsResult.page <= 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchLogs(logsResult.page + 1)}
                    disabled={logsResult.page >= logsResult.totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Details popover component
function DetailsPopover({ details }: { details: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState(false)

  const entries = Object.entries(details).filter(([, value]) => value !== null && value !== undefined)

  if (entries.length === 0) {
    return <span className="text-slate-400">-</span>
  }

  // Show first entry inline
  const [firstKey, firstValue] = entries[0]
  const displayValue = typeof firstValue === 'object'
    ? JSON.stringify(firstValue)
    : String(firstValue)

  return (
    <div>
      <div className="text-sm">
        <span className="text-slate-500">{firstKey}:</span>{' '}
        <span className="text-slate-700">{displayValue.slice(0, 30)}{displayValue.length > 30 ? '...' : ''}</span>
      </div>
      {entries.length > 1 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary-600 hover:text-primary-700 mt-1"
        >
          {expanded ? 'Hide' : `+${entries.length - 1} more`}
        </button>
      )}
      {expanded && (
        <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
          {entries.slice(1).map(([key, value]) => (
            <div key={key} className="py-0.5">
              <span className="text-slate-500">{key}:</span>{' '}
              <span className="text-slate-700">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
