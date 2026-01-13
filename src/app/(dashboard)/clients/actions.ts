'use server'

import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { createClientSchema, type CreateClientInput } from '@/lib/validators/client'
import { revalidatePath } from 'next/cache'

export async function createClient(data: CreateClientInput) {
  const user = await requireAuth()

  const validated = createClientSchema.safeParse(data)

  if (!validated.success) {
    return {
      success: false,
      error: validated.error.errors[0]?.message || 'Validation failed',
    }
  }

  try {
    const client = await prisma.client.create({
      data: {
        name: validated.data.name,
        email: validated.data.email || null,
        phone: validated.data.phone || null,
        address: validated.data.address || null,
        notes: validated.data.notes || null,
        organizationId: user.organizationId,
      },
    })

    revalidatePath('/clients')

    return {
      success: true,
      data: client,
    }
  } catch (error) {
    console.error('Failed to create client:', error)
    return {
      success: false,
      error: 'Failed to create client. Please try again.',
    }
  }
}

export async function getClients() {
  const user = await requireAuth()

  try {
    const clients = await prisma.client.findMany({
      where: {
        organizationId: user.organizationId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, data: clients }
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    return { success: false, error: 'Failed to fetch clients', data: [] }
  }
}
