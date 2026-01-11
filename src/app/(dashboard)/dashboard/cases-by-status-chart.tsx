'use client'

import { CaseStatus } from '@prisma/client'

interface CasesByStatus {
  status: CaseStatus
  count: number
}

const statusConfig: Record<CaseStatus, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: '#64748b', bgColor: '#f1f5f9' },
  IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bgColor: '#dbeafe' },
  PENDING_REVIEW: { label: 'Pending Review', color: '#f59e0b', bgColor: '#fef3c7' },
  APPROVED: { label: 'Approved', color: '#10b981', bgColor: '#d1fae5' },
  REJECTED: { label: 'Rejected', color: '#ef4444', bgColor: '#fee2e2' },
  COMPLETED: { label: 'Completed', color: '#22c55e', bgColor: '#dcfce7' },
  ARCHIVED: { label: 'Archived', color: '#94a3b8', bgColor: '#e2e8f0' },
}

// Ordered statuses for display
const orderedStatuses: CaseStatus[] = [
  'DRAFT',
  'IN_PROGRESS',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'ARCHIVED',
]

export function CasesByStatusChart({ data }: { data: CasesByStatus[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  // Create a map for quick lookup
  const dataMap = new Map(data.map((d) => [d.status, d.count]))

  // Get the maximum count for scaling
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Total Cases</span>
        <span className="font-semibold text-slate-900">{total}</span>
      </div>

      {/* Horizontal bar chart */}
      <div className="space-y-3">
        {orderedStatuses.map((status) => {
          const count = dataMap.get(status) || 0
          if (count === 0) return null

          const config = statusConfig[status]
          const percentage = (count / maxCount) * 100

          return (
            <div key={status} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{config.label}</span>
                <span className="font-medium text-slate-900">{count}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: config.color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend / Pills */}
      <div className="flex flex-wrap gap-2 pt-2">
        {orderedStatuses.map((status) => {
          const count = dataMap.get(status) || 0
          if (count === 0) return null

          const config = statusConfig[status]
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0

          return (
            <div
              key={status}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
              style={{ backgroundColor: config.bgColor, color: config.color }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span className="font-medium">{percentage}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
