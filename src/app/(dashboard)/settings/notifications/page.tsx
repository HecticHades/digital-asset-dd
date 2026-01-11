import { Metadata } from 'next'
import { NotificationPreferencesForm } from './notification-preferences-form'
import { EmailPreferencesForm } from './email-preferences-form'
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

      {/* In-App Notifications Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h2 className="text-lg font-medium text-slate-900">In-App Notifications</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Choose which notifications appear in the notification bell
          </p>
        </div>
        <div className="p-6">
          <NotificationPreferencesForm />
        </div>
      </div>

      {/* Email Notifications Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-lg font-medium text-slate-900">Email Notifications</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Configure email alerts and digest summaries
          </p>
        </div>
        <div className="p-6">
          <EmailPreferencesForm />
        </div>
      </div>

      {/* Notification History Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-medium text-slate-900">Recent Notifications</h2>
          </div>
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
