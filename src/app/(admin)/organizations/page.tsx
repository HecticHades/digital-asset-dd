import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { isSuperAdmin, listOrganizations } from '@/lib/organization'
import { OrganizationsTable } from './organizations-table'
import { CreateOrganizationForm } from './create-organization-form'

export const dynamic = 'force-dynamic'

export default async function OrganizationsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/login')
  }

  // Only super admins can access this page
  if (!isSuperAdmin(session.user.role)) {
    redirect('/dashboard')
  }

  const result = await listOrganizations({ page: 1, limit: 50 })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organization Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create and manage organizations in the platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{result.total}</div>
            <p className="text-sm text-slate-500">Total Organizations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {result.organizations.filter(o => o.isActive).length}
            </div>
            <p className="text-sm text-slate-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">
              {result.organizations.reduce((sum, o) => sum + o.userCount, 0)}
            </div>
            <p className="text-sm text-slate-500">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">
              {result.organizations.reduce((sum, o) => sum + o.caseCount, 0)}
            </div>
            <p className="text-sm text-slate-500">Total Cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateOrganizationForm />
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationsTable
            initialData={{
              organizations: result.organizations.map(o => ({
                ...o,
                createdAt: o.createdAt.toISOString(),
                updatedAt: o.updatedAt.toISOString(),
              })),
              total: result.total,
              page: result.page,
              limit: result.limit,
              totalPages: result.totalPages,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
