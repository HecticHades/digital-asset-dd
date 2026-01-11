'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateOrganizationAction } from './actions'
import type { OrganizationSettings } from '@/lib/organization'

interface OrganizationSettingsFormProps {
  initialData: {
    name: string
    logo: string
    settings: OrganizationSettings
  }
}

export function OrganizationSettingsForm({ initialData }: OrganizationSettingsFormProps) {
  const [formData, setFormData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const result = await updateOrganizationAction({
      name: formData.name,
      logo: formData.logo || undefined,
      settings: formData.settings,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Organization settings updated successfully.' })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update settings.' })
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
        <div>
          <Input
            label="Organization Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div>
          <Input
            label="Logo URL"
            value={formData.logo}
            onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
            placeholder="https://example.com/logo.png"
          />
          <p className="mt-1 text-xs text-slate-500">
            Enter a URL for your organization&apos;s logo
          </p>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-medium text-slate-900 mb-4">Display Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Timezone
            </label>
            <select
              value={formData.settings.timezone || 'UTC'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: { ...formData.settings, timezone: e.target.value },
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
              <option value="Asia/Shanghai">Shanghai</option>
              <option value="Asia/Singapore">Singapore</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date Format
            </label>
            <select
              value={formData.settings.dateFormat || 'MM/dd/yyyy'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: { ...formData.settings, dateFormat: e.target.value },
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="MM/dd/yyyy">MM/DD/YYYY</option>
              <option value="dd/MM/yyyy">DD/MM/YYYY</option>
              <option value="yyyy-MM-dd">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Currency
            </label>
            <select
              value={formData.settings.currency || 'USD'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: { ...formData.settings, currency: e.target.value },
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (&euro;)</option>
              <option value="GBP">GBP (&pound;)</option>
              <option value="CHF">CHF</option>
              <option value="JPY">JPY (&yen;)</option>
              <option value="SGD">SGD</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-medium text-slate-900 mb-4">Risk Thresholds</h3>
        <p className="text-xs text-slate-500 mb-4">
          Configure risk score thresholds for automatic risk level assignment
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Input
              type="number"
              label="Low Risk (below)"
              value={formData.settings.riskThresholds?.low || 30}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    riskThresholds: {
                      ...formData.settings.riskThresholds,
                      low: Number(e.target.value),
                      medium: formData.settings.riskThresholds?.medium || 60,
                      high: formData.settings.riskThresholds?.high || 80,
                    },
                  },
                })
              }
              min={0}
              max={100}
            />
          </div>
          <div>
            <Input
              type="number"
              label="Medium Risk (below)"
              value={formData.settings.riskThresholds?.medium || 60}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    riskThresholds: {
                      ...formData.settings.riskThresholds,
                      low: formData.settings.riskThresholds?.low || 30,
                      medium: Number(e.target.value),
                      high: formData.settings.riskThresholds?.high || 80,
                    },
                  },
                })
              }
              min={0}
              max={100}
            />
          </div>
          <div>
            <Input
              type="number"
              label="High Risk (below)"
              value={formData.settings.riskThresholds?.high || 80}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    riskThresholds: {
                      ...formData.settings.riskThresholds,
                      low: formData.settings.riskThresholds?.low || 30,
                      medium: formData.settings.riskThresholds?.medium || 60,
                      high: Number(e.target.value),
                    },
                  },
                })
              }
              min={0}
              max={100}
            />
            <p className="mt-1 text-xs text-slate-500">
              Above this is Critical
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  )
}
