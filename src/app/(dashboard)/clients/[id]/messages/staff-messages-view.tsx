'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Message {
  id: string
  content: string
  isRead: boolean
  createdAt: string
  isFromClient: boolean
  senderName: string | null | undefined
}

interface StaffMessagesViewProps {
  clientId: string
  clientName: string
  hasPortalAccess: boolean
  portalUserName: string | null
  messages: Message[]
  currentUserId: string | null
}

export function StaffMessagesView({
  clientId,
  clientName,
  hasPortalAccess,
  portalUserName,
  messages: initialMessages,
  currentUserId,
}: StaffMessagesViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Poll for new messages every 30 seconds
  useEffect(() => {
    const pollMessages = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/messages`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages)
        }
      } catch {
        // Ignore polling errors
      }
    }

    const interval = setInterval(pollMessages, 30000)
    return () => clearInterval(interval)
  }, [clientId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch(`/api/clients/${clientId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Add message to list
      setMessages((prev) => [...prev, data.message])
      setNewMessage('')
      textareaRef.current?.focus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-slate-500">
        <Link href="/clients" className="hover:text-primary-600">
          Clients
        </Link>
        <ChevronRightIcon className="w-4 h-4 mx-2" />
        <Link href={`/clients/${clientId}`} className="hover:text-primary-600">
          {clientName}
        </Link>
        <ChevronRightIcon className="w-4 h-4 mx-2" />
        <span className="text-slate-900">Messages</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages with {clientName}</h1>
          {hasPortalAccess && portalUserName && (
            <p className="text-slate-600 mt-1">
              Client portal user: {portalUserName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasPortalAccess ? (
            <Badge variant="success">Portal Access Enabled</Badge>
          ) : (
            <Badge variant="warning">No Portal Access</Badge>
          )}
        </div>
      </div>

      {!hasPortalAccess ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <NoPortalIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Portal Access Not Configured
              </h3>
              <p className="text-slate-600 mb-4">
                This client does not have portal access. Create a portal account for them to enable secure messaging.
              </p>
              <Link href={`/clients/${clientId}`}>
                <Button>Configure Portal Access</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="h-[calc(100vh-280px)] flex flex-col">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <CardTitle>Conversation</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-slate-600 font-medium text-sm">
                    {portalUserName?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
                <span>{portalUserName || 'Client'}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageIcon className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-center">No messages yet.</p>
                  <p className="text-sm text-center mt-1">
                    Send a message to start the conversation.
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isFromClient={message.isFromClient}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Display */}
            {error && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-slate-200 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                  className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                  disabled={isSending}
                />
                <Button type="submit" disabled={!newMessage.trim() || isSending}>
                  {isSending ? (
                    <Spinner className="w-4 h-4" />
                  ) : (
                    <SendIcon className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  isFromClient,
}: {
  message: Message
  isFromClient: boolean
}) {
  const formattedTime = new Date(message.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isFromClient ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isFromClient
            ? 'bg-slate-100 text-slate-900'
            : 'bg-primary-600 text-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${isFromClient ? 'text-slate-600' : 'text-primary-100'}`}>
            {message.senderName || (isFromClient ? 'Client' : 'You')}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isFromClient ? 'text-slate-500' : 'text-primary-200'}`}>
          {formattedTime}
        </p>
      </div>
    </div>
  )
}

// Icons
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  )
}

function NoPortalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}
