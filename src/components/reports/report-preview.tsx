'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

interface ReportClient {
  name: string
  email: string
  type: string
  jurisdiction: string
}

interface ReportWallet {
  address: string
  network: string
  balance: number
  riskScore: number
  flagCount: number
}

interface ReportExchange {
  name: string
  totalVolume: number
  transactionCount: number
  verified: boolean
}

interface ReportFinding {
  title: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: string
  description: string
}

interface ReportRiskCategory {
  name: string
  score: number
  status: RiskLevel
}

interface ReportData {
  id: string
  title: string
  generatedAt: Date
  generatedBy: string
  caseId: string
  client: ReportClient
  executiveSummary: string
  sourceOfWealth: string
  sourceOfFunds: string
  netWorth: number
  portfolioValue: number
  riskScore: number
  riskLevel: RiskLevel
  riskCategories: ReportRiskCategory[]
  wallets: ReportWallet[]
  exchanges: ReportExchange[]
  findings: ReportFinding[]
  recommendation: 'approve' | 'reject' | 'conditional'
  recommendationNotes?: string
  conclusion: string
}

interface ReportPreviewProps {
  report: ReportData
  onExportPDF?: () => void
  onShare?: () => void
}

// Report section wrapper
function ReportSection({
  title,
  number,
  children,
}: {
  title: string
  number: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12"
    >
      <div className="flex items-baseline gap-4 mb-6 pb-3 border-b border-void-800">
        <span className="text-sm font-mono text-neon-400">{number}</span>
        <h2 className="text-xl font-display font-semibold text-void-100">{title}</h2>
      </div>
      {children}
    </motion.section>
  )
}

// Risk gauge visualization
function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const colors: Record<RiskLevel, { text: string; bar: string }> = {
    low: { text: 'text-profit-400', bar: 'bg-profit-500' },
    medium: { text: 'text-caution-400', bar: 'bg-caution-500' },
    high: { text: 'text-risk-400', bar: 'bg-risk-400' },
    critical: { text: 'text-risk-500', bar: 'bg-risk-500' },
  }

  const color = colors[level]

  return (
    <div className="relative">
      <div className="flex items-center gap-6">
        {/* Score circle */}
        <div className="relative w-24 h-24">
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
              animate={{ strokeDashoffset: 100 - score }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              strokeLinecap="round"
              className={color.text}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold font-mono ${color.text}`}>{score}</span>
          </div>
        </div>

        {/* Level indicator */}
        <div>
          <p className="text-sm text-void-500 mb-1">Risk Level</p>
          <p className={`text-2xl font-display font-bold uppercase ${color.text}`}>{level}</p>
        </div>
      </div>

      {/* Scale bar */}
      <div className="mt-6">
        <div className="flex justify-between text-2xs text-void-500 mb-1">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
          <span>Critical</span>
        </div>
        <div className="h-2 rounded-full bg-void-800 overflow-hidden">
          <div className="h-full flex">
            <div className="h-full bg-profit-500 flex-1" />
            <div className="h-full bg-caution-500 flex-1" />
            <div className="h-full bg-risk-400 flex-1" />
            <div className="h-full bg-risk-500 flex-1" />
          </div>
        </div>
        <div className="relative mt-1">
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${score}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute w-0 h-0 -translate-x-1/2"
            style={{ top: -4 }}
          >
            <div className="w-2 h-2 rotate-45 bg-void-100" />
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// Category risk bar
function CategoryBar({ category, index }: { category: ReportRiskCategory; index: number }) {
  const colors: Record<RiskLevel, string> = {
    low: 'bg-profit-500',
    medium: 'bg-caution-500',
    high: 'bg-risk-400',
    critical: 'bg-risk-500',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex items-center gap-4"
    >
      <span className="w-32 text-sm text-void-400">{category.name}</span>
      <div className="flex-1 h-2 bg-void-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${category.score}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
          className={`h-full rounded-full ${colors[category.status]}`}
        />
      </div>
      <span className="w-8 text-sm font-mono text-void-300 text-right">{category.score}</span>
    </motion.div>
  )
}

// Wallet row
function WalletRow({ wallet, index }: { wallet: ReportWallet; index: number }) {
  const riskColor = wallet.riskScore >= 75 ? 'text-risk-500' :
                    wallet.riskScore >= 50 ? 'text-risk-400' :
                    wallet.riskScore >= 25 ? 'text-caution-400' : 'text-profit-400'

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-void-800 last:border-0"
    >
      <td className="py-3 pr-4">
        <code className="text-sm font-mono text-void-300">
          {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
        </code>
      </td>
      <td className="py-3 px-4 text-sm text-void-400">{wallet.network}</td>
      <td className="py-3 px-4 text-sm font-mono text-void-300">${wallet.balance.toLocaleString()}</td>
      <td className={`py-3 px-4 text-sm font-mono ${riskColor}`}>{wallet.riskScore}</td>
      <td className="py-3 pl-4 text-sm">
        {wallet.flagCount > 0 ? (
          <span className="px-2 py-0.5 rounded bg-risk-500/10 text-risk-400 text-xs">
            {wallet.flagCount} flags
          </span>
        ) : (
          <span className="text-profit-400 text-xs">Clear</span>
        )}
      </td>
    </motion.tr>
  )
}

// Finding card
function FindingCard({ finding, index }: { finding: ReportFinding; index: number }) {
  const severityConfig = {
    LOW: { color: 'text-profit-400', bg: 'bg-profit-500/10', border: 'border-profit-500/30' },
    MEDIUM: { color: 'text-caution-400', bg: 'bg-caution-500/10', border: 'border-caution-500/30' },
    HIGH: { color: 'text-risk-400', bg: 'bg-risk-500/10', border: 'border-risk-500/30' },
    CRITICAL: { color: 'text-risk-500', bg: 'bg-risk-500/20', border: 'border-risk-500/50' },
  }

  const config = severityConfig[finding.severity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 rounded-lg ${config.bg} border ${config.border}`}
    >
      <div className="flex items-start gap-3">
        <svg className={`w-5 h-5 shrink-0 mt-0.5 ${config.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium ${config.color}`}>{finding.title}</span>
            <span className={`text-2xs px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
              {finding.severity}
            </span>
          </div>
          <p className="text-sm text-void-400">{finding.description}</p>
          <p className="text-xs text-void-500 mt-1">{finding.category}</p>
        </div>
      </div>
    </motion.div>
  )
}

// Recommendation badge
function RecommendationBadge({ recommendation }: { recommendation: ReportData['recommendation'] }) {
  const config = {
    approve: {
      label: 'APPROVE',
      color: 'text-profit-400',
      bg: 'bg-profit-500/10',
      border: 'border-profit-500/50',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    reject: {
      label: 'REJECT',
      color: 'text-risk-400',
      bg: 'bg-risk-500/10',
      border: 'border-risk-500/50',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    conditional: {
      label: 'CONDITIONAL APPROVE',
      color: 'text-caution-400',
      bg: 'bg-caution-500/10',
      border: 'border-caution-500/50',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  }

  const style = config[recommendation]

  return (
    <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-xl ${style.bg} border ${style.border}`}>
      <span className={style.color}>{style.icon}</span>
      <span className={`text-xl font-display font-bold ${style.color}`}>{style.label}</span>
    </div>
  )
}

// Table of contents
function TableOfContents() {
  const sections = [
    { num: '01', title: 'Executive Summary' },
    { num: '02', title: 'Client Profile' },
    { num: '03', title: 'Digital Asset Portfolio' },
    { num: '04', title: 'Wallet Analysis' },
    { num: '05', title: 'Exchange Activity' },
    { num: '06', title: 'Risk Assessment' },
    { num: '07', title: 'Findings' },
    { num: '08', title: 'Conclusion & Recommendation' },
  ]

  return (
    <div className="data-panel">
      <h3 className="text-sm font-medium text-void-300 mb-4">Contents</h3>
      <nav className="space-y-2">
        {sections.map((section) => (
          <a
            key={section.num}
            href={`#section-${section.num}`}
            className="flex items-center gap-3 text-sm text-void-400 hover:text-neon-400 transition-colors"
          >
            <span className="font-mono text-void-600">{section.num}</span>
            <span>{section.title}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}

export function ReportPreview({ report, onExportPDF, onShare }: ReportPreviewProps) {
  const [showTOC, setShowTOC] = useState(true)

  return (
    <div className="min-h-screen">
      {/* Report header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-8 mb-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-void-500 font-mono mb-2">
              Report #{report.id.slice(0, 8)} • Case #{report.caseId.slice(0, 8)}
            </p>
            <h1 className="text-3xl font-display font-bold text-void-100 mb-2">
              {report.title}
            </h1>
            <p className="text-void-400">
              Generated {format(report.generatedAt, 'MMMM d, yyyy')} by {report.generatedBy}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onShare} className="btn-secondary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <button onClick={onExportPDF} className="btn-primary">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-8">
        {/* Sidebar TOC */}
        <AnimatePresence>
          {showTOC && (
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="hidden lg:block w-64 shrink-0"
            >
              <div className="sticky top-8">
                <TableOfContents />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 max-w-4xl">
          {/* Cover/Title Section */}
          <div className="glass-card p-8 mb-8 text-center">
            <p className="text-sm text-neon-400 font-mono tracking-wider mb-4">CONFIDENTIAL</p>
            <h2 className="text-2xl font-display font-bold text-void-100 mb-2">
              Due Diligence Report
            </h2>
            <p className="text-lg text-void-300">{report.client.name}</p>
            <div className="flex items-center justify-center gap-8 mt-6 text-sm text-void-500">
              <span>{report.client.type}</span>
              <span>•</span>
              <span>{report.client.jurisdiction}</span>
            </div>
          </div>

          {/* Executive Summary */}
          <ReportSection title="Executive Summary" number="01">
            <div className="prose prose-invert max-w-none">
              <p className="text-void-300 leading-relaxed">{report.executiveSummary}</p>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-8">
              <div className="data-panel text-center">
                <p className="text-xs text-void-500 mb-2">Source of Wealth</p>
                <p className="text-sm text-void-200">{report.sourceOfWealth}</p>
              </div>
              <div className="data-panel text-center">
                <p className="text-xs text-void-500 mb-2">Source of Funds</p>
                <p className="text-sm text-void-200">{report.sourceOfFunds}</p>
              </div>
              <div className="data-panel text-center">
                <p className="text-xs text-void-500 mb-2">Estimated Net Worth</p>
                <p className="text-lg font-mono font-semibold text-void-100">
                  ${report.netWorth.toLocaleString()}
                </p>
              </div>
            </div>
          </ReportSection>

          {/* Client Profile */}
          <ReportSection title="Client Profile" number="02">
            <div className="grid grid-cols-2 gap-6">
              <div className="data-panel">
                <p className="text-xs text-void-500 mb-1">Client Name</p>
                <p className="text-lg text-void-100">{report.client.name}</p>
              </div>
              <div className="data-panel">
                <p className="text-xs text-void-500 mb-1">Email</p>
                <p className="text-lg text-void-100">{report.client.email}</p>
              </div>
              <div className="data-panel">
                <p className="text-xs text-void-500 mb-1">Client Type</p>
                <p className="text-lg text-void-100">{report.client.type}</p>
              </div>
              <div className="data-panel">
                <p className="text-xs text-void-500 mb-1">Jurisdiction</p>
                <p className="text-lg text-void-100">{report.client.jurisdiction}</p>
              </div>
            </div>
          </ReportSection>

          {/* Digital Asset Portfolio */}
          <ReportSection title="Digital Asset Portfolio" number="03">
            <div className="data-panel text-center py-8">
              <p className="text-sm text-void-500 mb-2">Total Portfolio Value</p>
              <p className="text-4xl font-mono font-bold text-neon-400">
                ${report.portfolioValue.toLocaleString()}
              </p>
            </div>
          </ReportSection>

          {/* Wallet Analysis */}
          <ReportSection title="Wallet Analysis" number="04">
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-void-900/50">
                  <tr className="text-xs text-void-500 uppercase tracking-wider">
                    <th className="py-3 pr-4 text-left font-medium">Address</th>
                    <th className="py-3 px-4 text-left font-medium">Network</th>
                    <th className="py-3 px-4 text-left font-medium">Balance</th>
                    <th className="py-3 px-4 text-left font-medium">Risk</th>
                    <th className="py-3 pl-4 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.wallets.map((wallet, index) => (
                    <WalletRow key={wallet.address} wallet={wallet} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          {/* Exchange Activity */}
          <ReportSection title="Exchange Activity" number="05">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.exchanges.map((exchange, index) => (
                <motion.div
                  key={exchange.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="data-panel"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-void-200">{exchange.name}</span>
                    {exchange.verified ? (
                      <span className="px-2 py-0.5 rounded text-2xs bg-profit-500/10 text-profit-400 border border-profit-500/30">
                        Verified
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-2xs bg-caution-500/10 text-caution-400 border border-caution-500/30">
                        Unverified
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-void-500">Volume</p>
                      <p className="font-mono text-void-300">${exchange.totalVolume.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-void-500">Transactions</p>
                      <p className="font-mono text-void-300">{exchange.transactionCount}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ReportSection>

          {/* Risk Assessment */}
          <ReportSection title="Risk Assessment" number="06">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RiskGauge score={report.riskScore} level={report.riskLevel} />
              <div className="space-y-3">
                {report.riskCategories.map((category, index) => (
                  <CategoryBar key={category.name} category={category} index={index} />
                ))}
              </div>
            </div>
          </ReportSection>

          {/* Findings */}
          <ReportSection title="Findings" number="07">
            {report.findings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-profit-500/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-profit-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-profit-400 font-medium">No adverse findings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {report.findings.map((finding, index) => (
                  <FindingCard key={index} finding={finding} index={index} />
                ))}
              </div>
            )}
          </ReportSection>

          {/* Conclusion & Recommendation */}
          <ReportSection title="Conclusion & Recommendation" number="08">
            <div className="glass-card p-8">
              <div className="text-center mb-8">
                <p className="text-sm text-void-500 mb-4">Recommendation</p>
                <RecommendationBadge recommendation={report.recommendation} />
              </div>

              {report.recommendationNotes && (
                <div className="mb-8 p-4 rounded-lg bg-void-900/50 border border-void-800">
                  <p className="text-sm text-void-400">{report.recommendationNotes}</p>
                </div>
              )}

              <div className="prose prose-invert max-w-none">
                <p className="text-void-300 leading-relaxed">{report.conclusion}</p>
              </div>
            </div>
          </ReportSection>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 text-void-600 text-sm"
          >
            <p>This report is confidential and intended solely for the recipient.</p>
            <p className="mt-1">Generated by Digital Asset Due Diligence Platform</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
