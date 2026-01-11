/**
 * Organization Management
 *
 * Functions for managing organizations (tenants) in the multi-tenant system.
 * Only SUPER_ADMIN users can create/manage organizations.
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ============================================
// Types
// ============================================

export interface OrganizationSettings {
  timezone?: string
  dateFormat?: string
  currency?: string
  riskThresholds?: {
    low: number
    medium: number
    high: number
  }
}

export interface ComplianceTemplateItem {
  id: string
  title: string
  description?: string
  isRequired: boolean
  order: number
}

export interface ComplianceTemplate {
  id: string
  name: string
  description?: string
  items: ComplianceTemplateItem[]
  isDefault: boolean
}

export interface CreateOrganizationInput {
  name: string
  logo?: string
  settings?: OrganizationSettings
}

export interface UpdateOrganizationInput {
  name?: string
  logo?: string
  settings?: OrganizationSettings
  isActive?: boolean
}

export interface OrganizationSummary {
  id: string
  name: string
  logo: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  userCount: number
  clientCount: number
  caseCount: number
}

// ============================================
// Default Compliance Template
// ============================================

export const DEFAULT_COMPLIANCE_TEMPLATE: ComplianceTemplate = {
  id: 'default',
  name: 'Standard Due Diligence',
  description: 'Default compliance checklist for client onboarding',
  isDefault: true,
  items: [
    {
      id: '1',
      title: 'KYC Verification',
      description: 'Verify client identity documents',
      isRequired: true,
      order: 0,
    },
    {
      id: '2',
      title: 'Source of Wealth Documentation',
      description: 'Document and verify source of wealth',
      isRequired: true,
      order: 1,
    },
    {
      id: '3',
      title: 'Source of Funds Verification',
      description: 'Verify the source of funds for digital assets',
      isRequired: true,
      order: 2,
    },
    {
      id: '4',
      title: 'Sanctions Screening',
      description: 'Complete sanctions screening for all wallets',
      isRequired: true,
      order: 3,
    },
    {
      id: '5',
      title: 'Risk Assessment',
      description: 'Complete risk assessment and scoring',
      isRequired: true,
      order: 4,
    },
    {
      id: '6',
      title: 'Transaction Analysis',
      description: 'Analyze transaction history for red flags',
      isRequired: false,
      order: 5,
    },
    {
      id: '7',
      title: 'Adverse Media Check',
      description: 'Check for adverse media mentions',
      isRequired: false,
      order: 6,
    },
  ],
}

// ============================================
// Organization CRUD
// ============================================

/**
 * Create a new organization
 */
export async function createOrganization(
  input: CreateOrganizationInput
): Promise<{ id: string; name: string }> {
  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      logo: input.logo || null,
      settings: (input.settings || {}) as Prisma.InputJsonValue,
      complianceTemplates: [DEFAULT_COMPLIANCE_TEMPLATE] as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      name: true,
    },
  })

  return organization
}

/**
 * Get organization by ID
 */
export async function getOrganization(id: string): Promise<{
  id: string
  name: string
  logo: string | null
  settings: OrganizationSettings
  complianceTemplates: ComplianceTemplate[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
} | null> {
  const org = await prisma.organization.findUnique({
    where: { id },
  })

  if (!org) return null

  return {
    id: org.id,
    name: org.name,
    logo: org.logo,
    settings: org.settings as OrganizationSettings,
    complianceTemplates: org.complianceTemplates as unknown as ComplianceTemplate[],
    isActive: org.isActive,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  }
}

/**
 * Update organization
 */
export async function updateOrganization(
  id: string,
  input: UpdateOrganizationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Prisma.OrganizationUpdateInput = {}

    if (input.name !== undefined) updateData.name = input.name
    if (input.logo !== undefined) updateData.logo = input.logo
    if (input.settings !== undefined) updateData.settings = input.settings as Prisma.InputJsonValue
    if (input.isActive !== undefined) updateData.isActive = input.isActive

    await prisma.organization.update({
      where: { id },
      data: updateData,
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to update organization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update organization',
    }
  }
}

/**
 * List all organizations (for super admin)
 */
export async function listOrganizations(
  pagination: { page: number; limit: number } = { page: 1, limit: 50 }
): Promise<{
  organizations: OrganizationSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        logo: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            clients: true,
            cases: true,
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (pagination.page - 1) * pagination.limit,
      take: pagination.limit,
    }),
    prisma.organization.count(),
  ])

  return {
    organizations: organizations.map(org => ({
      id: org.id,
      name: org.name,
      logo: org.logo,
      isActive: org.isActive,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      userCount: org._count.users,
      clientCount: org._count.clients,
      caseCount: org._count.cases,
    })),
    total,
    page: pagination.page,
    limit: pagination.limit,
    totalPages: Math.ceil(total / pagination.limit),
  }
}

/**
 * Deactivate an organization (soft delete)
 */
export async function deactivateOrganization(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.organization.update({
      where: { id },
      data: { isActive: false },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to deactivate organization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate organization',
    }
  }
}

/**
 * Reactivate an organization
 */
export async function reactivateOrganization(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.organization.update({
      where: { id },
      data: { isActive: true },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to reactivate organization:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reactivate organization',
    }
  }
}

// ============================================
// Compliance Templates
// ============================================

/**
 * Get compliance templates for an organization
 */
export async function getComplianceTemplates(
  organizationId: string
): Promise<ComplianceTemplate[]> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { complianceTemplates: true },
  })

  if (!org) return [DEFAULT_COMPLIANCE_TEMPLATE]

  const templates = org.complianceTemplates as unknown as ComplianceTemplate[]
  return templates.length > 0 ? templates : [DEFAULT_COMPLIANCE_TEMPLATE]
}

/**
 * Update compliance templates for an organization
 */
export async function updateComplianceTemplates(
  organizationId: string,
  templates: ComplianceTemplate[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        complianceTemplates: templates as unknown as Prisma.InputJsonValue,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to update compliance templates:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update compliance templates',
    }
  }
}

/**
 * Add a new compliance template
 */
export async function addComplianceTemplate(
  organizationId: string,
  template: Omit<ComplianceTemplate, 'id'>
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const templates = await getComplianceTemplates(organizationId)

    const newTemplate: ComplianceTemplate = {
      ...template,
      id: `template-${Date.now()}`,
    }

    templates.push(newTemplate)

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        complianceTemplates: templates as unknown as Prisma.InputJsonValue,
      },
    })

    return { success: true, templateId: newTemplate.id }
  } catch (error) {
    console.error('Failed to add compliance template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add compliance template',
    }
  }
}

/**
 * Delete a compliance template
 */
export async function deleteComplianceTemplate(
  organizationId: string,
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const templates = await getComplianceTemplates(organizationId)

    // Cannot delete the default template
    const template = templates.find(t => t.id === templateId)
    if (template?.isDefault) {
      return { success: false, error: 'Cannot delete the default template' }
    }

    const filteredTemplates = templates.filter(t => t.id !== templateId)

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        complianceTemplates: filteredTemplates as unknown as Prisma.InputJsonValue,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Failed to delete compliance template:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete compliance template',
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get organization statistics
 */
export async function getOrganizationStats(organizationId: string): Promise<{
  totalUsers: number
  activeUsers: number
  totalClients: number
  totalCases: number
  pendingCases: number
  completedCases: number
}> {
  const [
    totalUsers,
    activeUsers,
    totalClients,
    totalCases,
    pendingCases,
    completedCases,
  ] = await Promise.all([
    prisma.user.count({ where: { organizationId } }),
    prisma.user.count({ where: { organizationId, isActive: true } }),
    prisma.client.count({ where: { organizationId } }),
    prisma.case.count({ where: { organizationId } }),
    prisma.case.count({
      where: {
        organizationId,
        status: { in: ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW'] },
      },
    }),
    prisma.case.count({
      where: {
        organizationId,
        status: { in: ['COMPLETED', 'APPROVED'] },
      },
    }),
  ])

  return {
    totalUsers,
    activeUsers,
    totalClients,
    totalCases,
    pendingCases,
    completedCases,
  }
}

/**
 * Check if user has super admin privileges
 */
export function isSuperAdmin(role: string): boolean {
  return role === 'SUPER_ADMIN'
}
