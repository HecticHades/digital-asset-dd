import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { WalletTransactionTimeline } from '@/components/wallets/wallet-transaction-timeline'
import { getAddressExplorerUrl } from '@/lib/blockchain'
import { format } from 'date-fns'
import type { Blockchain } from '@prisma/client'
import { WalletBalanceCard } from './wallet-balance-card'
import { WalletRiskFlagsWrapper } from './wallet-risk-flags-wrapper'
import { DEXActivityView } from '@/components/dex/dex-activity-view'

export const dynamic = 'force-dynamic'

interface WalletPageProps {
  params: Promise<{
    id: string
    walletId: string
  }>
}

const BLOCKCHAIN_NAMES: Record<Blockchain, string> = {
  ETHEREUM: 'Ethereum',
  BITCOIN: 'Bitcoin',
  POLYGON: 'Polygon',
  ARBITRUM: 'Arbitrum',
  OPTIMISM: 'Optimism',
  BSC: 'BNB Smart Chain',
  AVALANCHE: 'Avalanche',
  SOLANA: 'Solana',
  OTHER: 'Other',
}

const BLOCKCHAIN_COLORS: Record<Blockchain, { bg: string; text: string; border: string }> = {
  ETHEREUM: { bg: 'bg-signal-500/10', text: 'text-signal-400', border: 'border-signal-500/30' },
  BITCOIN: { bg: 'bg-caution-500/10', text: 'text-caution-400', border: 'border-caution-500/30' },
  POLYGON: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  ARBITRUM: { bg: 'bg-signal-500/10', text: 'text-signal-400', border: 'border-signal-500/30' },
  OPTIMISM: { bg: 'bg-risk-500/10', text: 'text-risk-400', border: 'border-risk-500/30' },
  BSC: { bg: 'bg-caution-500/10', text: 'text-caution-400', border: 'border-caution-500/30' },
  AVALANCHE: { bg: 'bg-risk-500/10', text: 'text-risk-400', border: 'border-risk-500/30' },
  SOLANA: { bg: 'bg-neon-500/10', text: 'text-neon-400', border: 'border-neon-500/30' },
  OTHER: { bg: 'bg-void-700', text: 'text-void-300', border: 'border-void-600' },
}

export default async function WalletPage({ params }: WalletPageProps) {
  const { id: clientId, walletId } = await params

  const wallet = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: {
      client: true,
      proofDocument: true,
      transactions: {
        where: { source: 'ON_CHAIN' },
        orderBy: { timestamp: 'desc' },
      },
      findings: {
        orderBy: [
          { isResolved: 'asc' },
          { severity: 'asc' },
          { createdAt: 'desc' },
        ],
      },
    },
  })

  if (!wallet || wallet.clientId !== clientId) {
    notFound()
  }

  const explorerUrl = getAddressExplorerUrl(wallet.address, wallet.blockchain)
  const blockchainColors = BLOCKCHAIN_COLORS[wallet.blockchain]

  // Calculate transaction stats
  const stats = {
    totalTx: wallet.transactions.length,
    uniqueAssets: new Set(wallet.transactions.map((tx) => tx.asset)).size,
    firstTx: wallet.transactions.length > 0
      ? wallet.transactions[wallet.transactions.length - 1].timestamp
      : null,
    lastTx: wallet.transactions.length > 0
      ? wallet.transactions[0].timestamp
      : null,
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-void-500 font-mono">
        <Link href="/clients" className="hover:text-neon-400 transition-colors">
          Clients
        </Link>
        <span className="text-void-700">/</span>
        <Link href={`/clients/${clientId}`} className="hover:text-neon-400 transition-colors">
          {wallet.client.name}
        </Link>
        <span className="text-void-700">/</span>
        <span className="text-void-300">Wallet</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-void-100">
              {wallet.label || 'Wallet'}
            </h1>
            <span className={`px-2 py-1 rounded text-xs font-mono ${blockchainColors.bg} ${blockchainColors.text} border ${blockchainColors.border}`}>
              {BLOCKCHAIN_NAMES[wallet.blockchain]}
            </span>
            {wallet.isVerified ? (
              <span className="px-2 py-1 rounded text-xs font-mono bg-profit-500/10 text-profit-400 border border-profit-500/30">
                Verified
              </span>
            ) : (
              <span className="px-2 py-1 rounded text-xs font-mono bg-caution-500/10 text-caution-400 border border-caution-500/30">
                Unverified
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-sm text-void-400">
              {wallet.address}
            </span>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neon-400 hover:text-neon-300 transition-colors"
              >
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        <Link
          href={`/clients/${clientId}`}
          className="px-4 py-2 rounded-lg bg-void-800/50 border border-void-700/50 text-void-200 hover:bg-void-700/50 hover:border-void-600 transition-all text-sm font-medium"
        >
          Back to Client
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <WalletBalanceCard walletId={walletId} blockchain={wallet.blockchain} />

        <div className="stat-card">
          <div className="text-2xl font-display font-bold text-void-100">{stats.totalTx}</div>
          <p className="text-sm text-void-400 mt-1">On-chain Transactions</p>
        </div>

        <div className="stat-card">
          <div className="text-2xl font-display font-bold text-void-100">{stats.uniqueAssets}</div>
          <p className="text-sm text-void-400 mt-1">Unique Assets</p>
        </div>

        <div className="stat-card">
          {stats.firstTx && stats.lastTx ? (
            <>
              <div className="text-lg font-display font-bold text-void-100">
                {format(stats.firstTx, 'MMM d, yyyy')}
              </div>
              <p className="text-sm text-void-400 mt-1">
                First tx · Last: {format(stats.lastTx, 'MMM d')}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-display font-bold text-void-500">-</div>
              <p className="text-sm text-void-400 mt-1">No transactions yet</p>
            </>
          )}
        </div>
      </div>

      {/* Risk Flags */}
      <WalletRiskFlagsWrapper
        walletId={wallet.id}
        walletAddress={wallet.address}
        blockchain={wallet.blockchain}
        findings={wallet.findings}
      />

      {/* Wallet Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-base font-display font-semibold text-void-100 mb-4">Wallet Details</h2>
          <div className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-void-500">Label</dt>
              <dd className="mt-1 text-sm text-void-200">{wallet.label || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-void-500">Blockchain</dt>
              <dd className="mt-1 text-sm text-void-200">
                {BLOCKCHAIN_NAMES[wallet.blockchain]}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-void-500">Verified</dt>
              <dd className="mt-1">
                {wallet.isVerified ? (
                  <span className="px-2 py-1 rounded text-xs font-mono bg-profit-500/10 text-profit-400 border border-profit-500/30">
                    Yes
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs font-mono bg-caution-500/10 text-caution-400 border border-caution-500/30">
                    No
                  </span>
                )}
              </dd>
            </div>
            {wallet.proofDocument && (
              <div>
                <dt className="text-sm font-medium text-void-500">Proof Document</dt>
                <dd className="mt-1 text-sm text-void-200">
                  {wallet.proofDocument.originalName}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-void-500">Added</dt>
              <dd className="mt-1 text-sm text-void-200 font-mono">
                {format(wallet.createdAt, 'PPpp')}
              </dd>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <WalletTransactionTimeline
            walletId={wallet.id}
            walletAddress={wallet.address}
            blockchain={wallet.blockchain}
            transactions={wallet.transactions}
          />
        </div>
      </div>

      {/* DEX Activity */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-display font-semibold text-void-100 mb-4">DEX Activity</h2>
        <DEXActivityView
          walletId={wallet.id}
          walletAddress={wallet.address}
          blockchain={wallet.blockchain}
        />
      </div>
    </div>
  )
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}
