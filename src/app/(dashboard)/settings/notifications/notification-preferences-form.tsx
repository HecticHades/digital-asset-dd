'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { NOTIFICATION_PREFERENCE_LABELS } from '@/lib/validators/notification'

interface Preferences {
  caseAssigned: boolean
  caseStatusChanged: boolean
  newRiskFlag: boolean
  deadlineApproaching: boolean
  documentUploaded: boolean
  caseApproved: boolean
  caseRejected: boolean
  commentAdded: boolean
}

const defaultPreferences: Preferences = {
  caseAssigned: true,
  caseStatusChanged: true,
  newRiskFlag: true,
  deadlineApproaching: true,
  documentUploaded: true,
  caseApproved: true,
  caseRejected: true,
  commentAdded: true,
}

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Fetch current preferences
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/notifications/preferences')
        if (res.ok) {
          const data = await res.json()
          setPreferences({
            caseAssigned: data.caseAssigned,
            caseStatusChanged: data.caseStatusChanged,
            newRiskFlag: data.newRiskFlag,
            deadlineApproaching: data.deadlineApproaching,
            documentUploaded: data.documentUploaded,
            caseApproved: data.caseApproved,
            caseRejected: data.caseRejected,
            commentAdded: data.commentAdded,
          })
        }
      } catch (err) {
        console.error('Error fetching preferences:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  // Handle toggle change
  const handleToggle = (key: keyof Preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
    setSuccess(false)
  }

  // Save preferences
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save preferences')
      }
    } catch (err) {
      setError('An error occurred while saving preferences')
    } finally {
      setSaving(false)
    }
  }

  // Enable/Disable all
  const handleEnableAll = () => {
    setPreferences({
      caseAssigned: true,
      caseStatusChanged: true,
      newRiskFlag: true,
      deadlineApproaching: true,
      documentUploaded: true,
      caseApproved: true,
      caseRejected: true,
      commentAdded: true,
    })
    setSuccess(false)
  }

  const handleDisableAll = () => {
    setPreferences({
      caseAssigned: false,
      caseStatusChanged: false,
      newRiskFlag: false,
      deadlineApproaching: false,
      documentUploaded: false,
      caseApproved: false,
      caseRejected: false,
      commentAdded: false,
    })
    setSuccess(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg className="w-6 h-6 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  const preferenceKeys = Object.keys(NOTIFICATION_PREFERENCE_LABELS) as Array<keyof Preferences>

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={handleEnableAll}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Enable all
        </button>
        <span className="text-slate-300">|</span>
        <button
          onClick={handleDisableAll}
          className="text-sm text-slate-600 hover:text-slate-700 font-medium"
        >
          Disable all
        </button>
      </div>

      {/* Preference toggles */}
      <div className="space-y-4">
        {preferenceKeys.map(key => {
          const { label, description } = NOTIFICATION_PREFERENCE_LABELS[key]
          return (
            <div
              key={key}
              className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-sm text-slate-500">{description}</p>
              </div>
              <button
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  preferences[key] ? 'bg-primary-600' : 'bg-slate-200'
                }`}
                role="switch"
                aria-checked={preferences[key]}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    preferences[key] ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">Preferences saved successfully</p>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  )
}
