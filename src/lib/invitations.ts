import crypto from 'crypto'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const INVITATION_EXPIRY_DAYS = 7

export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createInvitation(
  email: string,
  role: UserRole,
  organizationId: string,
  invitedById: string
): Promise<{
  success: boolean
  error?: string
  token?: string
}> {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (existingUser) {
    return { success: false, error: 'A user with this email already exists.' }
  }

  // Check for existing pending invitation
  const existingInvitation = await prisma.userInvitation.findFirst({
    where: {
      email: email.toLowerCase(),
      organizationId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (existingInvitation) {
    return {
      success: false,
      error: 'An active invitation already exists for this email.',
    }
  }

  // Create invitation
  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.userInvitation.create({
    data: {
      email: email.toLowerCase(),
      token,
      role,
      organizationId,
      invitedById,
      expiresAt,
    },
  })

  return { success: true, token }
}

export async function validateInvitation(token: string): Promise<{
  valid: boolean
  invitation?: {
    id: string
    email: string
    role: UserRole
    organizationId: string
    organizationName: string
  }
  error?: string
}> {
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
    include: { organization: true },
  })

  if (!invitation) {
    return { valid: false, error: 'Invalid invitation link.' }
  }

  if (invitation.usedAt) {
    return { valid: false, error: 'This invitation has already been used.' }
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: 'This invitation has expired. Please request a new one.' }
  }

  // Check if email was already registered
  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
  })

  if (existingUser) {
    return { valid: false, error: 'An account already exists for this email.' }
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organizationId,
      organizationName: invitation.organization.name,
    },
  }
}

export async function acceptInvitation(
  token: string,
  name: string,
  password: string
): Promise<{
  success: boolean
  userId?: string
  error?: string
}> {
  const validation = await validateInvitation(token)

  if (!validation.valid || !validation.invitation) {
    return { success: false, error: validation.error }
  }

  const { email, role, organizationId } = validation.invitation
  const passwordHash = await hashPassword(password)

  // Create user and mark invitation as used
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        organizationId,
      },
    }),
    prisma.userInvitation.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ])

  return { success: true, userId: user.id }
}

export async function resendInvitation(
  invitationId: string,
  organizationId: string
): Promise<{
  success: boolean
  token?: string
  error?: string
}> {
  const invitation = await prisma.userInvitation.findFirst({
    where: {
      id: invitationId,
      organizationId,
    },
  })

  if (!invitation) {
    return { success: false, error: 'Invitation not found.' }
  }

  if (invitation.usedAt) {
    return { success: false, error: 'This invitation has already been used.' }
  }

  // Create new token and extend expiry
  const token = generateInvitationToken()
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.userInvitation.update({
    where: { id: invitationId },
    data: { token, expiresAt },
  })

  return { success: true, token }
}

export async function cancelInvitation(
  invitationId: string,
  organizationId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const invitation = await prisma.userInvitation.findFirst({
    where: {
      id: invitationId,
      organizationId,
    },
  })

  if (!invitation) {
    return { success: false, error: 'Invitation not found.' }
  }

  if (invitation.usedAt) {
    return { success: false, error: 'Cannot cancel a used invitation.' }
  }

  await prisma.userInvitation.delete({
    where: { id: invitationId },
  })

  return { success: true }
}
