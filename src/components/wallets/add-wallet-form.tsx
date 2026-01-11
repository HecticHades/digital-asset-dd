'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Blockchain } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { createWallet } from '@/app/(dashboard)/clients/[id]/wallets/actions'
import {
  validateAddress,
  getAddressError,
  BLOCKCHAIN_LABELS,
} from '@/lib/validators/wallet'

interface AddWalletFormProps {
  clientId: string
  onSuccess?: () => void
  onCancel?: () => void
}

const BLOCKCHAIN_OPTIONS = Object.entries(BLOCKCHAIN_LABELS).map(([value, label]) => ({
  value,
  label,
}))

export function AddWalletForm({ clientId, onSuccess, onCancel }: AddWalletFormProps) {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [blockchain, setBlockchain] = useState<Blockchain | ''>('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAddress(value)

    // Clear address error when user types
    if (fieldErrors.address) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.address
        return next
      })
    }
  }

  const handleBlockchainChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Blockchain | ''
    setBlockchain(value)

    // Clear blockchain error when user selects
    if (fieldErrors.blockchain) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next.blockchain
        return next
      })
    }

    // Validate address format if already entered
    if (address && value) {
      if (!validateAddress(address, value)) {
        setFieldErrors((prev) => ({
          ...prev,
          address: getAddressError(value),
        }))
      } else {
        setFieldErrors((prev) => {
          const next = { ...prev }
          delete next.address
          return next
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    // Client-side validation
    const errors: Record<string, string> = {}

    if (!address.trim()) {
      errors.address = 'Wallet address is required'
    }

    if (!blockchain) {
      errors.blockchain = 'Please select a blockchain'
    }

    if (address && blockchain && !validateAddress(address, blockchain)) {
      errors.address = getAddressError(blockchain)
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createWallet({
        address: address.trim(),
        blockchain: blockchain as Blockchain,
        label: label.trim() || undefined,
        clientId,
      })

      if (!result.success) {
        setError(result.error || 'Failed to add wallet')
        return
      }

      router.refresh()
      onSuccess?.()
    } catch (err) {
      console.error('Error adding wallet:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Select
        label="Blockchain"
        value={blockchain}
        onChange={handleBlockchainChange}
        options={[
          { value: '', label: 'Select blockchain...' },
          ...BLOCKCHAIN_OPTIONS,
        ]}
        error={fieldErrors.blockchain}
        required
      />

      <Input
        label="Wallet Address"
        value={address}
        onChange={handleAddressChange}
        placeholder={blockchain === 'BITCOIN'
          ? 'bc1q... or 1... or 3...'
          : blockchain === 'SOLANA'
          ? 'Base58 address'
          : '0x...'}
        error={fieldErrors.address}
        required
      />

      <Input
        label="Label (optional)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g., Main Trading Wallet"
        hint="A descriptive name to identify this wallet"
      />

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding Wallet...' : 'Add Wallet'}
        </Button>
      </div>
    </form>
  )
}
