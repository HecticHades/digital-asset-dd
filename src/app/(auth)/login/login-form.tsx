'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError(null)

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setFormError(result.error)
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setFormError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getErrorMessage = (errorCode: string | null): string | null => {
    if (!errorCode) return null
    switch (errorCode) {
      case 'CredentialsSignin':
        return 'Invalid email or password.'
      case 'SessionRequired':
        return 'Please sign in to continue.'
      default:
        return 'An error occurred. Please try again.'
    }
  }

  const displayError = formError || getErrorMessage(error)

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-void-950" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-signal-500/10 rounded-full blur-3xl" />
      </div>
      <div className="absolute inset-0 grid-lines opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="glass-card p-8">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="relative w-14 h-14 mx-auto mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-500 to-signal-500 rounded-xl shadow-glow animate-pulse-slow" />
              <div className="relative w-full h-full bg-gradient-to-br from-neon-500 to-signal-500 rounded-xl flex items-center justify-center">
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
            </div>
            <h1 className="text-2xl font-display font-bold text-void-100">
              Digital Asset Due Diligence
            </h1>
            <p className="text-void-400 mt-2">Sign in to your account</p>
          </motion.div>

          {/* Error message */}
          {displayError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-risk-500/10 border border-risk-500/30 rounded-lg"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-risk-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-risk-400">{displayError}</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-void-300 mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
                className="input-dark"
              />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-void-300 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                className="input-dark"
              />
            </div>

            {/* Remember me & forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-void-600 bg-void-800 text-neon-500 focus:ring-neon-500/50 focus:ring-offset-0"
                />
                <span className="text-sm text-void-400">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-neon-400 hover:text-neon-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 relative overflow-hidden group"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <>
                  <span className="relative z-10">Sign in</span>
                  <svg
                    className="w-4 h-4 ml-2 relative z-10 inline transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-void-500">
            Need an account?{' '}
            <span className="text-void-400">
              Contact your administrator for an invitation.
            </span>
          </p>
        </div>

        {/* Security badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center justify-center gap-2 text-xs text-void-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Protected by enterprise-grade security</span>
        </motion.div>
      </motion.div>
    </div>
  )
}
