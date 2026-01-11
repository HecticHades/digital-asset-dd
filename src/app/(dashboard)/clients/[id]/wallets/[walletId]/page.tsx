import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/clients" className="hover:text-slate-700">
          Clients
        </Link>
        <span>/</span>
        <Link href={`/clients/${clientId}`} className="hover:text-slate-700">
          {wallet.client.name}
        </Link>
        <span>/</span>
        <span className="text-slate-900">Wallet</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {wallet.label || 'Wallet'}
            </h1>
            <Badge>{BLOCKCHAIN_NAMES[wallet.blockchain]}</Badge>
            {wallet.isVerified ? (
              <Badge variant="success">Verified</Badge>
            ) : (
              <Badge variant="warning">Unverified</Badge>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-sm text-slate-600">
              {wallet.address}
            </span>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700"
              >
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
        <Link href={`/clients/${clientId}`}>
          <Button variant="outline">Back to Client</Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <WalletBalanceCard walletId={walletId} blockchain={wallet.blockchain} />

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.totalTx}</div>
            <p className="text-sm text-slate-500">On-chain Transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.uniqueAssets}</div>
            <p className="text-sm text-slate-500">Unique Assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {stats.firstTx && stats.lastTx ? (
              <>
                <div className="text-lg font-bold text-slate-900">
                  {format(stats.firstTx, 'MMM d, yyyy')}
                </div>
                <p className="text-sm text-slate-500">
                  First transaction · Last: {format(stats.lastTx, 'MMM d, yyyy')}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-900">-</div>
                <p className="text-sm text-slate-500">No transactions yet</p>
              </>
            )}
          </CardContent>
        </Card>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Label</dt>
              <dd className="mt-1 text-sm text-slate-900">{wallet.label || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Blockchain</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {BLOCKCHAIN_NAMES[wallet.blockchain]}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Verified</dt>
              <dd className="mt-1">
                {wallet.isVerified ? (
                  <Badge variant="success">Yes</Badge>
                ) : (
                  <Badge variant="warning">No</Badge>
                )}
              </dd>
            </div>
            {wallet.proofDocument && (
              <div>
                <dt className="text-sm font-medium text-slate-500">Proof Document</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {wallet.proofDocument.originalName}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-slate-500">Added</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {format(wallet.createdAt, 'PPpp')}
              </dd>
            </div>
          </CardContent>
        </Card>

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
      <Card>
        <CardHeader>
          <CardTitle>DEX Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <DEXActivityView
            walletId={wallet.id}
            walletAddress={wallet.address}
            blockchain={wallet.blockchain}
          />
        </CardContent>
      </Card>
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
