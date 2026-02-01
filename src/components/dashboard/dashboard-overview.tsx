'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  totalClients: number
  activeCases: number
  pendingReviews: number
  highRiskFlags: number
  totalAssetValue?: number
  casesThisWeek?: number
}

interface RecentActivity {
  id: string
  type: 'case_created' | 'case_status_changed' | 'client_created' | 'finding_added' | 'wallet_added'
  title: string
  description: string
  timestamp: Date
  link?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

interface CasesByStatus {
  status: string
  count: number
  label: string
}

interface AlertItem {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium'
  timestamp: Date
  link?: string
}

interface DashboardOverviewProps {
  stats: DashboardStats
  recentActivity: RecentActivity[]
  casesByStatus: CasesByStatus[]
  alerts?: AlertItem[]
  userName?: string
}

// Animated counter component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      setDisplayValue(Math.floor(progress * value))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span className="tabular-nums">{displayValue.toLocaleString()}</span>
}

// Stat card with glow effects
function StatCard({
  title,
  value,
  icon,
  href,
  trend,
  trendValue,
  variant = 'default',
  delay = 0,
}: {
  title: string
  value: number
  icon: React.ReactNode
  href?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  variant?: 'default' | 'neon' | 'profit' | 'caution' | 'risk'
  delay?: number
}) {
  const variantStyles = {
    default: 'border-void-700/50 hover:border-void-600',
    neon: 'border-neon-500/30 hover:border-neon-400/50',
    profit: 'border-profit-500/30 hover:border-profit-400/50',
    caution: 'border-caution-500/30 hover:border-caution-400/50',
    risk: 'border-risk-500/30 hover:border-risk-400/50',
  }

  const iconStyles = {
    default: 'text-void-400',
    neon: 'text-neon-400',
    profit: 'text-profit-400',
    caution: 'text-caution-400',
    risk: 'text-risk-400',
  }

  const glowStyles = {
    default: '',
    neon: 'shadow-glow-sm',
    profit: 'shadow-glow-profit',
    caution: '',
    risk: 'shadow-glow-risk',
  }

  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`stat-card ${variantStyles[variant]} ${glowStyles[variant]} group cursor-pointer`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg bg-void-800/50 ${iconStyles[variant]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-profit-400' : trend === 'down' ? 'text-risk-400' : 'text-void-400'
          }`}>
            {trend === 'up' && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {trendValue}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-void-400 text-sm font-medium">{title}</p>
        <p className={`text-3xl font-display font-bold ${
          variant === 'risk' ? 'text-risk-400' :
          variant === 'caution' ? 'text-caution-400' :
          variant === 'profit' ? 'text-profit-400' :
          variant === 'neon' ? 'text-neon-400' : 'text-void-100'
        }`}>
          <AnimatedCounter value={value} />
        </p>
      </div>
      <div className="absolute bottom-0 right-0 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
    </motion.div>
  )

  if (href) {
    return <Link href={href} className="block">{content}</Link>
  }
  return content
}

// Activity feed item
function ActivityItem({ activity, index }: { activity: RecentActivity; index: number }) {
  const typeConfig = {
    case_created: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-signal-400',
      bg: 'bg-signal-500/10',
      border: 'border-signal-500/30',
    },
    client_created: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      color: 'text-neon-400',
      bg: 'bg-neon-500/10',
      border: 'border-neon-500/30',
    },
    finding_added: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'text-caution-400',
      bg: 'bg-caution-500/10',
      border: 'border-caution-500/30',
    },
    wallet_added: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      color: 'text-profit-400',
      bg: 'bg-profit-500/10',
      border: 'border-profit-500/30',
    },
    case_status_changed: {
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      color: 'text-void-300',
      bg: 'bg-void-700/50',
      border: 'border-void-600/50',
    },
  }

  const config = typeConfig[activity.type] || typeConfig.case_status_changed

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <Link
        href={activity.link || '#'}
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-void-800/50 transition-colors"
      >
        <div className={`p-2 rounded-lg ${config.bg} ${config.color} border ${config.border}`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-void-100 group-hover:text-neon-400 transition-colors">
            {activity.title}
          </p>
          <p className="text-sm text-void-400 truncate">{activity.description}</p>
          <p className="text-xs text-void-500 mt-1 font-mono">
            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
          </p>
        </div>
        <svg className="w-4 h-4 text-void-600 group-hover:text-neon-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </motion.div>
  )
}

// Cases by status visualization
function CasesChart({ data }: { data: CasesByStatus[] }) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  const statusColors: Record<string, { bar: string; glow: string }> = {
    DRAFT: { bar: 'bg-void-500', glow: '' },
    IN_PROGRESS: { bar: 'bg-neon-500', glow: 'shadow-glow-sm' },
    PENDING_REVIEW: { bar: 'bg-caution-500', glow: '' },
    APPROVED: { bar: 'bg-profit-500', glow: 'shadow-glow-profit' },
    REJECTED: { bar: 'bg-risk-500', glow: 'shadow-glow-risk' },
    CLOSED: { bar: 'bg-void-600', glow: '' },
  }

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.count / total) * 100 : 0
        const colors = statusColors[item.status] || { bar: 'bg-void-500', glow: '' }

        return (
          <motion.div
            key={item.status}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-sm text-void-300">{item.label}</span>
              <span className="text-sm font-mono text-void-400">{item.count}</span>
            </div>
            <div className="h-2 bg-void-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                className={`h-full rounded-full ${colors.bar} ${colors.glow}`}
              />
            </div>
          </motion.div>
        )
      })}
      <div className="pt-4 border-t border-void-800 flex justify-between items-center">
        <span className="text-sm text-void-400">Total Cases</span>
        <span className="text-lg font-display font-bold text-void-100">{total}</span>
      </div>
    </div>
  )
}

// Alert card
function AlertCard({ alert, index }: { alert: AlertItem; index: number }) {
  const severityConfig = {
    critical: {
      border: 'border-risk-500/50',
      bg: 'bg-risk-500/5',
      icon: 'text-risk-400',
      pulse: true,
    },
    high: {
      border: 'border-caution-500/50',
      bg: 'bg-caution-500/5',
      icon: 'text-caution-400',
      pulse: false,
    },
    medium: {
      border: 'border-void-600',
      bg: 'bg-void-800/50',
      icon: 'text-void-400',
      pulse: false,
    },
  }

  const config = severityConfig[alert.severity]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Link
        href={alert.link || '#'}
        className={`block p-4 rounded-lg border ${config.border} ${config.bg} hover:bg-void-800/50 transition-all group`}
      >
        <div className="flex items-start gap-3">
          <div className={`relative ${config.icon}`}>
            {config.pulse && (
              <span className="absolute inset-0 rounded-full bg-risk-500/50 animate-ping" />
            )}
            <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-void-100 group-hover:text-neon-400 transition-colors">
              {alert.title}
            </p>
            <p className="text-xs text-void-400 mt-1">{alert.description}</p>
          </div>
          <span className={`text-2xs font-mono px-2 py-0.5 rounded ${
            alert.severity === 'critical' ? 'bg-risk-500/20 text-risk-400' :
            alert.severity === 'high' ? 'bg-caution-500/20 text-caution-400' :
            'bg-void-700 text-void-400'
          }`}>
            {alert.severity.toUpperCase()}
          </span>
        </div>
      </Link>
    </motion.div>
  )
}

// Quick action button
function QuickAction({
  href,
  icon,
  label,
  variant = 'default',
}: {
  href: string
  icon: React.ReactNode
  label: string
  variant?: 'default' | 'primary'
}) {
  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg transition-all
        ${variant === 'primary'
          ? 'bg-neon-500/10 border border-neon-500/30 text-neon-400 hover:bg-neon-500/20 hover:border-neon-400/50'
          : 'bg-void-800/50 border border-void-700/50 text-void-200 hover:bg-void-700/50 hover:border-void-600'
        }
      `}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  )
}

export function DashboardOverview({
  stats,
  recentActivity,
  casesByStatus,
  alerts = [],
  userName,
}: DashboardOverviewProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end md:justify-between gap-4"
      >
        <div>
          <p className="text-void-400 text-sm font-mono mb-1">
            {format(currentTime, 'EEEE, MMMM d, yyyy')}
          </p>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-void-100">
            {userName ? `Welcome back, ${userName}` : 'Dashboard'}
          </h1>
          <p className="text-void-400 mt-2">
            Overview of your due diligence operations
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-sm">
          <div className="w-2 h-2 rounded-full bg-profit-400 animate-pulse" />
          <span className="text-void-400">System Online</span>
          <span className="text-void-600 mx-2">|</span>
          <span className="text-neon-400">{format(currentTime, 'HH:mm:ss')}</span>
        </div>
      </motion.div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-void-400 uppercase tracking-wider">
            Active Alerts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alerts.slice(0, 3).map((alert, index) => (
              <AlertCard key={alert.id} alert={alert} index={index} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          href="/clients"
          trend="up"
          trendValue="+12%"
          delay={0}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Cases"
          value={stats.activeCases}
          href="/cases?status=IN_PROGRESS"
          variant="neon"
          delay={0.1}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          href="/cases?status=PENDING_REVIEW"
          variant="caution"
          delay={0.2}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="High-Risk Flags"
          value={stats.highRiskFlags}
          variant={stats.highRiskFlags > 0 ? 'risk' : 'default'}
          delay={0.3}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases by Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-void-100">Cases by Status</h2>
            <Link href="/cases" className="text-sm text-neon-400 hover:text-neon-300 transition-colors">
              View all
            </Link>
          </div>
          {casesByStatus.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-void-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-void-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-void-400 text-sm">No cases yet</p>
              <Link href="/cases/new" className="text-neon-400 hover:text-neon-300 text-sm mt-2 inline-block">
                Create your first case
              </Link>
            </div>
          ) : (
            <CasesChart data={casesByStatus} />
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-display font-semibold text-void-100">Recent Activity</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-400 animate-pulse" />
              <span className="text-xs text-void-400 font-mono">Live</span>
            </div>
          </div>
          {recentActivity.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-void-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-void-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-void-400 text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
              {recentActivity.map((activity, index) => (
                <ActivityItem key={activity.id} activity={activity} index={index} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-display font-semibold text-void-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction
            href="/clients/new"
            variant="primary"
            label="Add Client"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            }
          />
          <QuickAction
            href="/cases/new"
            label="New Case"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
          <QuickAction
            href="/cases?status=PENDING_REVIEW"
            label="Review Cases"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />
          <QuickAction
            href="/reports"
            label="View Reports"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          />
        </div>
      </motion.div>
    </div>
  )
}
