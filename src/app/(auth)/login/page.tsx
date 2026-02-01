import { Suspense } from 'react'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-void-950" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-signal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-neon-500 to-signal-500 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-glow animate-pulse">
              <svg
                className="w-8 h-8 text-void-950"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-void-100">
              Digital Asset Due Diligence
            </h1>
            <p className="text-void-400 mt-2">Sign in to your account</p>
          </div>
          <div className="space-y-5">
            <div className="h-12 bg-void-800 rounded-lg shimmer" />
            <div className="h-12 bg-void-800 rounded-lg shimmer" />
            <div className="h-12 bg-void-800 rounded-lg shimmer" />
          </div>
        </div>
      </div>
    </div>
  )
}
