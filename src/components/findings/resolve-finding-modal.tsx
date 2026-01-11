'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { SEVERITY_LABELS, CATEGORY_LABELS, type FindingSeverity, type FindingCategory } from '@/lib/validators/finding'

interface FindingData {
  id: string
  title: string
  description: string | null
  severity: string
  category: string
  isResolved: boolean
  resolution: string | null
}

interface ResolveFindingModalProps {
  finding: FindingData
  isOpen: boolean
  onClose: () => void
  onResolve: (id: string, resolution: string) => Promise<{ success: boolean; error?: string }>
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-200'
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'LOW':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'INFO':
      return 'bg-slate-100 text-slate-800 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200'
  }
}

export function ResolveFindingModal({ finding, isOpen, onClose, onResolve }: ResolveFindingModalProps) {
  const [resolution, setResolution] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!resolution.trim()) {
      setError('Resolution notes are required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await onResolve(finding.id, resolution.trim())
      if (result.success) {
        setResolution('')
        onClose()
      } else {
        setError(result.error || 'Failed to resolve finding')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setResolution('')
    setError(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Resolve Finding">
      <div className="space-y-4">
        {/* Finding Summary */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="font-medium text-slate-900">{finding.title}</h4>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getSeverityColor(finding.severity)}`}>
              {SEVERITY_LABELS[finding.severity as FindingSeverity] || finding.severity}
            </span>
          </div>
          {finding.description && (
            <p className="text-sm text-slate-600">{finding.description}</p>
          )}
          <div className="text-xs text-slate-500">
            Category: {CATEGORY_LABELS[finding.category as FindingCategory] || finding.category}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Resolution Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how this finding was addressed or why it's no longer a concern..."
              rows={4}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              Provide details about how this risk was mitigated or investigated.
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Resolving...' : 'Resolve Finding'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
