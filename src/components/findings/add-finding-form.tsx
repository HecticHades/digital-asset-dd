'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  SEVERITY_LABELS,
  CATEGORY_LABELS,
  type FindingSeverity,
  type FindingCategory,
} from '@/lib/validators/finding'

interface AddFindingFormProps {
  caseId: string
  onSubmit: (data: {
    title: string
    description?: string
    severity: FindingSeverity
    category: FindingCategory
    caseId: string
  }) => Promise<{ success: boolean; error?: string }>
  onCancel: () => void
}

const severityOptions = Object.entries(SEVERITY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function AddFindingForm({ caseId, onSubmit, onCancel }: AddFindingFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<FindingSeverity>('MEDIUM')
  const [category, setCategory] = useState<FindingCategory>('OTHER')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        severity,
        category,
        caseId,
      })

      if (!result.success) {
        setError(result.error || 'Failed to add finding')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Brief description of the risk flag"
        required
        error={error && !title.trim() ? 'Title is required' : undefined}
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide additional details about this finding..."
          rows={3}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as FindingSeverity)}
          options={severityOptions}
        />

        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as FindingCategory)}
          options={categoryOptions}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Finding'}
        </Button>
      </div>
    </form>
  )
}
