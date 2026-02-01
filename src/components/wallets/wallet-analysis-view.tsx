'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

type NetworkType = 'ethereum' | 'bitcoin' | 'polygon' | 'arbitrum' | 'optimism' | 'bsc' | 'solana'
type RiskLevel = 'clear' | 'low' | 'medium' | 'high' | 'critical'

interface WalletBalance {
  asset: string
  symbol: string
  balance: number
  usdValue: number
  change24h?: number
}

interface AddressLabel {
  label: string
  type: 'exchange' | 'defi' | 'contract' | 'mixer' | 'sanctioned' | 'whale' | 'unknown'
  confidence: number
}

interface RiskFlag {
  id: string
  category: string
  severity: RiskLevel
  title: string
  description: string
  detectedAt: Date
  evidence?: string
}

interface CounterpartyAddress {
  address: string
  label?: AddressLabel
  totalVolume: number
  transactionCount: number
  lastInteraction: Date
  riskLevel: RiskLevel
}

interface WalletData {
  address: string
  network: NetworkType
  label?: string
  firstSeen: Date
  lastActive: Date
  totalReceived: number
  totalSent: number
  transactionCount: number
  balances: WalletBalance[]
  riskFlags: RiskFlag[]
  counterparties: CounterpartyAddress[]
  riskScore: number
  riskLevel: RiskLevel
}

interface WalletAnalysisViewProps {
  wallet: WalletData
  onAddressClick?: (address: string) => void
  onFlagClick?: (flag: RiskFlag) => void
}

// Network configuration
const networkConfig: Record<NetworkType, { name: string; color: string; icon: string }> = {
  ethereum: { name: 'Ethereum', color: 'text-signal-400', icon: 'ETH' },
  bitcoin: { name: 'Bitcoin', color: 'text-caution-400', icon: 'BTC' },
  polygon: { name: 'Polygon', color: 'text-purple-400', icon: 'MATIC' },
  arbitrum: { name: 'Arbitrum', color: 'text-sky-400', icon: 'ARB' },
  optimism: { name: 'Optimism', color: 'text-risk-400', icon: 'OP' },
  bsc: { name: 'BNB Chain', color: 'text-yellow-400', icon: 'BNB' },
  solana: { name: 'Solana', color: 'text-gradient', icon: 'SOL' },
}

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string; glow?: string }> = {
  clear: { bg: 'bg-profit-500/10', text: 'text-profit-400', border: 'border-profit-500/30' },
  low: { bg: 'bg-profit-500/10', text: 'text-profit-400', border: 'border-profit-500/30' },
  medium: { bg: 'bg-caution-500/10', text: 'text-caution-400', border: 'border-caution-500/30' },
  high: { bg: 'bg-risk-500/10', text: 'text-risk-400', border: 'border-risk-500/30' },
  critical: { bg: 'bg-risk-500/20', text: 'text-risk-500', border: 'border-risk-500/50', glow: 'shadow-glow-risk' },
}

const labelTypeConfig: Record<AddressLabel['type'], { color: string; icon: React.ReactNode }> = {
  exchange: {
    color: 'text-signal-400 bg-signal-500/10 border-signal-500/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  defi: {
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  contract: {
    color: 'text-neon-400 bg-neon-500/10 border-neon-500/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  mixer: {
    color: 'text-risk-400 bg-risk-500/10 border-risk-500/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  sanctioned: {
    color: 'text-risk-500 bg-risk-500/20 border-risk-500/50',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  whale: {
    color: 'text-caution-400 bg-caution-500/10 border-caution-500/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  unknown: {
    color: 'text-void-400 bg-void-700/50 border-void-600/50',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
}

// Format large numbers
function formatValue(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
  return `$${value.toFixed(2)}`
}

// Truncate address
function truncateAddress(address: string, start = 8, end = 6): string {
  if (address.length <= start + end) return address
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

// Wallet header with address and risk score
function WalletHeader({ wallet }: { wallet: WalletData }) {
  const network = networkConfig[wallet.network]
  const risk = riskColors[wallet.riskLevel]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className={`px-2 py-1 rounded text-xs font-mono font-semibold ${network.color} bg-void-800`}>
              {network.icon}
            </span>
            <span className="text-sm text-void-400">{network.name}</span>
            {wallet.label && (
              <span className="px-2 py-0.5 rounded bg-neon-500/10 text-neon-400 text-xs border border-neon-500/30">
                {wallet.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <code className="text-xl lg:text-2xl font-mono text-void-100 tracking-tight">
              {truncateAddress(wallet.address, 12, 10)}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(wallet.address)}
              className="p-1.5 rounded hover:bg-void-800 transition-colors text-void-500 hover:text-void-300"
              title="Copy address"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <a
              href={`https://etherscan.io/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-void-800 transition-colors text-void-500 hover:text-void-300"
              title="View on explorer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-void-400">
            <span>First seen: <span className="text-void-300">{format(wallet.firstSeen, 'MMM d, yyyy')}</span></span>
            <span className="text-void-600">|</span>
            <span>Last active: <span className="text-void-300">{format(wallet.lastActive, 'MMM d, yyyy')}</span></span>
            <span className="text-void-600">|</span>
            <span>{wallet.transactionCount.toLocaleString()} transactions</span>
          </div>
        </div>

        {/* Risk score gauge */}
        <div className={`flex items-center gap-4 p-4 rounded-xl ${risk.bg} border ${risk.border} ${risk.glow || ''}`}>
          <div className="relative w-16 h-16">
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
                animate={{ strokeDashoffset: 100 - wallet.riskScore }}
                transition={{ duration: 1, ease: 'easeOut' }}
                strokeLinecap="round"
                className={risk.text}
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold font-mono ${risk.text}`}>
              {wallet.riskScore}
            </span>
          </div>
          <div>
            <p className="text-xs text-void-400 uppercase tracking-wider">Risk Score</p>
            <p className={`text-lg font-semibold uppercase ${risk.text}`}>{wallet.riskLevel}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Balance card
function BalanceCard({ balance, index }: { balance: WalletBalance; index: number }) {
  const isPositive = (balance.change24h || 0) >= 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="data-panel"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-void-300">{balance.asset}</span>
        <span className="text-xs font-mono text-void-500">{balance.symbol}</span>
      </div>
      <p className="text-xl font-mono font-semibold text-void-100">
        {balance.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-sm text-void-400">{formatValue(balance.usdValue)}</span>
        {balance.change24h !== undefined && (
          <span className={`text-xs font-mono ${isPositive ? 'text-profit-400' : 'text-risk-400'}`}>
            {isPositive ? '+' : ''}{balance.change24h.toFixed(2)}%
          </span>
        )}
      </div>
    </motion.div>
  )
}

// Risk flag item
function RiskFlagItem({ flag, index, onClick }: { flag: RiskFlag; index: number; onClick?: () => void }) {
  const colors = riskColors[flag.severity]

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg ${colors.bg} border ${colors.border} hover:opacity-80 transition-all`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded ${colors.bg} ${colors.text}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${colors.text}`}>{flag.title}</span>
            <span className={`text-2xs px-2 py-0.5 rounded uppercase ${colors.bg} ${colors.text} border ${colors.border}`}>
              {flag.severity}
            </span>
          </div>
          <p className="text-sm text-void-400">{flag.description}</p>
          <p className="text-xs text-void-500 mt-2 font-mono">
            {flag.category} • Detected {format(flag.detectedAt, 'MMM d, yyyy')}
          </p>
        </div>
      </div>
    </motion.button>
  )
}

// Counterparty address row
function CounterpartyRow({
  counterparty,
  index,
  onClick,
}: {
  counterparty: CounterpartyAddress
  index: number
  onClick?: () => void
}) {
  const risk = riskColors[counterparty.riskLevel]
  const labelConfig = counterparty.label ? labelTypeConfig[counterparty.label.type] : null

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-lg hover:bg-void-800/50 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div className={`w-2 h-2 rounded-full ${risk.text.replace('text-', 'bg-')}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-void-200 group-hover:text-neon-400 transition-colors">
              {truncateAddress(counterparty.address)}
            </code>
            {labelConfig && (
              <span className={`inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded border ${labelConfig.color}`}>
                {labelConfig.icon}
                {counterparty.label?.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-void-500">
            <span>{counterparty.transactionCount} txns</span>
            <span>•</span>
            <span>{formatValue(counterparty.totalVolume)} volume</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-void-400">Last interaction</p>
          <p className="text-xs font-mono text-void-300">
            {format(counterparty.lastInteraction, 'MMM d')}
          </p>
        </div>
      </div>
    </motion.button>
  )
}

// Volume stats
function VolumeStats({ wallet }: { wallet: WalletData }) {
  const totalBalance = wallet.balances.reduce((sum, b) => sum + b.usdValue, 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[
        { label: 'Total Balance', value: formatValue(totalBalance), color: 'text-void-100' },
        { label: 'Total Received', value: formatValue(wallet.totalReceived), color: 'text-profit-400' },
        { label: 'Total Sent', value: formatValue(wallet.totalSent), color: 'text-risk-400' },
        { label: 'Net Flow', value: formatValue(wallet.totalReceived - wallet.totalSent), color: wallet.totalReceived >= wallet.totalSent ? 'text-profit-400' : 'text-risk-400' },
      ].map((stat, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
          className="stat-card"
        >
          <p className="text-xs text-void-400 uppercase tracking-wider mb-2">{stat.label}</p>
          <p className={`text-2xl font-mono font-bold ${stat.color}`}>{stat.value}</p>
        </motion.div>
      ))}
    </div>
  )
}

export function WalletAnalysisView({ wallet, onAddressClick, onFlagClick }: WalletAnalysisViewProps) {
  const [activeTab, setActiveTab] = useState<'balances' | 'counterparties' | 'flags'>('balances')

  const tabs = [
    { id: 'balances' as const, label: 'Balances', count: wallet.balances.length },
    { id: 'counterparties' as const, label: 'Counterparties', count: wallet.counterparties.length },
    { id: 'flags' as const, label: 'Risk Flags', count: wallet.riskFlags.length, alert: wallet.riskFlags.some(f => f.severity === 'critical' || f.severity === 'high') },
  ]

  return (
    <div className="space-y-6">
      <WalletHeader wallet={wallet} />

      <VolumeStats wallet={wallet} />

      {/* Tabbed content */}
      <div className="glass-card">
        {/* Tab navigation */}
        <div className="flex items-center gap-1 p-2 border-b border-void-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-neon-400 bg-neon-500/10'
                  : 'text-void-400 hover:text-void-200 hover:bg-void-800/50'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 text-2xs rounded ${
                  tab.alert ? 'bg-risk-500/20 text-risk-400' : 'bg-void-700 text-void-400'
                }`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-400"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'balances' && (
              <motion.div
                key="balances"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {wallet.balances.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-void-400">No balances found</p>
                  </div>
                ) : (
                  wallet.balances.map((balance, index) => (
                    <BalanceCard key={balance.symbol} balance={balance} index={index} />
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'counterparties' && (
              <motion.div
                key="counterparties"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2 max-h-[500px] overflow-y-auto"
              >
                {wallet.counterparties.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-void-400">No counterparties found</p>
                  </div>
                ) : (
                  wallet.counterparties.map((cp, index) => (
                    <CounterpartyRow
                      key={cp.address}
                      counterparty={cp}
                      index={index}
                      onClick={() => onAddressClick?.(cp.address)}
                    />
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'flags' && (
              <motion.div
                key="flags"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {wallet.riskFlags.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-profit-500/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-profit-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-profit-400 font-medium">No risk flags detected</p>
                    <p className="text-void-500 text-sm mt-1">This wallet appears clean</p>
                  </div>
                ) : (
                  wallet.riskFlags.map((flag, index) => (
                    <RiskFlagItem
                      key={flag.id}
                      flag={flag}
                      index={index}
                      onClick={() => onFlagClick?.(flag)}
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
