'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

interface ChecklistItem {
  id: string
  title: string
  description: string | null
  isRequired: boolean
  isCompleted: boolean
  notes: string | null
  completedAt: string | null
  completedBy?: {
    id: string
    name: string
  } | null
}

interface ChecklistCompletionStatus {
  total: number
  completed: number
  required: number
  requiredCompleted: number
  percentage: number
  requiredPercentage: number
  isComplete: boolean
  missingRequired: string[]
}

interface ComplianceChecklistProps {
  items: ChecklistItem[]
  caseId: string
  caseStatus: string
  completionStatus: ChecklistCompletionStatus
  onInitialize: () => Promise<{ success: boolean; error?: string }>
  onComplete: (itemId: string, notes?: string) => Promise<{ success: boolean; error?: string }>
  onUncomplete: (itemId: string) => Promise<{ success: boolean; error?: string }>
  onAddItem: (data: { title: string; description?: string; isRequired: boolean }) => Promise<{ success: boolean; error?: string }>
  onDeleteItem: (itemId: string) => Promise<{ success: boolean; error?: string }>
  onSubmitForReview: () => Promise<{ success: boolean; error?: string }>
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" strokeWidth={2} />
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

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

export function ComplianceChecklist({
  items,
  caseId,
  caseStatus,
  completionStatus,
  onInitialize,
  onComplete,
  onUncomplete,
  onAddItem,
  onDeleteItem,
  onSubmitForReview,
}: ComplianceChecklistProps) {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(false)
  const [processingItemId, setProcessingItemId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ title: '', description: '', isRequired: false })
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({})
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const canEdit = !['APPROVED', 'COMPLETED', 'ARCHIVED'].includes(caseStatus)
  const canSubmit = caseStatus === 'IN_PROGRESS' && completionStatus.isComplete

  const handleInitialize = async () => {
    setIsInitializing(true)
    try {
      const result = await onInitialize()
      if (result.success) {
        router.refresh()
      }
    } finally {
      setIsInitializing(false)
    }
  }

  const handleToggleComplete = async (item: ChecklistItem) => {
    if (!canEdit) return

    setProcessingItemId(item.id)
    try {
      if (item.isCompleted) {
        const result = await onUncomplete(item.id)
        if (result.success) {
          router.refresh()
        }
      } else {
        const notes = completionNotes[item.id]
        const result = await onComplete(item.id, notes)
        if (result.success) {
          router.refresh()
          setCompletionNotes((prev) => {
            const next = { ...prev }
            delete next[item.id]
            return next
          })
          setExpandedItemId(null)
        }
      }
    } finally {
      setProcessingItemId(null)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItem.title.trim()) return

    setIsAddingItem(true)
    try {
      const result = await onAddItem({
        title: newItem.title.trim(),
        description: newItem.description.trim() || undefined,
        isRequired: newItem.isRequired,
      })
      if (result.success) {
        setNewItem({ title: '', description: '', isRequired: false })
        setShowAddForm(false)
        router.refresh()
      }
    } finally {
      setIsAddingItem(false)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this checklist item?')) return

    setProcessingItemId(itemId)
    try {
      const result = await onDeleteItem(itemId)
      if (result.success) {
        router.refresh()
      }
    } finally {
      setProcessingItemId(null)
    }
  }

  const handleSubmitForReview = async () => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await onSubmitForReview()
      if (result.success) {
        router.refresh()
      } else {
        setSubmitError(result.error || 'Failed to submit for review')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Empty state - no checklist items
  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
        <svg
          className="mx-auto h-12 w-12 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-slate-900">No checklist items</h3>
        <p className="mt-2 text-sm text-slate-500">
          Initialize the compliance checklist to get started.
        </p>
        {canEdit && (
          <Button className="mt-4" onClick={handleInitialize} disabled={isInitializing}>
            {isInitializing ? 'Initializing...' : 'Initialize Checklist'}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Completion Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Compliance Status</CardTitle>
            {completionStatus.isComplete ? (
              <Badge variant="success">Complete</Badge>
            ) : (
              <Badge variant="warning">Incomplete</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600">Overall Progress</span>
                <span className="font-medium">{completionStatus.percentage}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all duration-300"
                  style={{ width: `${completionStatus.percentage}%` }}
                />
              </div>
            </div>

            {/* Required items progress */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-600">Required Items</span>
                <span className="font-medium">
                  {completionStatus.requiredCompleted} / {completionStatus.required}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    completionStatus.isComplete ? 'bg-green-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${completionStatus.requiredPercentage}%` }}
                />
              </div>
            </div>

            {/* Missing required items */}
            {completionStatus.missingRequired.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">Missing Required Items:</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {completionStatus.missingRequired.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1 h-1 bg-amber-500 rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit for review button */}
            {caseStatus === 'IN_PROGRESS' && (
              <div className="pt-4 border-t border-slate-200">
                {submitError && (
                  <p className="text-sm text-red-600 mb-3">{submitError}</p>
                )}
                <Button
                  className="w-full"
                  onClick={handleSubmitForReview}
                  disabled={!canSubmit || isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                </Button>
                {!completionStatus.isComplete && (
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Complete all required items before submitting
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Checklist Items</CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Add item form */}
          {showAddForm && (
            <form onSubmit={handleAddItem} className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="space-y-3">
                <Input
                  label="Title"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="Enter checklist item title"
                  required
                />
                <Input
                  label="Description (optional)"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Add a description"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newItem.isRequired}
                    onChange={(e) => setNewItem({ ...newItem, isRequired: e.target.checked })}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-slate-700">Required for submission</span>
                </label>
                <div className="flex gap-2 pt-2">
                  <Button type="submit" size="sm" disabled={isAddingItem}>
                    {isAddingItem ? 'Adding...' : 'Add Item'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Items list */}
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className={`border rounded-lg transition-colors ${
                  item.isCompleted ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(item)}
                      disabled={!canEdit || processingItemId === item.id}
                      className={`flex-shrink-0 mt-0.5 ${
                        item.isCompleted ? 'text-green-600' : 'text-slate-300 hover:text-slate-400'
                      } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {processingItemId === item.id ? (
                        <div className="h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      ) : item.isCompleted ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        <CircleIcon className="h-5 w-5" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-medium ${
                            item.isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.isRequired && <Badge variant="default">Required</Badge>}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                      )}
                      {item.isCompleted && item.completedAt && (
                        <p className="mt-2 text-xs text-slate-400">
                          Completed {format(new Date(item.completedAt), 'MMM d, yyyy \'at\' h:mm a')}
                          {item.completedBy && ` by ${item.completedBy.name}`}
                        </p>
                      )}
                      {item.notes && (
                        <p className="mt-2 text-sm text-slate-600 bg-slate-100 p-2 rounded">
                          <span className="font-medium">Notes: </span>
                          {item.notes}
                        </p>
                      )}

                      {/* Notes input for uncompleted items */}
                      {!item.isCompleted && canEdit && expandedItemId === item.id && (
                        <div className="mt-3">
                          <Input
                            label="Completion Notes (optional)"
                            value={completionNotes[item.id] || ''}
                            onChange={(e) =>
                              setCompletionNotes({ ...completionNotes, [item.id]: e.target.value })
                            }
                            placeholder="Add notes about completion"
                          />
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!item.isCompleted && canEdit && (
                        <button
                          onClick={() =>
                            setExpandedItemId(expandedItemId === item.id ? null : item.id)
                          }
                          className="text-xs text-slate-500 hover:text-slate-700"
                        >
                          {expandedItemId === item.id ? 'Hide' : 'Add Notes'}
                        </button>
                      )}
                      {canEdit && !item.isRequired && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={processingItemId === item.id}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Delete item"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
