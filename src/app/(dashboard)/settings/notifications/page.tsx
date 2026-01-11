import { Metadata } from 'next'
import { NotificationPreferencesForm } from './notification-preferences-form'
import { NotificationHistory } from './notification-history'

export const metadata: Metadata = {
  title: 'Notification Settings | Digital Asset DD',
  description: 'Manage your notification preferences',
}

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Notification Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage how and when you receive notifications
        </p>
      </div>

      {/* Preferences Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-900">Notification Preferences</h2>
          <p className="text-sm text-slate-500 mt-1">
            Choose which notifications you want to receive
          </p>
        </div>
        <div className="p-6">
          <NotificationPreferencesForm />
        </div>
      </div>

      {/* Notification History Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-medium text-slate-900">Recent Notifications</h2>
          <p className="text-sm text-slate-500 mt-1">
            View your notification history
          </p>
        </div>
        <div className="p-6">
          <NotificationHistory />
        </div>
      </div>
    </div>
  )
}
