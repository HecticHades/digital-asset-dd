'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DocumentStatus, DocumentType } from '@prisma/client'

interface DocumentChecklistItem {
  category: DocumentType
  status: DocumentStatus | null
  isUploaded: boolean
  isVerified: boolean
}

interface DocumentChecklistProps {
  items: DocumentChecklistItem[]
  completionPercentage: number
  verifiedCount: number
  totalRequired: number
  missingDocuments: DocumentType[]
  pendingDocuments: DocumentType[]
}

export function DocumentChecklist({
  items,
  completionPercentage,
  verifiedCount,
  totalRequired,
  missingDocuments,
  pendingDocuments,
}: DocumentChecklistProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Required Documents</CardTitle>
            <CardDescription>
              {verifiedCount} of {totalRequired} documents verified
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-void-100">{completionPercentage}%</div>
            <CompletionRing percentage={completionPercentage} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <ChecklistItemRow key={item.category} item={item} />
        ))}

        {missingDocuments.length > 0 && (
          <div className="mt-4 p-3 bg-caution-500/10 border border-caution-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <WarningIcon className="w-5 h-5 text-caution-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-caution-400">Missing Required Documents</p>
                <p className="text-sm text-caution-300 mt-1">
                  {missingDocuments.map(formatDocumentType).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {pendingDocuments.length > 0 && missingDocuments.length === 0 && (
          <div className="mt-4 p-3 bg-signal-500/10 border border-signal-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <InfoIcon className="w-5 h-5 text-signal-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-signal-400">Documents Pending Verification</p>
                <p className="text-sm text-signal-300 mt-1">
                  {pendingDocuments.map(formatDocumentType).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {completionPercentage === 100 && (
          <div className="mt-4 p-3 bg-profit-500/10 border border-profit-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircleIcon className="w-5 h-5 text-profit-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-profit-400">All Required Documents Verified</p>
                <p className="text-sm text-profit-300 mt-1">
                  The client has provided and verified all required documentation.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChecklistItemRow({ item }: { item: DocumentChecklistItem }) {
  return (
    <div className="flex items-center justify-between p-3 bg-void-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        <StatusIcon status={item.status} isUploaded={item.isUploaded} />
        <span className="text-sm font-medium text-void-200">
          {formatDocumentType(item.category)}
        </span>
      </div>
      <ChecklistStatusBadge status={item.status} isUploaded={item.isUploaded} />
    </div>
  )
}

function StatusIcon({ status, isUploaded }: { status: DocumentStatus | null; isUploaded: boolean }) {
  if (!isUploaded) {
    return <EmptyCircleIcon className="w-5 h-5 text-void-500" />
  }
  if (status === 'VERIFIED') {
    return <CheckCircleIcon className="w-5 h-5 text-profit-400" />
  }
  if (status === 'REJECTED') {
    return <XCircleIcon className="w-5 h-5 text-risk-400" />
  }
  return <ClockIcon className="w-5 h-5 text-caution-400" />
}

function ChecklistStatusBadge({
  status,
  isUploaded,
}: {
  status: DocumentStatus | null
  isUploaded: boolean
}) {
  if (!isUploaded) {
    return <Badge variant="default">Missing</Badge>
  }
  if (status === 'VERIFIED') {
    return <Badge variant="success">Verified</Badge>
  }
  if (status === 'REJECTED') {
    return <Badge variant="error">Rejected</Badge>
  }
  return <Badge variant="warning">Pending</Badge>
}

function CompletionRing({ percentage }: { percentage: number }) {
  const circumference = 2 * Math.PI * 18
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 44 44">
      <circle
        cx="22"
        cy="22"
        r="18"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        className="text-void-700"
      />
      <circle
        cx="22"
        cy="22"
        r="18"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className={percentage === 100 ? 'text-profit-400' : 'text-neon-400'}
      />
    </svg>
  )
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

// Icons
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function EmptyCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" strokeWidth={2} />
    </svg>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}
