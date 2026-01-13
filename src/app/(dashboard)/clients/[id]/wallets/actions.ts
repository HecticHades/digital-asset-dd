'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import {
  createWalletSchema,
  verifyWalletSchema,
  deleteWalletSchema,
  type CreateWalletInput,
  type VerifyWalletInput,
  type DeleteWalletInput,
} from '@/lib/validators/wallet'

export async function createWallet(input: CreateWalletInput) {
  const user = await requireAuth()

  const result = createWalletSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0].message,
    }
  }

  const { address, blockchain, label, clientId } = result.data

  try {
    // Check if client exists and belongs to the organization
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        organizationId: user.organizationId,
      },
    })

    if (!client) {
      return {
        success: false,
        error: 'Client not found',
      }
    }

    // Check if wallet already exists for this address + blockchain combination
    const existingWallet = await prisma.wallet.findUnique({
      where: {
        address_blockchain: {
          address: address.toLowerCase(),
          blockchain,
        },
      },
    })

    if (existingWallet) {
      return {
        success: false,
        error: 'A wallet with this address and blockchain already exists',
      }
    }

    // Create the wallet
    const wallet = await prisma.wallet.create({
      data: {
        address: address.toLowerCase(),
        blockchain,
        label: label || null,
        organizationId: user.organizationId,
        clientId,
      },
    })

    revalidatePath(`/clients/${clientId}`)

    return {
      success: true,
      wallet,
    }
  } catch (error) {
    console.error('Error creating wallet:', error)
    return {
      success: false,
      error: 'Failed to create wallet. Please try again.',
    }
  }
}

export async function verifyWallet(input: VerifyWalletInput) {
  const user = await requireAuth()

  const result = verifyWalletSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0].message,
    }
  }

  const { walletId, proofDocumentId } = result.data

  try {
    // Get the wallet and verify it belongs to the organization
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        organizationId: user.organizationId,
      },
    })

    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found',
      }
    }

    // Verify the document exists, belongs to the same client, and is of type WALLET_PROOF
    const document = await prisma.document.findFirst({
      where: {
        id: proofDocumentId,
        clientId: wallet.clientId,
        organizationId: user.organizationId,
      },
    })

    if (!document) {
      return {
        success: false,
        error: 'Proof document not found or does not belong to this client',
      }
    }

    // Update the wallet with verification
    const updatedWallet = await prisma.wallet.update({
      where: { id: walletId },
      data: {
        isVerified: true,
        proofDocumentId,
      },
    })

    revalidatePath(`/clients/${wallet.clientId}`)

    return {
      success: true,
      wallet: updatedWallet,
    }
  } catch (error) {
    console.error('Error verifying wallet:', error)
    return {
      success: false,
      error: 'Failed to verify wallet. Please try again.',
    }
  }
}

export async function deleteWallet(input: DeleteWalletInput) {
  const user = await requireAuth()

  const result = deleteWalletSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false,
      error: result.error.errors[0].message,
    }
  }

  const { walletId } = result.data

  try {
    // Get the wallet to find the client ID for revalidation
    const wallet = await prisma.wallet.findFirst({
      where: {
        id: walletId,
        organizationId: user.organizationId,
      },
    })

    if (!wallet) {
      return {
        success: false,
        error: 'Wallet not found',
      }
    }

    // Delete the wallet
    await prisma.wallet.delete({
      where: { id: walletId },
    })

    revalidatePath(`/clients/${wallet.clientId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Error deleting wallet:', error)
    return {
      success: false,
      error: 'Failed to delete wallet. Please try again.',
    }
  }
}

export async function getWalletProofDocuments(clientId: string) {
  const user = await requireAuth()

  try {
    const documents = await prisma.document.findMany({
      where: {
        clientId,
        organizationId: user.organizationId,
        status: 'VERIFIED',
      },
      select: {
        id: true,
        originalName: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return documents
  } catch (error) {
    console.error('Error fetching proof documents:', error)
    return []
  }
}
