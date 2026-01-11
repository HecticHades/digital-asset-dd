import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 30

export const portalAuthOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'portal-credentials',
      name: 'Client Portal',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const portalUser = await prisma.clientPortalUser.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: {
            client: {
              include: {
                organization: true
              }
            }
          },
        })

        if (!portalUser) {
          throw new Error('Invalid email or password')
        }

        if (!portalUser.isActive) {
          throw new Error('Account is deactivated. Contact your analyst.')
        }

        // Check if account is locked
        if (portalUser.lockedUntil && portalUser.lockedUntil > new Date()) {
          const minutesRemaining = Math.ceil(
            (portalUser.lockedUntil.getTime() - Date.now()) / 1000 / 60
          )
          throw new Error(
            `Account is locked. Try again in ${minutesRemaining} minutes.`
          )
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, portalUser.passwordHash)

        if (!isValid) {
          // Increment failed attempts
          const newFailedAttempts = portalUser.failedAttempts + 1
          const updates: { failedAttempts: number; lockedUntil?: Date } = {
            failedAttempts: newFailedAttempts,
          }

          // Lock account if max attempts reached
          if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
            updates.lockedUntil = new Date(
              Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
            )
          }

          await prisma.clientPortalUser.update({
            where: { id: portalUser.id },
            data: updates,
          })

          if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
            throw new Error(
              `Account locked due to too many failed attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
            )
          }

          throw new Error('Invalid email or password')
        }

        // Reset failed attempts and update last login on successful login
        await prisma.clientPortalUser.update({
          where: { id: portalUser.id },
          data: {
            failedAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        })

        return {
          id: portalUser.id,
          email: portalUser.email,
          name: portalUser.name,
          clientId: portalUser.clientId,
          clientName: portalUser.client.name,
          organizationId: portalUser.client.organizationId,
          organizationName: portalUser.client.organization.name,
          isPortalUser: true,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.clientId = user.clientId
        token.clientName = user.clientName
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
        token.isPortalUser = user.isPortalUser
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.clientId = token.clientId as string
        session.user.clientName = token.clientName as string
        session.user.organizationId = token.organizationId as string
        session.user.organizationName = token.organizationName as string
        session.user.isPortalUser = token.isPortalUser as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/portal/login',
    error: '/portal/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// Helper to create a portal user account for a client
export async function createPortalUser(
  clientId: string,
  email: string,
  name: string,
  password: string
) {
  const passwordHash = await bcrypt.hash(password, 12)

  return prisma.clientPortalUser.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash,
      clientId,
    },
  })
}

// Helper to generate a random password for invitations
export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
