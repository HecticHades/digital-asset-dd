'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateRetentionPolicyAction } from './actions'
import type { RetentionPolicySettings } from '@/lib/retention'

interface RetentionPolicyFormProps {
  initialPolicy: RetentionPolicySettings
}

const RETENTION_OPTIONS = [
  { value: 365, label: '1 year' },
  { value: 730, label: '2 years' },
  { value: 1095, label: '3 years' },
  { value: 1825, label: '5 years' },
  { value: 2555, label: '7 years' },
  { value: 3650, label: '10 years' },
]

export function RetentionPolicyForm({ initialPolicy }: RetentionPolicyFormProps) {
  const [policy, setPolicy] = useState(initialPolicy)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const result = await updateRetentionPolicyAction(policy)

    if (result.success) {
      setMessage({ type: 'success', text: 'Retention policy updated successfully.' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update policy.' })
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Case Retention */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Case Retention Period
          </label>
          <select
            value={policy.caseRetentionDays}
            onChange={(e) => setPolicy({ ...policy, caseRetentionDays: Number(e.target.value) })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {RETENTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            How long to retain completed/archived cases before deletion
          </p>
        </div>

        {/* Client Retention */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Client Data Retention Period
          </label>
          <select
            value={policy.clientRetentionDays}
            onChange={(e) => setPolicy({ ...policy, clientRetentionDays: Number(e.target.value) })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {RETENTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            How long to retain client records after case completion
          </p>
        </div>

        {/* Document Retention */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Document Retention Period
          </label>
          <select
            value={policy.documentRetentionDays}
            onChange={(e) => setPolicy({ ...policy, documentRetentionDays: Number(e.target.value) })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {RETENTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            How long to retain uploaded documents
          </p>
        </div>

        {/* Transaction Retention */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Transaction Retention Period
          </label>
          <select
            value={policy.transactionRetentionDays}
            onChange={(e) => setPolicy({ ...policy, transactionRetentionDays: Number(e.target.value) })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {RETENTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            How long to retain transaction records
          </p>
        </div>

        {/* Audit Log Retention */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Audit Log Retention Period
          </label>
          <select
            value={policy.auditLogRetentionDays}
            onChange={(e) => setPolicy({ ...policy, auditLogRetentionDays: Number(e.target.value) })}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {RETENTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            How long to retain audit logs (recommended: 10 years)
          </p>
        </div>
      </div>

      {/* Auto-archive and Auto-delete toggles */}
      <div className="border-t border-slate-200 pt-6 space-y-4">
        <h3 className="text-sm font-medium text-slate-900">Automation Settings</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Auto-archive cases</p>
            <p className="text-xs text-slate-500">
              Automatically archive completed cases after the retention period
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={policy.autoArchiveEnabled}
              onChange={(e) => setPolicy({ ...policy, autoArchiveEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Auto-delete expired archives</p>
            <p className="text-xs text-slate-500">
              Automatically delete archived cases after their expiration date
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={policy.autoDeleteEnabled}
              onChange={(e) => setPolicy({ ...policy, autoDeleteEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Policy'}
        </Button>
      </div>
    </form>
  )
}
