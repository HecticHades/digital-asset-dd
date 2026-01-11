'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
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
import { DocumentChecklist } from '@/components/documents/document-checklist'
import { AddWalletForm } from '@/components/wallets/add-wallet-form'
import { ExchangeConnections } from '@/components/exchanges/exchange-connections'
import { format } from 'date-fns'
import type { Client, Wallet, Document, Transaction, Case, Blockchain, DocumentType, DocumentStatus, TransactionType, TransactionSource, CaseStatus, RiskLevel } from '@prisma/client'
import { deleteWallet, verifyWallet, getWalletProofDocuments } from './wallets/actions'
import {
  addExchangeConnection,
  removeExchangeConnection,
  syncExchangeConnection,
  testExchangeCredentials,
} from './exchanges/actions'
import type { ExchangeTypeValue } from '@/lib/validators/exchange'

interface DocumentWithVerifier extends Document {
  verifiedBy?: { id: string; name: string; email: string } | null
}

interface DocumentChecklistData {
  items: Array<{
    category: DocumentType
    status: DocumentStatus | null
    isUploaded: boolean
    isVerified: boolean
  }>
  completionPercentage: number
  verifiedCount: number
  totalRequired: number
  missingDocuments: DocumentType[]
  pendingDocuments: DocumentType[]
}

interface ExchangeConnectionData {
  id: string
  exchange: ExchangeTypeValue
  label: string | null
  maskedApiKey: string
  isActive: boolean
  lastSyncAt: Date | null
  lastSyncStatus: string | null
  createdAt: Date
}

interface ClientTabsProps {
  client: Client & {
    wallets: Wallet[]
    documents: DocumentWithVerifier[]
    transactions: Transaction[]
    cases: Case[]
  }
  documentChecklist: DocumentChecklistData
  exchangeConnections: ExchangeConnectionData[]
}

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Documents' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
]

export function ClientTabs({ client, documentChecklist, exchangeConnections }: ClientTabsProps) {
  const router = useRouter()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<DocumentWithVerifier | null>(null)
  const [verifyDocument, setVerifyDocument] = useState<DocumentWithVerifier | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Wallet state
  const [showAddWalletModal, setShowAddWalletModal] = useState(false)
  const [verifyWalletModal, setVerifyWalletModal] = useState<Wallet | null>(null)
  const [deleteWalletModal, setDeleteWalletModal] = useState<Wallet | null>(null)
  const [proofDocuments, setProofDocuments] = useState<Array<{ id: string; originalName: string; category: DocumentType }>>([])
  const [selectedProofDocId, setSelectedProofDocId] = useState('')
  const [walletActionLoading, setWalletActionLoading] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)

  const handleUploadComplete = () => {
    setShowUploadModal(false)
    router.refresh()
  }

  const handleVerify = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!verifyDocument) return

    setIsVerifying(true)
    try {
      const formData = new FormData()
      formData.append('documentId', verifyDocument.id)
      formData.append('status', status)
      formData.append('notes', verificationNotes)

      const response = await fetch('/api/documents/verify', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to verify document')
      }

      setVerifyDocument(null)
      setVerificationNotes('')
      router.refresh()
    } catch (error) {
      console.error('Verification error:', error)
    } finally {
      setIsVerifying(false)
    }
  }

  const filteredDocuments = client.documents.filter((doc) =>
    statusFilter === 'ALL' ? true : doc.status === statusFilter
  )

  // Wallet handlers
  const handleAddWalletSuccess = () => {
    setShowAddWalletModal(false)
    router.refresh()
  }

  const handleOpenVerifyWallet = async (wallet: Wallet) => {
    setWalletError(null)
    setSelectedProofDocId('')
    setVerifyWalletModal(wallet)
    // Fetch available proof documents
    const docs = await getWalletProofDocuments(client.id)
    setProofDocuments(docs)
  }

  const handleVerifyWallet = async () => {
    if (!verifyWalletModal || !selectedProofDocId) return

    setWalletActionLoading(true)
    setWalletError(null)

    try {
      const result = await verifyWallet({
        walletId: verifyWalletModal.id,
        proofDocumentId: selectedProofDocId,
      })

      if (!result.success) {
        setWalletError(result.error || 'Failed to verify wallet')
        return
      }

      setVerifyWalletModal(null)
      setSelectedProofDocId('')
      router.refresh()
    } catch (error) {
      console.error('Error verifying wallet:', error)
      setWalletError('An unexpected error occurred')
    } finally {
      setWalletActionLoading(false)
    }
  }

  const handleDeleteWallet = async () => {
    if (!deleteWalletModal) return

    setWalletActionLoading(true)
    setWalletError(null)

    try {
      const result = await deleteWallet({
        walletId: deleteWalletModal.id,
      })

      if (!result.success) {
        setWalletError(result.error || 'Failed to delete wallet')
        return
      }

      setDeleteWalletModal(null)
      router.refresh()
    } catch (error) {
      console.error('Error deleting wallet:', error)
      setWalletError('An unexpected error occurred')
    } finally {
      setWalletActionLoading(false)
    }
  }

  return (
    <>
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="wallets">Wallets ({client.wallets.length})</TabsTrigger>
        <TabsTrigger value="exchanges">Exchanges ({exchangeConnections.length})</TabsTrigger>
        <TabsTrigger value="documents">Documents ({client.documents.length})</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="cases">Cases ({client.cases.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <DocumentChecklist {...documentChecklist} />
        </div>
      </TabsContent>

      <TabsContent value="wallets">
        <div className="space-y-4">
          {/* Wallets Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {client.wallets.length} wallet{client.wallets.length !== 1 ? 's' : ''}
            </div>
            <Button onClick={() => setShowAddWalletModal(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Wallet
            </Button>
          </div>

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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.wallets.map((wallet) => (
                    <TableRow key={wallet.id}>
                      <TableCell className="font-mono text-sm">
                        <span title={wallet.address}>{truncateAddress(wallet.address)}</span>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/clients/${client.id}/wallets/${wallet.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View wallet details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                          </Link>
                          {!wallet.isVerified && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenVerifyWallet(wallet)}
                              title="Verify with proof document"
                            >
                              <ShieldCheckIcon className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setWalletError(null)
                              setDeleteWalletModal(wallet)
                            }}
                            title="Delete wallet"
                          >
                            <TrashIcon className="w-4 h-4 text-red-600" />
                          </Button>
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

      <TabsContent value="exchanges">
        <ExchangeConnections
          clientId={client.id}
          connections={exchangeConnections}
          onAddConnection={async (data) => {
            return addExchangeConnection({
              clientId: client.id,
              ...data,
            })
          }}
          onRemoveConnection={async (connectionId) => {
            return removeExchangeConnection({ connectionId })
          }}
          onSyncConnection={async (connectionId) => {
            return syncExchangeConnection({ connectionId })
          }}
          onTestCredentials={async (data) => {
            return testExchangeCredentials(data)
          }}
        />
      </TabsContent>

      <TabsContent value="documents">
        <div className="space-y-4">
          {/* Document Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={STATUS_FILTER_OPTIONS}
                className="w-40"
              />
              <div className="text-sm text-slate-500">
                {filteredDocuments.length} of {client.documents.length} documents
              </div>
            </div>
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
          ) : filteredDocuments.length === 0 ? (
            <EmptyState
              title="No matching documents"
              description={`No documents with status "${statusFilter}". Try changing the filter.`}
              icon={<FilterIcon />}
            />
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified By</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
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
                      <TableCell>
                        {doc.verifiedBy ? (
                          <div className="text-sm">
                            <div className="font-medium text-slate-900">{doc.verifiedBy.name}</div>
                            {doc.verifiedAt && (
                              <div className="text-slate-500 text-xs">
                                {format(new Date(doc.verifiedAt), 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>{format(doc.createdAt, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewDocument(doc)}
                            title="Preview"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          {doc.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setVerifyDocument(doc)
                                setVerificationNotes(doc.notes || '')
                              }}
                              title="Verify"
                            >
                              <CheckIcon className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          <a
                            href={`/api/documents/${doc.id}?download=true`}
                            download
                          >
                            <Button variant="ghost" size="sm" title="Download">
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
                {previewDocument.verifiedBy && (
                  <>
                    <div>
                      <dt className="text-slate-500">Verified By</dt>
                      <dd className="font-medium">{previewDocument.verifiedBy.name}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Verified At</dt>
                      <dd className="font-medium">
                        {previewDocument.verifiedAt
                          ? format(new Date(previewDocument.verifiedAt), 'PPpp')
                          : '-'}
                      </dd>
                    </div>
                  </>
                )}
                {previewDocument.notes && (
                  <div className="col-span-2">
                    <dt className="text-slate-500">Notes</dt>
                    <dd className="font-medium whitespace-pre-wrap">{previewDocument.notes}</dd>
                  </div>
                )}
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

    {/* Document Verification Modal */}
    <Modal
      isOpen={!!verifyDocument}
      onClose={() => {
        setVerifyDocument(null)
        setVerificationNotes('')
      }}
      title="Verify Document"
      size="lg"
    >
      {verifyDocument && (
        <>
          <ModalContent>
            <div className="space-y-4">
              {/* Document Preview */}
              <div className="bg-slate-100 rounded-lg min-h-[300px] flex items-center justify-center">
                {verifyDocument.mimeType.startsWith('image/') ? (
                  <img
                    src={`/api/documents/${verifyDocument.id}?preview=true`}
                    alt={verifyDocument.originalName}
                    className="max-w-full max-h-[400px] object-contain"
                  />
                ) : verifyDocument.mimeType === 'application/pdf' ? (
                  <iframe
                    src={`/api/documents/${verifyDocument.id}?preview=true`}
                    className="w-full h-[400px]"
                    title={verifyDocument.originalName}
                  />
                ) : (
                  <div className="text-center p-8">
                    <FileIcon className="h-16 w-16 text-slate-400 mx-auto" />
                    <p className="mt-4 text-slate-600">Preview not available</p>
                  </div>
                )}
              </div>

              {/* Document Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">File Name</dt>
                  <dd className="font-medium text-slate-900">{verifyDocument.originalName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Category</dt>
                  <dd className="font-medium text-slate-900">
                    {formatDocumentType(verifyDocument.category)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Size</dt>
                  <dd className="font-medium text-slate-900">
                    {formatFileSize(verifyDocument.size)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Uploaded</dt>
                  <dd className="font-medium text-slate-900">
                    {format(new Date(verifyDocument.createdAt), 'PPpp')}
                  </dd>
                </div>
              </div>

              {/* Verification Notes */}
              <div>
                <label
                  htmlFor="verification-notes"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Verification Notes
                </label>
                <textarea
                  id="verification-notes"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add notes about this document (optional)"
                />
              </div>
            </div>
          </ModalContent>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVerifyDocument(null)
                setVerificationNotes('')
              }}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleVerify('REJECTED')}
              disabled={isVerifying}
            >
              {isVerifying ? 'Processing...' : 'Reject'}
            </Button>
            <Button
              onClick={() => handleVerify('VERIFIED')}
              disabled={isVerifying}
            >
              {isVerifying ? 'Processing...' : 'Verify'}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>

    {/* Add Wallet Modal */}
    <Modal
      isOpen={showAddWalletModal}
      onClose={() => setShowAddWalletModal(false)}
      title="Add Wallet"
      size="md"
    >
      <ModalContent>
        <AddWalletForm
          clientId={client.id}
          onSuccess={handleAddWalletSuccess}
          onCancel={() => setShowAddWalletModal(false)}
        />
      </ModalContent>
    </Modal>

    {/* Verify Wallet Modal */}
    <Modal
      isOpen={!!verifyWalletModal}
      onClose={() => {
        setVerifyWalletModal(null)
        setSelectedProofDocId('')
        setWalletError(null)
      }}
      title="Verify Wallet Ownership"
      size="md"
    >
      {verifyWalletModal && (
        <>
          <ModalContent>
            <div className="space-y-4">
              {walletError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{walletError}</p>
                </div>
              )}

              {/* Wallet Details */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Address</span>
                  <span className="text-sm font-mono">{truncateAddress(verifyWalletModal.address)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Blockchain</span>
                  <Badge>{formatBlockchain(verifyWalletModal.blockchain)}</Badge>
                </div>
                {verifyWalletModal.label && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Label</span>
                    <span className="text-sm">{verifyWalletModal.label}</span>
                  </div>
                )}
              </div>

              {/* Proof Document Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Proof Document
                </label>
                {proofDocuments.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-700">
                      No verified documents available. Please upload and verify a document first
                      (e.g., signed message, exchange statement showing address).
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedProofDocId}
                    onChange={(e) => setSelectedProofDocId(e.target.value)}
                    options={[
                      { value: '', label: 'Select a document...' },
                      ...proofDocuments.map((doc) => ({
                        value: doc.id,
                        label: `${doc.originalName} (${formatDocumentType(doc.category)})`,
                      })),
                    ]}
                  />
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Link a verified document that proves ownership of this wallet address
                  (e.g., signed message, exchange withdrawal confirmation, or wallet screenshot).
                </p>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVerifyWalletModal(null)
                setSelectedProofDocId('')
                setWalletError(null)
              }}
              disabled={walletActionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyWallet}
              disabled={walletActionLoading || !selectedProofDocId}
            >
              {walletActionLoading ? 'Verifying...' : 'Verify Wallet'}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>

    {/* Delete Wallet Modal */}
    <Modal
      isOpen={!!deleteWalletModal}
      onClose={() => {
        setDeleteWalletModal(null)
        setWalletError(null)
      }}
      title="Delete Wallet"
      size="sm"
    >
      {deleteWalletModal && (
        <>
          <ModalContent>
            <div className="space-y-4">
              {walletError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{walletError}</p>
                </div>
              )}

              <p className="text-slate-600">
                Are you sure you want to delete this wallet? This action cannot be undone.
              </p>

              {/* Wallet Details */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Address</span>
                  <span className="text-sm font-mono">{truncateAddress(deleteWalletModal.address)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Blockchain</span>
                  <Badge>{formatBlockchain(deleteWalletModal.blockchain)}</Badge>
                </div>
                {deleteWalletModal.label && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Label</span>
                    <span className="text-sm">{deleteWalletModal.label}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-sm text-amber-700">
                  Any transactions linked to this wallet will no longer be associated with it.
                </p>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteWalletModal(null)
                setWalletError(null)
              }}
              disabled={walletActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteWallet}
              disabled={walletActionLoading}
            >
              {walletActionLoading ? 'Deleting...' : 'Delete Wallet'}
            </Button>
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

function FilterIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
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

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
