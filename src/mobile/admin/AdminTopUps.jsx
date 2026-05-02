import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref, update, push, get } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './Admin.css'

const AdminTopUps = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [topups, setTopups] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [showConfirm, setShowConfirm] = useState({ show: false, action: '', id: '', userName: '', amount: '' })
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true || user?.isAdmin === 'true'

  useEffect(() => {
    if (!isAdmin) {
      navigate('/profile')
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    const topupsRef = ref(db, 'topupRequests')
    const unsubscribe = onValue(topupsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setTopups([])
        setLoading(false)
        return
      }
      const parsed = Object.entries(value).map(([id, item]) => ({ id, ...item }))
      parsed.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setTopups(parsed)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [isAdmin])

   const approveTopUp = async (topupId, topup) => {
    try {
      setUpdatingId(topupId)
      console.log('Approving topup:', topupId, topup)
      
      // Use userId from topup request directly
      const userId = topup.userId
      console.log('Using userId from topup:', userId)
      
      if (userId) {
        console.log('Updating wallet for userId:', userId)
        
        // Check if wallet exists, if not create it
        const walletRef = ref(db, `wallets/${userId}`)
        const walletSnapshot = await get(walletRef)
        
        console.log('Wallet data:', walletSnapshot.val())
        
        let currentBalance = 0
        if (walletSnapshot.exists() && walletSnapshot.val().balance !== undefined) {
          currentBalance = walletSnapshot.val().balance
        }
        
        console.log('Current balance:', currentBalance)
        
        // Update balance using Firebase SDK - update at the correct path
        const newBalance = currentBalance + parseFloat(topup.amount)
        console.log('New balance:', newBalance)
        
        await update(walletRef, {
          balance: newBalance,
          updatedAt: new Date().toISOString()
        })
        
        console.log('Balance updated successfully at wallets/' + userId)
        
        // Add transaction record
        const transactionsRef = ref(db, `walletTransactions/${userId}`)
        await push(transactionsRef, {
          type: 'topup',
          title: 'GCash Top Up',
          amount: parseFloat(topup.amount),
          referenceNumber: topup.referenceNumber,
          createdAt: new Date().toISOString()
        })
        
        console.log('Transaction record added')
        
        // Create notification for user
        const notificationRef = ref(db, `notifications/${userId}`)
        await push(notificationRef, {
          title: 'Top Up Approved',
          message: `Your top-up of ₱${parseFloat(topup.amount).toLocaleString()} has been credited to your wallet.`,
          type: 'payment',
          read: false,
          createdAt: new Date().toISOString()
        })
        
        console.log('Notification created')
        alert('Top-up approved and wallet updated successfully!')
      } else {
        console.error('No userId in topup request:', topup)
        alert('Error: userId not found in topup request')
      }
      
      // Update top-up status
      const topupRef = ref(db, `topupRequests/${topupId}`)
      await update(topupRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid || 'admin-mobile'
      })
      
      console.log('Top-up status updated to approved')
      setShowConfirm({ show: false, action: '', id: '', userName: '', amount: '' })
    } catch (error) {
      console.error('Error approving top up:', error)
      alert('Failed to approve top up: ' + error.message)
    } finally {
      setUpdatingId('')
    }
  }

  const rejectTopUp = async (topupId, topup) => {
    try {
      setUpdatingId(topupId)
      const topupRef = ref(db, `topupRequests/${topupId}`)
      await update(topupRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid || 'admin-mobile'
      })
      
      // Create notification for user
      if (topup?.userId) {
        const notificationRef = ref(db, `notifications/${topup.userId}`)
        await push(notificationRef, {
          title: 'Top Up Rejected',
          message: `Your top-up of ₱${parseFloat(topup.amount || 0).toLocaleString()} was rejected. Please contact support if needed.`,
          type: 'rejection',
          read: false,
          createdAt: new Date().toISOString()
        })
      }
      
      setShowConfirm({ show: false, action: '', id: '', userName: '', amount: '' })
    } catch (error) {
      console.error('Error rejecting top up:', error)
      alert('Failed to reject top up')
    } finally {
      setUpdatingId('')
    }
  }

  const pendingTopups = useMemo(
    () => topups.filter((item) => (item.status || 'pending') === 'pending'),
    [topups]
  )

  const approvedTopups = useMemo(
    () => topups.filter((item) => item.status === 'approved'),
    [topups]
  )

  const rejectedTopups = useMemo(
    () => topups.filter((item) => item.status === 'rejected'),
    [topups]
  )

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(price)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-PH') + ' ' + date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const currentData = activeTab === 'pending' ? pendingTopups : activeTab === 'approved' ? approvedTopups : rejectedTopups

  if (!isAdmin) return null

  return (
    <div className="ma-admin-container">
      <header className="ma-admin-header">
        <button className="ma-admin-back" onClick={() => navigate('/admin')}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h1>Top Up Approvals</h1>
        <button className="ma-admin-web" onClick={() => navigate('/admin-web')}>Web</button>
      </header>

      <main className="ma-admin-main">
        {/* Tab Navigation */}
        <div className="ma-topup-tabs">
          <button 
            className={`ma-topup-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <span className="ma-topup-tab-label">Pending</span>
            <span className="ma-topup-tab-badge">{pendingTopups.length}</span>
          </button>
          <button 
            className={`ma-topup-tab ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            <span className="ma-topup-tab-label">Approved</span>
            <span className="ma-topup-tab-badge">{approvedTopups.length}</span>
          </button>
          <button 
            className={`ma-topup-tab ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <span className="ma-topup-tab-label">Rejected</span>
            <span className="ma-topup-tab-badge">{rejectedTopups.length}</span>
          </button>
        </div>

        {/* Tab Content */}
        <section className="ma-admin-list">
          {loading ? (
            <div className="ma-admin-empty">Loading top up requests...</div>
          ) : currentData.length === 0 ? (
            <div className="ma-admin-empty">
              {activeTab === 'pending' && 'No pending top up requests.'}
              {activeTab === 'approved' && 'No approved top ups.'}
              {activeTab === 'rejected' && 'No rejected top ups.'}
            </div>
          ) : (
            <div className="ma-admin-cards">
              {currentData.map((item) => (
                <div key={item.id} className={`ma-admin-topup-card ${item.status}`}>
                  <div className="ma-topup-card-header">
                    <div className="ma-topup-user-info">
                      <h4>{item.userName || item.userEmail}</h4>
                      <p>{item.userEmail}</p>
                    </div>
                    <span className={`ma-admin-status ${item.status}`}>
                      {item.status === 'pending' ? 'PENDING' : item.status === 'approved' ? 'APPROVED' : 'REJECTED'}
                    </span>
                  </div>

                  <div className="ma-topup-card-body">
                    <div className="ma-topup-amount-section">
                      <span className="ma-topup-amount-label">Amount</span>
                      <h3 className="ma-topup-amount-value">{formatPrice(item.amount)}</h3>
                    </div>

                    <div className="ma-topup-details-grid">
                      <div className="ma-topup-detail-item">
                        <label>Reference</label>
                        <span className="ma-topup-ref">{item.referenceNumber}</span>
                      </div>
                      <div className="ma-topup-detail-item">
                        <label>
                          {item.status === 'pending' ? 'Submitted' : item.status === 'approved' ? 'Approved' : 'Rejected'}
                        </label>
                        <span className="ma-topup-date">
                          {formatDate(item.status === 'pending' ? item.createdAt : item.status === 'approved' ? item.approvedAt : item.rejectedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.status === 'pending' && (
                    <div className="ma-topup-card-actions">
                      <button
                        className="ma-topup-approve-btn"
                        disabled={updatingId === item.id}
                        onClick={() => setShowConfirm({ show: true, action: 'approve', id: item.id, userName: item.userName || item.userEmail, amount: item.amount })}
                      >
                        <i className="fas fa-check"></i> Approve
                      </button>
                     <button 
                      className="ma-topup-reject-btn"
                      disabled={updatingId === item.id}
                      onClick={() => setShowConfirm({ show: true, action: 'reject', id: item.id, userName: item.userName || item.userEmail, amount: item.amount, topup: item })}
                    >
                      <i className="fas fa-times"></i> Reject
                    </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showConfirm.show && (
        <div className="ma-confirm-overlay" onClick={() => setShowConfirm({ show: false, action: '', id: '', userName: '', amount: '' })}>
          <div className="ma-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Action</h3>
            <p>
              {showConfirm.action === 'approve' 
                ? `Approve ₱${parseFloat(showConfirm.amount).toFixed(2)} top up for ${showConfirm.userName}?`
                : `Reject ₱${parseFloat(showConfirm.amount).toFixed(2)} top up for ${showConfirm.userName}?`}
            </p>
            <div className="ma-confirm-actions">
              <button className="ma-confirm-cancel" onClick={() => setShowConfirm({ show: false, action: '', id: '', userName: '', amount: '' })}>
                Cancel
              </button>
              <button 
                className={showConfirm.action === 'approve' ? 'ma-confirm-approve' : 'ma-confirm-reject'}
                onClick={() => {
                  if (showConfirm.action === 'approve') {
                    const topup = topups.find(t => t.id === showConfirm.id)
                    approveTopUp(showConfirm.id, topup)
                  } else {
                    rejectTopUp(showConfirm.id, showConfirm.topup)
                  }
                }}
                disabled={updatingId === showConfirm.id}
              >
                {updatingId === showConfirm.id ? 'Processing...' : showConfirm.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default AdminTopUps
