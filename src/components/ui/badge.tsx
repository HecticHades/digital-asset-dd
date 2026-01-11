import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-slate-100 text-slate-800': variant === 'default',
          'bg-green-100 text-green-800': variant === 'success',
          'bg-yellow-100 text-yellow-800': variant === 'warning',
          'bg-red-100 text-red-800': variant === 'error',
          'bg-blue-100 text-blue-800': variant === 'info',
        },
        className
      )}
      {...props}
    />
  )
}

// Pre-configured badges for common use cases
function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    PENDING: { variant: 'warning', label: 'Pending' },
    IN_PROGRESS: { variant: 'info', label: 'In Progress' },
    UNDER_REVIEW: { variant: 'info', label: 'Under Review' },
    PENDING_REVIEW: { variant: 'warning', label: 'Pending Review' },
    APPROVED: { variant: 'success', label: 'Approved' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    REJECTED: { variant: 'error', label: 'Rejected' },
    ARCHIVED: { variant: 'default', label: 'Archived' },
    DRAFT: { variant: 'default', label: 'Draft' },
  }

  const config = statusConfig[status] || { variant: 'default', label: status }

  return <Badge variant={config.variant}>{config.label}</Badge>
}

function RiskBadge({ level }: { level: string }) {
  const riskConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    LOW: { variant: 'success', label: 'Low Risk' },
    MEDIUM: { variant: 'warning', label: 'Medium Risk' },
    HIGH: { variant: 'error', label: 'High Risk' },
    CRITICAL: { variant: 'error', label: 'Critical Risk' },
    UNASSESSED: { variant: 'default', label: 'Unassessed' },
  }

  const config = riskConfig[level] || { variant: 'default', label: level }

  return <Badge variant={config.variant}>{config.label}</Badge>
}

export { Badge, StatusBadge, RiskBadge }
