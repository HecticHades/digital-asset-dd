import { Suspense } from 'react'
import { PortalLoginForm } from './portal-login-form'

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <PortalLoginForm />
    </Suspense>
  )
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-8">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-primary-600 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Client Portal
            </h1>
            <p className="text-slate-600 mt-2">Loading...</p>
          </div>
          <div className="space-y-6">
            <div className="h-10 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 bg-slate-200 rounded animate-pulse" />
            <div className="h-10 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
