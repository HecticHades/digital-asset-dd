import { UserRole } from '@prisma/client'

/**
 * Permission types for different actions in the system
 */
export type Permission =
  // Client permissions
  | 'clients:read'
  | 'clients:create'
  | 'clients:update'
  | 'clients:delete'
  // Case permissions
  | 'cases:read'
  | 'cases:read:all'       // Read all cases vs only assigned
  | 'cases:create'
  | 'cases:update'
  | 'cases:delete'
  | 'cases:assign'          // Assign cases to analysts
  | 'cases:review'          // Review and approve/reject cases
  | 'cases:submit'          // Submit case for review
  // Document permissions
  | 'documents:read'
  | 'documents:upload'
  | 'documents:verify'
  | 'documents:delete'
  // Wallet permissions
  | 'wallets:read'
  | 'wallets:create'
  | 'wallets:verify'
  | 'wallets:delete'
  | 'wallets:screen'
  | 'wallets:sync'
  // Transaction permissions
  | 'transactions:read'
  | 'transactions:import'
  // Findings permissions
  | 'findings:read'
  | 'findings:create'
  | 'findings:update'
  | 'findings:resolve'
  // Checklist permissions
  | 'checklist:read'
  | 'checklist:update'
  // Report permissions
  | 'reports:read'
  | 'reports:generate'
  // Settings permissions
  | 'settings:read'
  | 'settings:write'
  | 'settings:update'
  | 'settings:delete'
  // User management permissions
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  | 'users:invite'
  // Audit log permissions
  | 'audit:read'
  // Organization permissions
  | 'organization:read'
  | 'organization:update'
  // Super admin permissions
  | 'organizations:manage'   // Create/manage multiple organizations (super admin only)
  // Manager-specific
  | 'workload:view'         // View workload dashboard

/**
 * Role-based permission mapping
 *
 * ADMIN: Full access to all features
 * MANAGER: Can manage cases, assign analysts, view workload, but can't approve
 * ANALYST: Can work on assigned cases, import data, analyze
 * COMPLIANCE_OFFICER: Can review cases, approve/reject, view reports
 * AUDITOR: Read-only access to all data
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    // Super admin has full access including multi-org management
    'clients:read', 'clients:create', 'clients:update', 'clients:delete',
    'cases:read', 'cases:read:all', 'cases:create', 'cases:update', 'cases:delete', 'cases:assign', 'cases:review', 'cases:submit',
    'documents:read', 'documents:upload', 'documents:verify', 'documents:delete',
    'wallets:read', 'wallets:create', 'wallets:verify', 'wallets:delete', 'wallets:screen', 'wallets:sync',
    'transactions:read', 'transactions:import',
    'findings:read', 'findings:create', 'findings:update', 'findings:resolve',
    'checklist:read', 'checklist:update',
    'reports:read', 'reports:generate',
    'settings:read', 'settings:write', 'settings:update', 'settings:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:invite',
    'audit:read',
    'organization:read', 'organization:update',
    'organizations:manage',  // Super admin exclusive
    'workload:view',
  ],

  ADMIN: [
    // Admin has full access to everything within their organization
    'clients:read', 'clients:create', 'clients:update', 'clients:delete',
    'cases:read', 'cases:read:all', 'cases:create', 'cases:update', 'cases:delete', 'cases:assign', 'cases:review', 'cases:submit',
    'documents:read', 'documents:upload', 'documents:verify', 'documents:delete',
    'wallets:read', 'wallets:create', 'wallets:verify', 'wallets:delete', 'wallets:screen', 'wallets:sync',
    'transactions:read', 'transactions:import',
    'findings:read', 'findings:create', 'findings:update', 'findings:resolve',
    'checklist:read', 'checklist:update',
    'reports:read', 'reports:generate',
    'settings:read', 'settings:write', 'settings:update', 'settings:delete',
    'users:read', 'users:create', 'users:update', 'users:delete', 'users:invite',
    'audit:read',
    'organization:read', 'organization:update',
    'workload:view',
  ],

  MANAGER: [
    // Manager can oversee all cases, assign analysts, view workload
    'clients:read', 'clients:create', 'clients:update',
    'cases:read', 'cases:read:all', 'cases:create', 'cases:update', 'cases:assign', 'cases:submit',
    'documents:read', 'documents:upload',
    'wallets:read', 'wallets:create', 'wallets:verify', 'wallets:screen', 'wallets:sync',
    'transactions:read', 'transactions:import',
    'findings:read', 'findings:create', 'findings:update',
    'checklist:read', 'checklist:update',
    'reports:read', 'reports:generate',
    'settings:read',
    'users:read',
    'workload:view',
  ],

  ANALYST: [
    // Analyst can work on assigned cases, import data, analyze
    'clients:read', 'clients:create', 'clients:update',
    'cases:read', 'cases:create', 'cases:update', 'cases:submit',
    'documents:read', 'documents:upload',
    'wallets:read', 'wallets:create', 'wallets:verify', 'wallets:screen', 'wallets:sync',
    'transactions:read', 'transactions:import',
    'findings:read', 'findings:create', 'findings:update',
    'checklist:read', 'checklist:update',
    'reports:read', 'reports:generate',
    'settings:read',
  ],

  COMPLIANCE_OFFICER: [
    // Compliance officer can review cases, approve/reject, sign off
    'clients:read',
    'cases:read', 'cases:read:all', 'cases:review',
    'documents:read', 'documents:verify',
    'wallets:read',
    'transactions:read',
    'findings:read', 'findings:resolve',
    'checklist:read',
    'reports:read',
    'settings:read',
  ],

  AUDITOR: [
    // Auditor has read-only access to all data for audit purposes
    'clients:read',
    'cases:read', 'cases:read:all',
    'documents:read',
    'wallets:read',
    'transactions:read',
    'findings:read',
    'checklist:read',
    'reports:read',
    'settings:read',
    'users:read',
    'audit:read',
    'organization:read',
  ],
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole | string | undefined, permission: Permission): boolean {
  if (!role) return false
  const roleKey = role as UserRole
  const permissions = ROLE_PERMISSIONS[roleKey]
  if (!permissions) return false
  return permissions.includes(permission)
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole | string | undefined, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.every(p => hasPermission(role, p))
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole | string | undefined, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.some(p => hasPermission(role, p))
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole | string | undefined): Permission[] {
  if (!role) return []
  const roleKey = role as UserRole
  return ROLE_PERMISSIONS[roleKey] || []
}

/**
 * Route permission mapping - which permissions are required for each route pattern
 */
export interface RoutePermission {
  pattern: RegExp
  permissions: Permission[]
  requireAll?: boolean  // If true, all permissions required. If false/undefined, any permission allows access
}

export const ROUTE_PERMISSIONS: RoutePermission[] = [
  // Dashboard - any authenticated user can access
  { pattern: /^\/dashboard$/, permissions: [] },

  // Clients
  { pattern: /^\/clients$/, permissions: ['clients:read'] },
  { pattern: /^\/clients\/new$/, permissions: ['clients:create'] },
  { pattern: /^\/clients\/[^/]+$/, permissions: ['clients:read'] },
  { pattern: /^\/clients\/[^/]+\/edit$/, permissions: ['clients:update'] },
  { pattern: /^\/clients\/[^/]+\/wallets/, permissions: ['wallets:read'] },
  { pattern: /^\/clients\/[^/]+\/transactions/, permissions: ['transactions:read'] },
  { pattern: /^\/clients\/[^/]+\/documents/, permissions: ['documents:read'] },

  // Cases
  { pattern: /^\/cases$/, permissions: ['cases:read'] },
  { pattern: /^\/cases\/new$/, permissions: ['cases:create'] },
  { pattern: /^\/cases\/review$/, permissions: ['cases:review'] },
  { pattern: /^\/cases\/[^/]+$/, permissions: ['cases:read'] },
  { pattern: /^\/cases\/[^/]+\/edit$/, permissions: ['cases:update'] },

  // Reports
  { pattern: /^\/reports$/, permissions: ['reports:read'] },

  // Settings
  { pattern: /^\/settings$/, permissions: ['settings:read'] },
  { pattern: /^\/settings\/users$/, permissions: ['users:read'] },
  { pattern: /^\/settings\/users\/new$/, permissions: ['users:create'] },
  { pattern: /^\/settings\/users\/invite$/, permissions: ['users:invite'] },
  { pattern: /^\/settings\/audit$/, permissions: ['audit:read'] },
  { pattern: /^\/settings\/organization$/, permissions: ['organization:read'] },
]

/**
 * Check if a role has access to a specific route
 */
export function canAccessRoute(role: UserRole | string, path: string): boolean {
  // Find matching route permission
  const routePermission = ROUTE_PERMISSIONS.find(rp => rp.pattern.test(path))

  // If no specific route permission defined, allow access (for unanticipated routes)
  if (!routePermission) return true

  // If no permissions required for the route, allow access
  if (routePermission.permissions.length === 0) return true

  // Check permissions
  if (routePermission.requireAll) {
    return hasAllPermissions(role, routePermission.permissions)
  }

  return hasAnyPermission(role, routePermission.permissions)
}

/**
 * Role display labels
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  ANALYST: 'Analyst',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  AUDITOR: 'Auditor',
}

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Platform administrator with ability to create and manage multiple organizations',
  ADMIN: 'Full access to all features including user management and organization settings',
  MANAGER: 'Can oversee all cases, assign analysts, and manage workload',
  ANALYST: 'Can conduct investigations on assigned cases, import data, and analyze',
  COMPLIANCE_OFFICER: 'Can review and approve/reject cases, verify documents',
  AUDITOR: 'Read-only access to all data for audit purposes',
}
