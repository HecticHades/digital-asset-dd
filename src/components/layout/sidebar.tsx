'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

// Role-based navigation items
interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  roles?: string[]
  badge?: number | 'live'
}

const navigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Clients',
    href: '/clients',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    name: 'Cases',
    href: '/cases',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Team',
    href: '/manager',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    roles: ['ADMIN', 'MANAGER'],
  },
  {
    name: 'Review',
    href: '/cases/review',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    roles: ['ADMIN', 'COMPLIANCE_OFFICER'],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = session?.user?.role as string | undefined

  const visibleNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return userRole && item.roles.includes(userRole)
  })

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-void-950/80 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto',
          'bg-void-950 border-r border-void-800/50',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-void-800/50">
          <div className="relative w-9 h-9 bg-gradient-to-br from-neon-500 to-signal-500 rounded-lg flex items-center justify-center shadow-glow-sm">
            <svg className="w-5 h-5 text-void-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <span className="text-lg font-display font-bold text-void-100">DADD</span>
            <span className="block text-2xs text-void-500 font-mono tracking-wider">v2.0</span>
          </div>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="ml-auto lg:hidden p-1.5 text-void-400 hover:text-void-200 hover:bg-void-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Status indicator */}
        <div className="px-4 py-3 border-b border-void-800/50">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-void-900/50">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-profit-400" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-profit-400 animate-ping" />
            </div>
            <span className="text-xs text-void-400 font-mono">System Online</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {visibleNavigation.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <motion.li
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-neon-500/10 text-neon-400 border border-neon-500/30'
                        : 'text-void-400 hover:bg-void-800/50 hover:text-void-200 border border-transparent'
                    )}
                  >
                    {/* Active indicator glow */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 rounded-lg bg-neon-500/5"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    <span className={cn(
                      'relative z-10 transition-colors',
                      isActive ? 'text-neon-400' : 'text-void-500 group-hover:text-void-300'
                    )}>
                      {item.icon}
                    </span>
                    <span className="relative z-10">{item.name}</span>

                    {/* Badge */}
                    {item.badge && (
                      <span className={cn(
                        'ml-auto relative z-10 px-2 py-0.5 rounded text-2xs font-mono',
                        item.badge === 'live'
                          ? 'bg-profit-500/20 text-profit-400 border border-profit-500/30'
                          : 'bg-caution-500/20 text-caution-400 border border-caution-500/30'
                      )}>
                        {item.badge === 'live' ? (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-profit-400 animate-pulse" />
                            Live
                          </span>
                        ) : (
                          item.badge
                        )}
                      </span>
                    )}
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-void-800/50">
          <div className="px-3 py-2 rounded-lg bg-void-900/30">
            <p className="text-2xs text-void-600 font-mono">Digital Asset Due Diligence</p>
            <p className="text-2xs text-void-700 font-mono mt-0.5">Enterprise Platform</p>
          </div>
        </div>
      </aside>
    </>
  )
}
