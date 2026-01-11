'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

interface NotificationResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
  hasMore: boolean
}

// Type badge color mapping
const TYPE_BADGES: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }> = {
  CASE_ASSIGNED: { label: 'Assigned', variant: 'info' },
  CASE_STATUS_CHANGED: { label: 'Status', variant: 'default' },
  NEW_RISK_FLAG: { label: 'Risk Flag', variant: 'error' },
  DEADLINE_APPROACHING: { label: 'Deadline', variant: 'warning' },
  DOCUMENT_UPLOADED: { label: 'Document', variant: 'default' },
  CASE_APPROVED: { label: 'Approved', variant: 'success' },
  CASE_REJECTED: { label: 'Rejected', variant: 'error' },
  COMMENT_ADDED: { label: 'Comment', variant: 'default' },
}

export function NotificationHistory() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Fetch notifications
  const fetchNotifications = useCallback(async (append = false) => {
    try {
      setLoading(true)
      const offset = append ? notifications.length : 0
      const unreadOnly = filter === 'unread'
      const res = await fetch(`/api/notifications?limit=20&offset=${offset}&unreadOnly=${unreadOnly}`)

      if (res.ok) {
        const data: NotificationResponse = await res.json()
        setNotifications(prev => append ? [...prev, ...data.notifications] : data.notifications)
        setHasMore(data.hasMore)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [filter, notifications.length])

  // Initial fetch
  useEffect(() => {
    fetchNotifications()
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mark as read
  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      })

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Delete notification
  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id))
        setTotal(prev => prev - 1)
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Handle notification click
  const handleClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }
    if (notification.link) {
      router.push(notification.link)
    }
  }

  // Load more
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(true)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setFilter('all')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            filter === 'all'
              ? 'text-primary-600 border-primary-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          All ({total})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            filter === 'unread'
              ? 'text-primary-600 border-primary-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          Unread
        </button>
      </div>

      {/* Notification list */}
      {loading && notifications.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <svg className="w-6 h-6 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="text-sm">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => {
            const typeBadge = TYPE_BADGES[notification.type] || { label: 'Other', variant: 'default' as const }

            return (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors ${
                  notification.isRead
                    ? 'bg-white border-slate-200'
                    : 'bg-primary-50/50 border-primary-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full" />
                      )}
                    </div>
                    <h3 className={`text-sm ${notification.isRead ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>
                      {notification.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{notification.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {format(new Date(notification.createdAt), 'MMM d, yyyy h:mm a')}
                      {' '}({formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {notification.link && (
                      <button
                        onClick={() => handleClick(notification)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="View"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    )}
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                        title="Mark as read"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
