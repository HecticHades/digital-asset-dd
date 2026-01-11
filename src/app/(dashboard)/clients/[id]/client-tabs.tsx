'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Modal, ModalContent, ModalFooter } from '@/components/ui/modal'
import { DocumentUpload } from '@/components/uploads/document-upload'
import { format } from 'date-fns'
import type { Client, Wallet, Document, Transaction, Case, Blockchain, DocumentType, DocumentStatus, TransactionType, TransactionSource, CaseStatus, RiskLevel } from '@prisma/client'

interface ClientTabsProps {
  client: Client & {
    wallets: Wallet[]
    documents: Document[]
    transactions: Transaction[]
    cases: Case[]
  }
}

export function ClientTabs({ client }: ClientTabsProps) {
  const router = useRouter()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)

  const handleUploadComplete = () => {
    setShowUploadModal(false)
    router.refresh()
  }

  return (
    <>
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="wallets">Wallets ({client.wallets.length})</TabsTrigger>
        <TabsTrigger value="documents">Documents ({client.documents.length})</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="cases">Cases ({client.cases.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-slate-500">Phone</dt>
              <dd className="mt-1 text-sm text-slate-900">{client.phone || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Address</dt>
              <dd className="mt-1 text-sm text-slate-900">{client.address || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Notes</dt>
              <dd className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{client.notes || '-'}</dd>
            </div>
            <div className="pt-4 border-t border-slate-200">
              <dt className="text-sm font-medium text-slate-500">Created</dt>
              <dd className="mt-1 text-sm text-slate-900">{format(client.createdAt, 'PPpp')}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-slate-900">{format(client.updatedAt, 'PPpp')}</dd>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="wallets">
        {client.wallets.length === 0 ? (
          <EmptyState
            title="No wallets"
            description="Add a wallet to track this client's on-chain activity."
            icon={<WalletIcon />}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Blockchain</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.wallets.map((wallet) => (
                  <TableRow key={wallet.id}>
                    <TableCell className="font-mono text-sm">
                      {truncateAddress(wallet.address)}
                    </TableCell>
                    <TableCell>
                      <Badge>{formatBlockchain(wallet.blockchain)}</Badge>
                    </TableCell>
                    <TableCell>{wallet.label || '-'}</TableCell>
                    <TableCell>
                      {wallet.isVerified ? (
                        <Badge variant="success">Verified</Badge>
                      ) : (
                        <Badge variant="warning">Unverified</Badge>
                      )}
                    </TableCell>
                    <TableCell>{format(wallet.createdAt, 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="documents">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowUploadModal(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
          {client.documents.length === 0 ? (
            <EmptyState
              title="No documents"
              description="Upload documents to verify this client's identity and source of funds."
              icon={<DocumentIcon />}
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileTypeIcon mimeType={doc.mimeType} />
                          <span className="font-medium">{doc.originalName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDocumentType(doc.category)}</TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatFileSize(doc.size)}
                      </TableCell>
                      <TableCell>{format(doc.createdAt, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewDocument(doc)}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <a
                            href={`/api/documents/${doc.id}?download=true`}
                            download
                          >
                            <Button variant="ghost" size="sm">
                              <DownloadIcon className="w-4 h-4" />
                            </Button>
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </TabsContent>

      <TabsContent value="transactions">
        {client.transactions.length === 0 ? (
          <EmptyState
            title="No transactions"
            description="Import CEX data or fetch on-chain transactions to analyze this client's activity."
            icon={<TransactionIcon />}
          />
        ) : (
          <div className="space-y-4">
            {/* Quick Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">{client.transactions.length}</div>
                  <p className="text-sm text-slate-500">Total Transactions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">
                    {new Set(client.transactions.map(t => t.asset)).size}
                  </div>
                  <p className="text-sm text-slate-500">Unique Assets</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-slate-900">
                    {new Set(client.transactions.filter(t => t.exchange).map(t => t.exchange)).size || '-'}
                  </div>
                  <p className="text-sm text-slate-500">Exchanges</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions Preview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Transactions</CardTitle>
                <Link href={`/clients/${client.id}/transactions`}>
                  <Button variant="outline" size="sm">
                    View All Transactions
                  </Button>
                </Link>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.transactions.slice(0, 10).map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{format(tx.timestamp, 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <TransactionTypeBadge type={tx.type} />
                      </TableCell>
                      <TableCell className="font-medium">{tx.asset}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(tx.amount.toString())}
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{formatSource(tx.source)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {client.transactions.length > 10 && (
                <div className="p-4 text-center border-t border-slate-200">
                  <Link href={`/clients/${client.id}/transactions`} className="text-sm text-primary-600 hover:text-primary-700">
                    View all {client.transactions.length} transactions with filters and sorting
                  </Link>
                </div>
              )}
            </Card>
          </div>
        )}
      </TabsContent>

      <TabsContent value="cases">
        {client.cases.length === 0 ? (
          <EmptyState
            title="No cases"
            description="Create a case to start the due diligence investigation for this client."
            icon={<CaseIcon />}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.title}</TableCell>
                    <TableCell>
                      <StatusBadge status={caseItem.status} />
                    </TableCell>
                    <TableCell>
                      <RiskLevelBadge level={caseItem.riskLevel} />
                    </TableCell>
                    <TableCell>{format(caseItem.createdAt, 'MMM d, yyyy')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </TabsContent>
    </Tabs>

    {/* Upload Document Modal */}
    <Modal
      isOpen={showUploadModal}
      onClose={() => setShowUploadModal(false)}
      title="Upload Document"
      size="lg"
    >
      <ModalContent>
        <DocumentUpload
          clientId={client.id}
          onUploadComplete={handleUploadComplete}
          onCancel={() => setShowUploadModal(false)}
        />
      </ModalContent>
    </Modal>

    {/* Document Preview Modal */}
    <Modal
      isOpen={!!previewDocument}
      onClose={() => setPreviewDocument(null)}
      title={previewDocument?.originalName || 'Document Preview'}
      size="xl"
    >
      {previewDocument && (
        <>
          <ModalContent className="p-0">
            <div className="bg-slate-100 min-h-[400px] flex items-center justify-center">
              {previewDocument.mimeType.startsWith('image/') ? (
                <img
                  src={`/api/documents/${previewDocument.id}?preview=true`}
                  alt={previewDocument.originalName}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              ) : previewDocument.mimeType === 'application/pdf' ? (
                <iframe
                  src={`/api/documents/${previewDocument.id}?preview=true`}
                  className="w-full h-[60vh]"
                  title={previewDocument.originalName}
                />
              ) : (
                <div className="text-center p-8">
                  <FileIcon className="h-16 w-16 text-slate-400 mx-auto" />
                  <p className="mt-4 text-slate-600">Preview not available</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Category</dt>
                  <dd className="font-medium">{formatDocumentType(previewDocument.category)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd><DocumentStatusBadge status={previewDocument.status} /></dd>
                </div>
                <div>
                  <dt className="text-slate-500">Size</dt>
                  <dd className="font-medium">{formatFileSize(previewDocument.size)}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Uploaded</dt>
                  <dd className="font-medium">{format(previewDocument.createdAt, 'PPpp')}</dd>
                </div>
              </dl>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button variant="outline" onClick={() => setPreviewDocument(null)}>
              Close
            </Button>
            <a href={`/api/documents/${previewDocument.id}?download=true`} download>
              <Button>
                <DownloadIcon className="w-4 h-4 mr-2" />
                Download
              </Button>
            </a>
          </ModalFooter>
        </>
      )}
    </Modal>
    </>
  )
}

// Helper components
function EmptyState({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
      <div className="mx-auto h-12 w-12 text-slate-400">{icon}</div>
      <h3 className="mt-4 text-lg font-medium text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  )
}

function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const variants: Record<DocumentStatus, 'default' | 'success' | 'error' | 'warning'> = {
    PENDING: 'warning',
    VERIFIED: 'success',
    REJECTED: 'error',
  }
  return <Badge variant={variants[status]}>{status}</Badge>
}

function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const variants: Record<TransactionType, 'default' | 'success' | 'error' | 'info' | 'warning'> = {
    BUY: 'success',
    SELL: 'error',
    DEPOSIT: 'info',
    WITHDRAWAL: 'warning',
    TRANSFER: 'default',
    SWAP: 'info',
    STAKE: 'success',
    UNSTAKE: 'warning',
    REWARD: 'success',
    FEE: 'default',
    OTHER: 'default',
  }
  return <Badge variant={variants[type]}>{type}</Badge>
}

function RiskLevelBadge({ level }: { level: RiskLevel }) {
  const variants: Record<RiskLevel, 'default' | 'success' | 'error' | 'warning'> = {
    LOW: 'success',
    MEDIUM: 'warning',
    HIGH: 'error',
    CRITICAL: 'error',
    UNASSESSED: 'default',
  }
  return <Badge variant={variants[level]}>{level}</Badge>
}

// Helper functions
function truncateAddress(address: string): string {
  if (address.length <= 13) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatBlockchain(blockchain: Blockchain): string {
  const names: Record<Blockchain, string> = {
    ETHEREUM: 'ETH',
    BITCOIN: 'BTC',
    POLYGON: 'MATIC',
    ARBITRUM: 'ARB',
    OPTIMISM: 'OP',
    BSC: 'BNB',
    AVALANCHE: 'AVAX',
    SOLANA: 'SOL',
    OTHER: 'Other',
  }
  return names[blockchain]
}

function formatDocumentType(type: DocumentType): string {
  const names: Record<DocumentType, string> = {
    ID: 'ID Document',
    PROOF_OF_ADDRESS: 'Proof of Address',
    TAX_RETURNS: 'Tax Returns',
    BANK_STATEMENTS: 'Bank Statements',
    SOURCE_OF_WEALTH: 'Source of Wealth',
    SOURCE_OF_FUNDS: 'Source of Funds',
    EXCHANGE_STATEMENTS: 'Exchange Statements',
    WALLET_PROOF: 'Wallet Proof',
    OTHER: 'Other',
  }
  return names[type]
}

function formatSource(source: TransactionSource): string {
  const names: Record<TransactionSource, string> = {
    CEX_IMPORT: 'CEX',
    ON_CHAIN: 'On-chain',
    API_SYNC: 'API',
    MANUAL: 'Manual',
  }
  return names[source]
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount)
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
  if (num >= 1) return num.toFixed(4)
  return num.toFixed(8)
}

// Icons
function WalletIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function TransactionIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function CaseIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === 'application/pdf') {
    return (
      <div className="w-8 h-8 flex items-center justify-center bg-red-100 rounded">
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }
  if (mimeType.startsWith('image/')) {
    return (
      <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    )
  }
  return (
    <div className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded">
      <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
