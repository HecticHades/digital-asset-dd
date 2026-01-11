'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { EMAIL_PREFERENCE_LABELS, DIGEST_FREQUENCY_OPTIONS } from '@/lib/validators/notification'

interface EmailPreferences {
  emailEnabled: boolean
  emailCaseAssigned: boolean
  emailDeadlineReminder: boolean
  emailHighRiskFlag: boolean
  digestEnabled: boolean
  digestFrequency: 'DAILY' | 'WEEKLY'
}

const defaultPreferences: EmailPreferences = {
  emailEnabled: true,
  emailCaseAssigned: true,
  emailDeadlineReminder: true,
  emailHighRiskFlag: true,
  digestEnabled: false,
  digestFrequency: 'WEEKLY',
}

export function EmailPreferencesForm() {
  const [preferences, setPreferences] = useState<EmailPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [testSuccess, setTestSuccess] = useState<string | null>(null)

  // Fetch current preferences
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch('/api/email/preferences')
        if (res.ok) {
          const data = await res.json()
          setPreferences({
            emailEnabled: data.emailEnabled,
            emailCaseAssigned: data.emailCaseAssigned,
            emailDeadlineReminder: data.emailDeadlineReminder,
            emailHighRiskFlag: data.emailHighRiskFlag,
            digestEnabled: data.digestEnabled,
            digestFrequency: data.digestFrequency,
          })
        }
      } catch (err) {
        console.error('Error fetching email preferences:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [])

  // Handle toggle change
  const handleToggle = (key: keyof EmailPreferences) => {
    if (key === 'digestFrequency') return // Handle frequency separately
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
    setSuccess(false)
  }

  // Handle frequency change
  const handleFrequencyChange = (frequency: 'DAILY' | 'WEEKLY') => {
    setPreferences(prev => ({
      ...prev,
      digestFrequency: frequency,
    }))
    setSuccess(false)
  }

  // Save preferences
  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/email/preferences', {
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

  const emailPreferenceKeys = Object.keys(EMAIL_PREFERENCE_LABELS) as Array<keyof typeof EMAIL_PREFERENCE_LABELS>

  return (
    <div className="space-y-6">
      {/* Master email toggle */}
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Email Notifications</p>
            <p className="text-sm text-slate-500">Enable or disable all email notifications</p>
          </div>
          <button
            onClick={() => handleToggle('emailEnabled')}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              preferences.emailEnabled ? 'bg-primary-600' : 'bg-slate-200'
            }`}
            role="switch"
            aria-checked={preferences.emailEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                preferences.emailEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Email notification types */}
      {preferences.emailEnabled && (
        <>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Email Types</h3>
            <div className="space-y-4">
              {emailPreferenceKeys.map(key => {
                const { label, description } = EMAIL_PREFERENCE_LABELS[key]
                const prefKey = key as keyof EmailPreferences
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
                      onClick={() => handleToggle(prefKey)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        preferences[prefKey] ? 'bg-primary-600' : 'bg-slate-200'
                      }`}
                      role="switch"
                      aria-checked={preferences[prefKey] as boolean}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          preferences[prefKey] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Digest settings */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Email Digest</h3>
                <p className="text-sm text-slate-500">Receive a summary of your activity</p>
              </div>
              <button
                onClick={() => handleToggle('digestEnabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  preferences.digestEnabled ? 'bg-primary-600' : 'bg-slate-200'
                }`}
                role="switch"
                aria-checked={preferences.digestEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    preferences.digestEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Frequency selector */}
            {preferences.digestEnabled && (
              <div className="ml-0 mt-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Frequency</p>
                <div className="flex gap-3">
                  {DIGEST_FREQUENCY_OPTIONS.map(option => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                        preferences.digestFrequency === option.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="digestFrequency"
                        value={option.value}
                        checked={preferences.digestFrequency === option.value}
                        onChange={() => handleFrequencyChange(option.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {preferences.digestFrequency === 'DAILY'
                    ? 'You will receive a daily summary every morning.'
                    : 'You will receive a weekly summary every Monday morning.'}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">Email preferences saved successfully</p>
        </div>
      )}

      {/* Test email success message */}
      {testSuccess && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-600">{testSuccess}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={async () => {
            setSendingTest(true)
            setError(null)
            setTestSuccess(null)
            try {
              const res = await fetch('/api/email/test', { method: 'POST' })
              const data = await res.json()
              if (res.ok) {
                setTestSuccess(data.message || 'Test email sent successfully!')
                setTimeout(() => setTestSuccess(null), 5000)
              } else {
                setError(data.error || 'Failed to send test email')
              }
            } catch (err) {
              setError('An error occurred while sending test email')
            } finally {
              setSendingTest(false)
            }
          }}
          disabled={sendingTest || !preferences.emailEnabled}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {sendingTest ? 'Sending...' : 'Send Test Email'}
        </button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Email Preferences'}
        </Button>
      </div>
    </div>
  )
}
