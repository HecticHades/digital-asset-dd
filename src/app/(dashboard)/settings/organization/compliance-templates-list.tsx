'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { deleteComplianceTemplateAction } from './actions'
import type { ComplianceTemplate } from '@/lib/organization'

interface ComplianceTemplatesListProps {
  initialTemplates: ComplianceTemplate[]
}

export function ComplianceTemplatesList({ initialTemplates }: ComplianceTemplatesListProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return
    }

    setDeletingId(templateId)
    const result = await deleteComplianceTemplateAction(templateId)

    if (result.success) {
      setTemplates(templates.filter(t => t.id !== templateId))
    } else {
      alert(result.error || 'Failed to delete template')
    }

    setDeletingId(null)
  }

  const toggleExpand = (templateId: string) => {
    setExpandedId(expandedId === templateId ? null : templateId)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Define compliance checklist templates that can be used when creating new cases.
      </p>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          No compliance templates defined.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Required Items</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <>
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleExpand(template.id)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <ChevronIcon
                            className={`h-4 w-4 transition-transform ${
                              expandedId === template.id ? 'rotate-90' : ''
                            }`}
                          />
                        </button>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-slate-500">{template.description}</div>
                          )}
                        </div>
                        {template.isDefault && (
                          <Badge variant="info">Default</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{template.items.length}</TableCell>
                    <TableCell>
                      {template.items.filter(i => i.isRequired).length}
                    </TableCell>
                    <TableCell>
                      {!template.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          disabled={deletingId === template.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deletingId === template.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedId === template.id && (
                    <TableRow key={`${template.id}-expanded`}>
                      <TableCell colSpan={4} className="bg-slate-50">
                        <div className="p-4">
                          <h4 className="text-sm font-medium text-slate-900 mb-3">
                            Checklist Items
                          </h4>
                          <div className="space-y-2">
                            {template.items.map((item, index) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 p-2 bg-white rounded border border-slate-200"
                              >
                                <span className="text-xs text-slate-400 mt-0.5">
                                  {index + 1}.
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{item.title}</span>
                                    {item.isRequired && (
                                      <Badge variant="warning">Required</Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-500">
          To add or modify templates, contact your system administrator.
        </p>
      </div>
    </div>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
