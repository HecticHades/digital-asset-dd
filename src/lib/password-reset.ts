import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const RESET_TOKEN_EXPIRY_HOURS = 24

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function createPasswordResetToken(email: string): Promise<{
  success: boolean
  message: string
  token?: string
}> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  })

  if (!user) {
    // Don't reveal whether user exists
    return {
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    }
  }

  if (!user.isActive) {
    return {
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    }
  }

  // Invalidate any existing tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  })

  // Create new token
  const token = generateResetToken()
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  })

  // In a real app, send email here
  // For now, return the token (in production, would send via email)
  return {
    success: true,
    message: 'If an account exists with this email, a reset link has been sent.',
    token, // Only for development - remove in production
  }
}

export async function validateResetToken(token: string): Promise<{
  valid: boolean
  userId?: string
  error?: string
}> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!resetToken) {
    return { valid: false, error: 'Invalid or expired reset link.' }
  }

  if (resetToken.usedAt) {
    return { valid: false, error: 'This reset link has already been used.' }
  }

  if (resetToken.expiresAt < new Date()) {
    return { valid: false, error: 'This reset link has expired. Please request a new one.' }
  }

  if (!resetToken.user.isActive) {
    return { valid: false, error: 'This account has been deactivated.' }
  }

  return { valid: true, userId: resetToken.userId }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{
  success: boolean
  error?: string
}> {
  const validation = await validateResetToken(token)

  if (!validation.valid || !validation.userId) {
    return { success: false, error: validation.error }
  }

  const passwordHash = await hashPassword(newPassword)

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: validation.userId },
      data: {
        passwordHash,
        failedAttempts: 0,
        lockedUntil: null,
      },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ])

  return { success: true }
}
