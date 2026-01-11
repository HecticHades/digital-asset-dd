'use server'

import { prisma } from '@/lib/db'
import { createClientSchema, type CreateClientInput } from '@/lib/validators/client'
import { revalidatePath } from 'next/cache'

// TODO: Get actual user/org from session
const TEMP_ORG_ID = 'temp-org-id'

export async function createClient(data: CreateClientInput) {
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
        organizationId: TEMP_ORG_ID,
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
  try {
    const clients = await prisma.client.findMany({
      where: {
        organizationId: TEMP_ORG_ID,
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
