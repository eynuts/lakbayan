import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref, update, remove, push, get } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './Admin.css'

const AdminApplications = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [showConfirm, setShowConfirm] = useState({ show: false, action: '', id: '', name: '' })
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true || user?.isAdmin === 'true'

  useEffect(() => {
    if (!isAdmin) {
      navigate('/profile')
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setApplications([])
        setLoading(false)
        return
      }
      const parsed = Object.entries(value).map(([id, item]) => ({ id, ...item }))
      parsed.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setApplications(parsed)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [isAdmin])

  const updateApplicationStatus = async (applicationId, status) => {
    try {
      setUpdatingId(applicationId)
      const applicationRef = ref(db, `resortApplications/${applicationId}`)
      
      // Get the application first to find the owner
      const snapshot = await get(applicationRef)
      const application = snapshot.val()
      
      const updates = {
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user?.uid || 'admin-mobile'
      }
      
      await update(applicationRef, updates)
      
      // Create notification for the resort owner
      if (application?.ownerId) {
        const isAccepted = status === 'approved' || status === 'accepted'
        const notification = {
          title: isAccepted ? 'Resort Accepted!' : 'Resort Rejected',
          message: isAccepted
            ? `Your resort "${application.resortName}" has been accepted and is now live in the app.`
            : `Your resort "${application.resortName}" was not approved. Please contact support.`,
          type: isAccepted ? 'approval' : 'rejection',
          read: false,
          createdAt: new Date().toISOString()
        }
        await push(ref(db, `notifications/${application.ownerId}`), notification)
      }
    } finally {
      setUpdatingId('')
    }
  }

  const blacklistResort = async (applicationId) => {
    try {
      setUpdatingId(applicationId)
      const applicationRef = ref(db, `resortApplications/${applicationId}`)
      await update(applicationRef, {
        blacklisted: true,
        blacklistedAt: new Date().toISOString(),
        blacklistedBy: user?.uid || 'admin-mobile'
      })
      setShowConfirm({ show: false, action: '', id: '', name: '' })
    } finally {
      setUpdatingId('')
    }
  }

  const removeBlacklist = async (applicationId) => {
    try {
      setUpdatingId(applicationId)
      const applicationRef = ref(db, `resortApplications/${applicationId}`)
      await update(applicationRef, {
        blacklisted: false
      })
    } finally {
      setUpdatingId('')
    }
  }

  const deleteResort = async (applicationId) => {
    try {
      setUpdatingId(applicationId)
      const applicationRef = ref(db, `resortApplications/${applicationId}`)
      await remove(applicationRef)
      setShowConfirm({ show: false, action: '', id: '', name: '' })
    } finally {
      setUpdatingId('')
    }
  }

  const pendingApplications = useMemo(
    () => applications.filter((item) => (item.status || 'pending') === 'pending'),
    [applications]
  )

  const approvedResorts = useMemo(
    () => applications.filter((item) => item.status === 'approved' || item.status === 'accepted'),
    [applications]
  )

  if (!isAdmin) return null

  return (
    <div className="ma-admin-container">
      <header className="ma-admin-header">
        <button className="ma-admin-back" onClick={() => navigate('/admin')}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h1>Application List</h1>
        <button className="ma-admin-web" onClick={() => navigate('/admin-web')}>Web</button>
      </header>

      <main className="ma-admin-main">
        <section className="ma-admin-list">
          <div className="ma-admin-list-head">
            <h3>Pending Approval</h3>
          </div>
          {loading ? (
            <div className="ma-admin-empty">Loading applications...</div>
          ) : pendingApplications.length === 0 ? (
            <div className="ma-admin-empty">No pending applications.</div>
          ) : (
            <div className="ma-admin-cards">
              {pendingApplications.map((item) => (
                <div key={item.id} className="ma-admin-app-card">
                  <div className="ma-admin-app-top">
                    <h4>{item.resortName || 'Unnamed Resort'}</h4>
                    <span className={`ma-admin-status ${item.status || 'pending'}`}>{item.status || 'pending'}</span>
                  </div>
                  <p>{item.location || 'No location provided'}</p>
                  <div className="ma-admin-meta">
                    <span>{item.resortType || 'Resort'}</span>
                    <span>{item.ownerEmail || item.email || 'No email'}</span>
                  </div>
                  <div className="ma-admin-approval-actions">
                    <button
                      className="ma-approve-btn"
                      disabled={updatingId === item.id}
                      onClick={() => updateApplicationStatus(item.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      className="ma-reject-btn"
                      disabled={updatingId === item.id}
                      onClick={() => updateApplicationStatus(item.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ma-admin-list">
          <div className="ma-admin-list-head">
            <h3>Active Resorts</h3>
          </div>
          {loading ? (
            <div className="ma-admin-empty">Loading resorts...</div>
          ) : approvedResorts.length === 0 ? (
            <div className="ma-admin-empty">No active resorts.</div>
          ) : (
            <div className="ma-admin-cards">
              {approvedResorts.map((item) => (
                <div key={item.id} className={`ma-admin-app-card ${item.blacklisted ? 'blacklisted' : ''}`}>
                  <div className="ma-admin-app-top">
                    <h4>{item.resortName || 'Unnamed Resort'}</h4>
                    <div className="ma-admin-status-group">
                      {item.blacklisted && <span className="ma-admin-status blacklisted">BLACKLISTED</span>}
                      <span className={`ma-admin-status ${item.status || 'approved'}`}>{item.status || 'approved'}</span>
                    </div>
                  </div>
                  <p>{item.location || 'No location provided'}</p>
                  <div className="ma-admin-meta">
                    <span>{item.resortType || 'Resort'}</span>
                    <span>{item.ownerEmail || item.email || 'No email'}</span>
                  </div>
                  <div className="ma-admin-resort-actions">
                    {item.blacklisted ? (
                      <button
                        className="ma-unblacklist-btn"
                        disabled={updatingId === item.id}
                        onClick={() => removeBlacklist(item.id)}
                      >
                        <i className="fas fa-undo"></i> Unblacklist
                      </button>
                    ) : (
                      <button
                        className="ma-blacklist-btn"
                        disabled={updatingId === item.id}
                        onClick={() => setShowConfirm({ show: true, action: 'blacklist', id: item.id, name: item.resortName })}
                      >
                        <i className="fas fa-ban"></i> Blacklist
                      </button>
                    )}
                    <button
                      className="ma-delete-btn"
                      disabled={updatingId === item.id}
                      onClick={() => setShowConfirm({ show: true, action: 'delete', id: item.id, name: item.resortName })}
                    >
                      <i className="fas fa-trash"></i> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ma-admin-list">
          <div className="ma-admin-list-head">
            <h3>All Applications</h3>
          </div>
          {loading ? (
            <div className="ma-admin-empty">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="ma-admin-empty">No resort applications yet.</div>
          ) : (
            <div className="ma-admin-cards">
              {applications.map((item) => (
                <div key={item.id} className="ma-admin-app-card">
                  <div className="ma-admin-app-top">
                    <h4>{item.resortName || 'Unnamed Resort'}</h4>
                    <span className={`ma-admin-status ${item.status || 'pending'}`}>{item.status || 'pending'}</span>
                  </div>
                  <p>{item.location || 'No location provided'}</p>
                  <div className="ma-admin-meta">
                    <span>{item.resortType || 'Resort'}</span>
                    <span>{item.ownerEmail || item.email || 'No email'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showConfirm.show && (
        <div className="ma-confirm-overlay" onClick={() => setShowConfirm({ show: false, action: '', id: '', name: '' })}>
          <div className="ma-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Action</h3>
            <p>
              {showConfirm.action === 'blacklist' 
                ? `Blacklist "${showConfirm.name}"? Users won't see this resort.`
                : `Delete "${showConfirm.name}"? This cannot be undone.`
              }
            </p>
            <div className="ma-confirm-actions">
              <button 
                className="ma-confirm-cancel"
                onClick={() => setShowConfirm({ show: false, action: '', id: '', name: '' })}
              >
                Cancel
              </button>
              <button 
                className={showConfirm.action === 'blacklist' ? 'ma-confirm-blacklist' : 'ma-confirm-delete'}
                disabled={updatingId === showConfirm.id}
                onClick={() => {
                  if (showConfirm.action === 'blacklist') {
                    blacklistResort(showConfirm.id)
                  } else {
                    deleteResort(showConfirm.id)
                  }
                }}
              >
                {updatingId === showConfirm.id ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default AdminApplications
