'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import { NotificationBell } from '@/components/notifications/notification-bell'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const userName = session?.user?.name || 'User'
  const userEmail = session?.user?.email || ''
  const userRole = session?.user?.role || ''
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-void-800/50 bg-void-950/80 backdrop-blur-xl px-4 sm:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="lg:hidden p-2 text-void-400 hover:text-void-200 hover:bg-void-800 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-lg">
        <div className={`relative transition-all duration-200 ${searchFocused ? 'scale-[1.02]' : ''}`}>
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              searchFocused ? 'text-neon-400' : 'text-void-500'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            name="search"
            placeholder="Search clients, cases, wallets..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg transition-all duration-200
              bg-void-900/50 border text-void-200 placeholder-void-500
              focus:outline-none focus:bg-void-900/80
              ${searchFocused
                ? 'border-neon-500/50 shadow-glow-sm'
                : 'border-void-800 hover:border-void-700'
              }`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-2xs font-mono text-void-500 bg-void-800 rounded border border-void-700">
              ⌘
            </kbd>
            <kbd className="px-1.5 py-0.5 text-2xs font-mono text-void-500 bg-void-800 rounded border border-void-700">
              K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Quick actions */}
        <div className="hidden md:flex items-center gap-2">
          <button
            aria-label="Help"
            className="p-2 text-void-400 hover:text-void-200 hover:bg-void-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* Separator */}
        <div className="hidden sm:block w-px h-6 bg-void-800" />

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-label="User menu"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-3 p-1.5 rounded-lg hover:bg-void-800/50 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-neon-500/20 to-signal-500/20 rounded-lg flex items-center justify-center border border-neon-500/30">
              <span className="text-sm font-semibold text-neon-400">{userInitials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <span className="block text-sm font-medium text-void-200">{userName}</span>
              <span className="block text-2xs text-void-500">{formatRole(userRole)}</span>
            </div>
            <svg
              className={`hidden sm:block w-4 h-4 text-void-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 bg-void-900 rounded-xl border border-void-700/50 shadow-xl overflow-hidden"
              >
                {/* User info */}
                <div className="px-4 py-3 border-b border-void-800">
                  <p className="text-sm font-medium text-void-100">{userName}</p>
                  <p className="text-xs text-void-500 mt-0.5">{userEmail}</p>
                  {userRole && (
                    <span className="inline-block mt-2 px-2 py-0.5 text-2xs font-medium rounded bg-neon-500/10 text-neon-400 border border-neon-500/30">
                      {formatRole(userRole)}
                    </span>
                  )}
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <Link
                    href="/settings/profile"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-void-300 hover:bg-void-800 hover:text-void-100 transition-colors"
                  >
                    <svg className="w-4 h-4 text-void-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Your Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-void-300 hover:bg-void-800 hover:text-void-100 transition-colors"
                  >
                    <svg className="w-4 h-4 text-void-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                  <Link
                    href="/settings/api-keys"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-void-300 hover:bg-void-800 hover:text-void-100 transition-colors"
                  >
                    <svg className="w-4 h-4 text-void-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    API Keys
                  </Link>
                </div>

                {/* Sign out */}
                <div className="border-t border-void-800 py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      signOut({ callbackUrl: '/login' })
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-risk-400 hover:bg-risk-500/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
