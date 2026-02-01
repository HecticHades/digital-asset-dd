'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'

type CaseStatus = 'DRAFT' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'CLOSED'
type Priority = 'low' | 'medium' | 'high' | 'urgent'
type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

interface CaseAssignee {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string
}

interface CaseClient {
  id: string
  name: string
  email: string
  type: string
  riskLevel: RiskLevel
  totalAssetValue?: number
}

interface CaseWallet {
  id: string
  address: string
  network: string
  label?: string
  balance?: number
  riskScore: number
  riskLevel: RiskLevel
  flagCount: number
}

interface CaseFinding {
  id: string
  title: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: string
  description: string
  createdAt: Date
  isResolved: boolean
}

interface CaseDocument {
  id: string
  name: string
  type: string
  status: 'pending' | 'verified' | 'rejected'
  uploadedAt: Date
}

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
  completedAt?: Date
  completedBy?: string
}

interface CaseData {
  id: string
  title: string
  description?: string
  status: CaseStatus
  priority: Priority
  createdAt: Date
  updatedAt: Date
  dueDate?: Date
  client: CaseClient
  assignee?: CaseAssignee
  reviewer?: CaseAssignee
  wallets: CaseWallet[]
  findings: CaseFinding[]
  documents: CaseDocument[]
  checklist: ChecklistItem[]
  riskScore: number
  riskLevel: RiskLevel
  notes?: string
}

interface CaseDetailViewProps {
  caseData: CaseData
  onStatusChange?: (status: CaseStatus) => void
  onWalletClick?: (wallet: CaseWallet) => void
  onFindingClick?: (finding: CaseFinding) => void
  onDocumentClick?: (document: CaseDocument) => void
}

// Status configuration
const statusConfig: Record<CaseStatus, { label: string; color: string; bg: string; border: string }> = {
  DRAFT: { label: 'Draft', color: 'text-void-400', bg: 'bg-void-700/50', border: 'border-void-600' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-neon-400', bg: 'bg-neon-500/10', border: 'border-neon-500/30' },
  PENDING_REVIEW: { label: 'Pending Review', color: 'text-caution-400', bg: 'bg-caution-500/10', border: 'border-caution-500/30' },
  APPROVED: { label: 'Approved', color: 'text-profit-400', bg: 'bg-profit-500/10', border: 'border-profit-500/30' },
  REJECTED: { label: 'Rejected', color: 'text-risk-400', bg: 'bg-risk-500/10', border: 'border-risk-500/30' },
  CLOSED: { label: 'Closed', color: 'text-void-500', bg: 'bg-void-800', border: 'border-void-700' },
}

const priorityConfig: Record<Priority, { label: string; color: string; icon: React.ReactNode }> = {
  low: {
    label: 'Low',
    color: 'text-void-400',
    icon: <div className="w-2 h-2 rounded-full bg-void-500" />,
  },
  medium: {
    label: 'Medium',
    color: 'text-signal-400',
    icon: <div className="w-2 h-2 rounded-full bg-signal-500" />,
  },
  high: {
    label: 'High',
    color: 'text-caution-400',
    icon: <div className="w-2 h-2 rounded-full bg-caution-500" />,
  },
  urgent: {
    label: 'Urgent',
    color: 'text-risk-400',
    icon: <div className="w-2 h-2 rounded-full bg-risk-500 animate-pulse" />,
  },
}

const riskConfig: Record<RiskLevel, { color: string; bg: string; border: string }> = {
  low: { color: 'text-profit-400', bg: 'bg-profit-500/10', border: 'border-profit-500/30' },
  medium: { color: 'text-caution-400', bg: 'bg-caution-500/10', border: 'border-caution-500/30' },
  high: { color: 'text-risk-400', bg: 'bg-risk-500/10', border: 'border-risk-500/30' },
  critical: { color: 'text-risk-500', bg: 'bg-risk-500/20', border: 'border-risk-500/50' },
}

// Case header with status and actions
function CaseHeader({
  caseData,
  onStatusChange,
}: {
  caseData: CaseData
  onStatusChange?: (status: CaseStatus) => void
}) {
  const status = statusConfig[caseData.status]
  const priority = priorityConfig[caseData.priority]
  const risk = riskConfig[caseData.riskLevel]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-void-500 mb-3">
            <Link href="/cases" className="hover:text-void-300 transition-colors">Cases</Link>
            <span>/</span>
            <span className="text-void-400">{caseData.id.slice(0, 8)}</span>
          </div>

          {/* Title and badges */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-void-100">
              {caseData.title}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color} border ${status.border}`}>
              {status.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${priority.color} bg-void-800`}>
              {priority.icon}
              {priority.label} Priority
            </span>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-void-400">
            <span>Created {format(caseData.createdAt, 'MMM d, yyyy')}</span>
            <span className="text-void-600">|</span>
            <span>Updated {formatDistanceToNow(caseData.updatedAt, { addSuffix: true })}</span>
            {caseData.dueDate && (
              <>
                <span className="text-void-600">|</span>
                <span className={new Date(caseData.dueDate) < new Date() ? 'text-risk-400' : ''}>
                  Due {format(caseData.dueDate, 'MMM d, yyyy')}
                </span>
              </>
            )}
          </div>

          {/* Description */}
          {caseData.description && (
            <p className="mt-4 text-void-300 max-w-2xl">{caseData.description}</p>
          )}
        </div>

        {/* Right side - Risk score and actions */}
        <div className="flex flex-col items-end gap-4">
          {/* Risk score */}
          <div className={`flex items-center gap-4 px-5 py-3 rounded-xl ${risk.bg} border ${risk.border}`}>
            <div className="relative w-14 h-14">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-void-800" />
                <motion.circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="100"
                  initial={{ strokeDashoffset: 100 }}
                  animate={{ strokeDashoffset: 100 - caseData.riskScore }}
                  transition={{ duration: 1 }}
                  strokeLinecap="round"
                  className={risk.color}
                />
              </svg>
              <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold font-mono ${risk.color}`}>
                {caseData.riskScore}
              </span>
            </div>
            <div>
              <p className="text-xs text-void-400">Risk Score</p>
              <p className={`text-lg font-semibold uppercase ${risk.color}`}>{caseData.riskLevel}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {caseData.status === 'IN_PROGRESS' && (
              <button
                onClick={() => onStatusChange?.('PENDING_REVIEW')}
                className="btn-primary"
              >
                Submit for Review
              </button>
            )}
            {caseData.status === 'PENDING_REVIEW' && (
              <>
                <button
                  onClick={() => onStatusChange?.('APPROVED')}
                  className="px-4 py-2 rounded-lg bg-profit-500/10 text-profit-400 border border-profit-500/30 hover:bg-profit-500/20 transition-all"
                >
                  Approve
                </button>
                <button
                  onClick={() => onStatusChange?.('REJECTED')}
                  className="btn-danger"
                >
                  Reject
                </button>
              </>
            )}
            <button className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              More
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Client summary card
function ClientCard({ client }: { client: CaseClient }) {
  const risk = riskConfig[client.riskLevel]

  return (
    <Link
      href={`/clients/${client.id}`}
      className="data-panel hover:border-neon-500/30 transition-all group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-void-500 uppercase tracking-wider">Client</span>
        <span className={`px-2 py-0.5 rounded text-2xs font-medium ${risk.bg} ${risk.color} border ${risk.border}`}>
          {client.riskLevel.toUpperCase()}
        </span>
      </div>
      <p className="text-lg font-semibold text-void-100 group-hover:text-neon-400 transition-colors">
        {client.name}
      </p>
      <p className="text-sm text-void-400 mt-1">{client.email}</p>
      {client.totalAssetValue && (
        <p className="text-sm text-void-300 mt-2">
          ${client.totalAssetValue.toLocaleString()} in digital assets
        </p>
      )}
    </Link>
  )
}

// Assignee card
function AssigneeCard({ assignee, label }: { assignee?: CaseAssignee; label: string }) {
  return (
    <div className="data-panel">
      <span className="text-xs text-void-500 uppercase tracking-wider">{label}</span>
      {assignee ? (
        <div className="flex items-center gap-3 mt-3">
          <div className="w-10 h-10 rounded-full bg-neon-500/20 flex items-center justify-center text-neon-400 font-semibold">
            {assignee.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="text-sm font-medium text-void-200">{assignee.name}</p>
            <p className="text-xs text-void-500">{assignee.role}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-void-500 mt-3">Unassigned</p>
      )}
    </div>
  )
}

// Wallet card
function WalletCard({ wallet, onClick }: { wallet: CaseWallet; onClick?: () => void }) {
  const risk = riskConfig[wallet.riskLevel]

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="w-full text-left data-panel hover:border-neon-500/30 transition-all"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-void-500">{wallet.network}</span>
        <div className={`flex items-center gap-2 px-2 py-0.5 rounded ${risk.bg} ${risk.color}`}>
          <span className="text-2xs font-mono">{wallet.riskScore}</span>
        </div>
      </div>
      <code className="text-sm font-mono text-void-200 break-all">
        {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
      </code>
      {wallet.label && (
        <span className="ml-2 px-2 py-0.5 rounded bg-void-800 text-void-400 text-2xs">
          {wallet.label}
        </span>
      )}
      <div className="flex items-center justify-between mt-3">
        {wallet.balance !== undefined && (
          <span className="text-sm text-void-400">${wallet.balance.toLocaleString()}</span>
        )}
        {wallet.flagCount > 0 && (
          <span className="px-2 py-0.5 rounded bg-risk-500/10 text-risk-400 text-2xs border border-risk-500/30">
            {wallet.flagCount} flags
          </span>
        )}
      </div>
    </motion.button>
  )
}

// Finding item
function FindingItem({ finding, onClick }: { finding: CaseFinding; onClick?: () => void }) {
  const severityConfig = {
    LOW: { color: 'text-profit-400', bg: 'bg-profit-500/10', border: 'border-profit-500/30' },
    MEDIUM: { color: 'text-caution-400', bg: 'bg-caution-500/10', border: 'border-caution-500/30' },
    HIGH: { color: 'text-risk-400', bg: 'bg-risk-500/10', border: 'border-risk-500/30' },
    CRITICAL: { color: 'text-risk-500', bg: 'bg-risk-500/20', border: 'border-risk-500/50' },
  }

  const severity = severityConfig[finding.severity]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all ${
        finding.isResolved
          ? 'bg-void-800/30 opacity-60'
          : `${severity.bg} border ${severity.border} hover:opacity-80`
      }`}
    >
      <div className="flex items-start gap-3">
        {finding.isResolved ? (
          <svg className="w-5 h-5 text-profit-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className={`w-5 h-5 shrink-0 mt-0.5 ${severity.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${finding.isResolved ? 'text-void-400 line-through' : severity.color}`}>
              {finding.title}
            </span>
            <span className={`text-2xs px-2 py-0.5 rounded ${severity.bg} ${severity.color}`}>
              {finding.severity}
            </span>
          </div>
          <p className="text-xs text-void-500 truncate">{finding.description}</p>
        </div>
      </div>
    </button>
  )
}

// Checklist progress
function ChecklistProgress({ checklist }: { checklist: ChecklistItem[] }) {
  const completed = checklist.filter(item => item.completed).length
  const total = checklist.length
  const percentage = total > 0 ? (completed / total) * 100 : 0

  return (
    <div className="data-panel">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-void-500 uppercase tracking-wider">Checklist</span>
        <span className="text-sm font-mono text-void-300">{completed}/{total}</span>
      </div>
      <div className="h-2 bg-void-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8 }}
          className={`h-full rounded-full ${percentage === 100 ? 'bg-profit-500' : 'bg-neon-500'}`}
        />
      </div>
      <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
        {checklist.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
              item.completed
                ? 'bg-profit-500/20 border-profit-500/50 text-profit-400'
                : 'border-void-600'
            }`}>
              {item.completed && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${item.completed ? 'text-void-500 line-through' : 'text-void-300'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Document status badge
function DocumentBadge({ status }: { status: CaseDocument['status'] }) {
  const config = {
    pending: { color: 'text-caution-400', bg: 'bg-caution-500/10', border: 'border-caution-500/30', label: 'Pending' },
    verified: { color: 'text-profit-400', bg: 'bg-profit-500/10', border: 'border-profit-500/30', label: 'Verified' },
    rejected: { color: 'text-risk-400', bg: 'bg-risk-500/10', border: 'border-risk-500/30', label: 'Rejected' },
  }

  const style = config[status]

  return (
    <span className={`px-2 py-0.5 rounded text-2xs font-medium ${style.bg} ${style.color} border ${style.border}`}>
      {style.label}
    </span>
  )
}

export function CaseDetailView({
  caseData,
  onStatusChange,
  onWalletClick,
  onFindingClick,
  onDocumentClick,
}: CaseDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'wallets' | 'findings' | 'documents'>('overview')

  const unresolvedFindings = caseData.findings.filter(f => !f.isResolved)
  const pendingDocs = caseData.documents.filter(d => d.status === 'pending')

  return (
    <div className="space-y-6">
      <CaseHeader caseData={caseData} onStatusChange={onStatusChange} />

      {/* Tab navigation */}
      <div className="flex items-center gap-1 p-1 glass-card">
        {[
          { id: 'overview' as const, label: 'Overview' },
          { id: 'wallets' as const, label: 'Wallets', count: caseData.wallets.length },
          { id: 'findings' as const, label: 'Findings', count: unresolvedFindings.length, alert: unresolvedFindings.some(f => f.severity === 'CRITICAL' || f.severity === 'HIGH') },
          { id: 'documents' as const, label: 'Documents', count: pendingDocs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'text-neon-400 bg-neon-500/10'
                : 'text-void-400 hover:text-void-200 hover:bg-void-800/50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-2 px-1.5 py-0.5 text-2xs rounded ${
                tab.alert ? 'bg-risk-500/20 text-risk-400' : 'bg-void-700 text-void-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            {/* Left column */}
            <div className="lg:col-span-2 space-y-6">
              <ClientCard client={caseData.client} />

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="stat-card text-center">
                  <p className="text-xs text-void-500 mb-1">Wallets</p>
                  <p className="text-2xl font-display font-bold text-void-100">{caseData.wallets.length}</p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs text-void-500 mb-1">Findings</p>
                  <p className={`text-2xl font-display font-bold ${unresolvedFindings.length > 0 ? 'text-caution-400' : 'text-void-100'}`}>
                    {unresolvedFindings.length}
                  </p>
                </div>
                <div className="stat-card text-center">
                  <p className="text-xs text-void-500 mb-1">Documents</p>
                  <p className="text-2xl font-display font-bold text-void-100">{caseData.documents.length}</p>
                </div>
              </div>

              {/* Recent findings */}
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-display font-semibold text-void-100">Recent Findings</h3>
                  <button
                    onClick={() => setActiveTab('findings')}
                    className="text-sm text-neon-400 hover:text-neon-300 transition-colors"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-2">
                  {caseData.findings.slice(0, 4).map((finding) => (
                    <FindingItem key={finding.id} finding={finding} onClick={() => onFindingClick?.(finding)} />
                  ))}
                  {caseData.findings.length === 0 && (
                    <p className="text-center py-8 text-void-500">No findings yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <AssigneeCard assignee={caseData.assignee} label="Assigned To" />
              <AssigneeCard assignee={caseData.reviewer} label="Reviewer" />
              <ChecklistProgress checklist={caseData.checklist} />
            </div>
          </motion.div>
        )}

        {activeTab === 'wallets' && (
          <motion.div
            key="wallets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-semibold text-void-100">Connected Wallets</h3>
              <button className="btn-primary text-sm">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Wallet
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caseData.wallets.map((wallet) => (
                <WalletCard key={wallet.id} wallet={wallet} onClick={() => onWalletClick?.(wallet)} />
              ))}
              {caseData.wallets.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-void-500">No wallets connected</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'findings' && (
          <motion.div
            key="findings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-semibold text-void-100">All Findings</h3>
              <button className="btn-primary text-sm">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Finding
              </button>
            </div>
            <div className="space-y-2">
              {caseData.findings.map((finding) => (
                <FindingItem key={finding.id} finding={finding} onClick={() => onFindingClick?.(finding)} />
              ))}
              {caseData.findings.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-void-500">No findings recorded</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'documents' && (
          <motion.div
            key="documents"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-semibold text-void-100">Documents</h3>
              <button className="btn-primary text-sm">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </button>
            </div>
            <div className="space-y-2">
              {caseData.documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentClick?.(doc)}
                  className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-void-800/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-void-800 flex items-center justify-center text-void-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-void-200">{doc.name}</p>
                    <p className="text-xs text-void-500">{doc.type} • Uploaded {format(doc.uploadedAt, 'MMM d, yyyy')}</p>
                  </div>
                  <DocumentBadge status={doc.status} />
                </button>
              ))}
              {caseData.documents.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-void-500">No documents uploaded</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
