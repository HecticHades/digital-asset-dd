import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getOrganization, getOrganizationStats } from '@/lib/organization'
import { OrganizationSettingsForm } from './organization-settings-form'
import { ComplianceTemplatesList } from './compliance-templates-list'

export default async function OrganizationSettingsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.organizationId) {
    redirect('/login')
  }

  // Only admins can access organization settings
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard')
  }

  const [organization, stats] = await Promise.all([
    getOrganization(session.user.organizationId),
    getOrganizationStats(session.user.organizationId),
  ])

  if (!organization) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Organization Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your organization&apos;s profile and configuration.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.activeUsers}</div>
            <p className="text-sm text-slate-500">Active Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.totalClients}</div>
            <p className="text-sm text-slate-500">Total Clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.pendingCases}</div>
            <p className="text-sm text-slate-500">Pending Cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-900">{stats.completedCases}</div>
            <p className="text-sm text-slate-500">Completed Cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <OrganizationSettingsForm
            initialData={{
              name: organization.name,
              logo: organization.logo || '',
              settings: organization.settings,
            }}
          />
        </CardContent>
      </Card>

      {/* Compliance Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <ComplianceTemplatesList
            initialTemplates={organization.complianceTemplates}
          />
        </CardContent>
      </Card>
    </div>
  )
}
