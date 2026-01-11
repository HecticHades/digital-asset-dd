'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { archiveCaseAction } from '@/app/(dashboard)/settings/retention/actions'

interface CaseArchiveButtonProps {
  caseId: string
  caseTitle: string
}

export function CaseArchiveButton({ caseId, caseTitle }: CaseArchiveButtonProps) {
  const router = useRouter()
  const [isArchiving, setIsArchiving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleArchive = async () => {
    setIsArchiving(true)
    setError(null)

    const result = await archiveCaseAction(caseId, reason || undefined)

    if (result.success) {
      setShowModal(false)
      router.push('/cases')
      router.refresh()
    } else {
      setError(result.error || 'Failed to archive case')
    }

    setIsArchiving(false)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className="text-amber-600 border-amber-300 hover:bg-amber-50"
      >
        <ArchiveIcon className="h-4 w-4 mr-1" />
        Archive
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Archive Case
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to archive <span className="font-medium">{caseTitle}</span>?
              The case will be moved to the archive and can be restored later from
              Settings &gt; Data Retention.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter a reason for archiving..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                disabled={isArchiving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleArchive}
                disabled={isArchiving}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isArchiving ? 'Archiving...' : 'Archive Case'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  )
}
