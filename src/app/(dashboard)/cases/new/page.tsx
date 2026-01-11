'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { createCase, getClients, getAnalysts } from '../actions'
import { createCaseSchema } from '@/lib/validators/case'

export default function NewCasePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [clients, setClients] = useState<{ id: string; name: string }[]>([])
  const [analysts, setAnalysts] = useState<{ id: string; name: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [clientsResult, analystsResult] = await Promise.all([
          getClients(),
          getAnalysts(),
        ])
        if (clientsResult.success) {
          setClients(clientsResult.data)
        }
        if (analystsResult.success) {
          setAnalysts(analystsResult.data)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setErrors({})
    setServerError(null)

    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      clientId: formData.get('clientId') as string,
      assignedToId: formData.get('assignedToId') as string,
      dueDate: formData.get('dueDate') as string,
    }

    // Client-side validation
    const validated = createCaseSchema.safeParse(data)
    if (!validated.success) {
      const fieldErrors: Record<string, string> = {}
      validated.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message
        }
      })
      setErrors(fieldErrors)
      setIsSubmitting(false)
      return
    }

    // Server action
    const result = await createCase(data)

    if (result.success) {
      router.push('/cases')
    } else {
      setServerError(result.error || 'Failed to create case')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/cases"
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Cases
          </Link>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-slate-500">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/cases"
          className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Cases
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Case</CardTitle>
          <CardDescription>
            Open a new due diligence case for a client.
          </CardDescription>
        </CardHeader>
        <form action={handleSubmit}>
          <CardContent className="space-y-4">
            {serverError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
                {serverError}
              </div>
            )}

            {clients.length === 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
                No clients found. <Link href="/clients/new" className="underline">Create a client</Link> first.
              </div>
            )}

            <Input
              name="title"
              label="Case Title"
              placeholder="Initial Due Diligence - John Smith"
              error={errors.title}
              required
            />

            <Select
              name="clientId"
              label="Client"
              placeholder="Select a client"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.clientId}
              required
              defaultValue=""
            />

            <Select
              name="assignedToId"
              label="Assign To"
              placeholder="Select an analyst (optional)"
              options={[
                { value: '', label: 'Unassigned' },
                ...analysts.map((a) => ({ value: a.id, label: a.name })),
              ]}
              defaultValue=""
            />

            <Input
              name="dueDate"
              type="date"
              label="Due Date"
              error={errors.dueDate}
            />

            <div className="w-full">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Additional context or notes about this case..."
                className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Link href="/cases">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isSubmitting || clients.length === 0}>
              {isSubmitting ? 'Creating...' : 'Create Case'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
