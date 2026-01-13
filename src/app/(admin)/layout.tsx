import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/organization'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  // Only super admins can access admin pages
  if (!isSuperAdmin(session.user.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/organizations" className="text-lg font-bold">
                Admin Panel
              </Link>
              <span className="px-2 py-1 bg-amber-500 text-xs font-medium rounded">
                Super Admin
              </span>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/organizations"
                className="text-sm text-slate-300 hover:text-white"
              >
                Organizations
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-slate-300 hover:text-white"
              >
                Back to Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
