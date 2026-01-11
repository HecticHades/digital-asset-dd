'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createOrganizationAction } from './actions'

export function CreateOrganizationForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [logo, setLogo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createOrganizationAction({
      name,
      logo: logo || undefined,
    })

    if (result.success) {
      setName('')
      setLogo('')
      router.refresh()
    } else {
      setError(result.error || 'Failed to create organization')
    }

    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Organization Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter organization name"
          required
        />

        <Input
          label="Logo URL (optional)"
          value={logo}
          onChange={(e) => setLogo(e.target.value)}
          placeholder="https://example.com/logo.png"
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !name.trim()}>
          {loading ? 'Creating...' : 'Create Organization'}
        </Button>
      </div>
    </form>
  )
}
