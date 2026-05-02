import { useState, useEffect } from 'react'
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../firebase'
import { useAuth } from '../../AuthContext'
import './NotificationModal.css'

const NotificationModal = ({ isOpen, onClose, userId }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications()
    }
  }, [isOpen, userId])

  const loadNotifications = async () => {
    setLoading(true)
    const notifs = await getUserNotifications(userId)
    setNotifications(notifs)
    setLoading(false)
  }

  const handleMarkAllAsRead = async () => {
    if (notifications.length > 0) {
      await markAllNotificationsAsRead(userId)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  const handleMarkAsRead = async (id) => {
    await markNotificationAsRead(userId, id)
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking':
        return <i className="fas fa-calendar-check"></i>
      case 'approval':
        return <i className="fas fa-check-circle"></i>
      case 'application':
        return <i className="fas fa-paper-plane"></i>
      case 'payment':
        return <i className="fas fa-credit-card"></i>
      case 'rejection':
        return <i className="fas fa-times-circle"></i>
      case 'reservation':
        return <i className="fas fa-bed"></i>
      case 'welcome':
        return <i className="fas fa-user-plus"></i>
      case 'system':
        return <i className="fas fa-info-circle"></i>
      default:
        return <i className="fas fa-bell"></i>
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!isOpen) return null

  return (
    <>
      <div className="notification-overlay" onClick={onClose}></div>
      <div className="notification-modal">
        <div className="notification-header">
          <h3>Notifications</h3>
          <button className="mark-all-btn" onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>
          <button className="close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="notification-body">
          {loading ? (
            <div className="notification-loading">
              <i className="fas fa-spinner fa-spin"></i>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <i className="fas fa-bell-slash"></i>
              <p>No notifications yet</p>
              <small>Your notifications will appear here</small>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                  onClick={() => handleMarkAsRead(notif.id)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {notif.title}
                      {!notif.read && <span className="unread-dot"></span>}
                    </div>
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">
                      {formatTimeAgo(notif.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default NotificationModal
