import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref, update, push, get } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './Admin.css'

const AdminCashouts = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [cashouts, setCashouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [activeTab, setActiveTab] = useState('pending')
  const [showConfirm, setShowConfirm] = useState({ show: false, action: '', id: '', userName: '', amount: '', refNumber: '' })
  const [refNumbers, setRefNumbers] = useState({})
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true || user?.isAdmin === 'true'

  const handleRefNumberChange = (cashoutId, value) => {
    setRefNumbers(prev => ({
      ...prev,
      [cashoutId]: value
    }))
  }

  useEffect(() => {
    if (!isAdmin) {
      navigate('/profile')
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    const cashoutsRef = ref(db, 'cashoutRequests')
    const unsubscribe = onValue(cashoutsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setCashouts([])
        setLoading(false)
        return
      }
      const parsed = Object.entries(value).map(([id, item]) => ({ id, ...item }))
      parsed.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setCashouts(parsed)
      setLoading(false)
    })
    return () => unsubscribe()
   }, [isAdmin])

   const approveCashOut = async (cashoutId, cashout, adminRefNumber) => {
    try {
      setUpdatingId(cashoutId)
      console.log('Approving cashout:', cashoutId, cashout, 'Ref:', adminRefNumber)
      
      const userId = cashout.userId
      console.log('Using userId from cashout:', userId)
      
      if (userId) {
        console.log('Updating wallet for userId:', userId)
        
        // Check if wallet exists
        const walletRef = ref(db, `wallets/${userId}`)
        const walletSnapshot = await get(walletRef)
        
        console.log('Wallet data:', walletSnapshot.val())
        
        let currentBalance = 0
        if (walletSnapshot.exists() && walletSnapshot.val().balance !== undefined) {
          currentBalance = walletSnapshot.val().balance
        }
        
        console.log('Current balance:', currentBalance)
        
        // Validate sufficient balance
        const amount = parseFloat(cashout.amount)
        if (amount > currentBalance) {
          alert('Error: User has insufficient balance for this cashout')
          setUpdatingId('')
          return
        }
        
        // Subtract balance
        const newBalance = currentBalance - amount
        console.log('New balance:', newBalance)
        
        await update(walletRef, {
          balance: newBalance,
          updatedAt: new Date().toISOString()
        })
        
        console.log('Balance updated successfully at wallets/' + userId)
        
        // Add transaction record
        const transactionsRef = ref(db, `walletTransactions/${userId}`)
        await push(transactionsRef, {
          type: 'cashout',
          title: 'GCash Cash Out',
          amount: -amount, // Negative amount for cashout
          referenceNumber: adminRefNumber || cashout.gcashNumber,
          createdAt: new Date().toISOString()
        })
        
        console.log('Transaction record added')
        
        // Create notification for user
        const notificationRef = ref(db, `notifications/${userId}`)
        await push(notificationRef, {
          title: 'Cash Out Approved',
          message: `Your cash out of ₱${amount.toLocaleString()} has been approved and processed to GCash (${cashout.gcashNumber}).`,
          type: 'payment',
          read: false,
          createdAt: new Date().toISOString()
        })
        
        console.log('Notification created')
        alert('Cash out approved and wallet updated successfully!')
      } else {
        console.error('No userId in cashout request:', cashout)
        alert('Error: userId not found in cashout request')
      }
      
       // Update cashout status with reference number
       const cashoutRef = ref(db, `cashoutRequests/${cashoutId}`)
       await update(cashoutRef, {
         status: 'approved',
         approvedAt: new Date().toISOString(),
         approvedBy: user?.uid || 'admin-mobile',
         adminReferenceNumber: adminRefNumber // Store the admin-entered ref
       })
      
      console.log('Cashout status updated to approved')
      setShowConfirm({ show: false, action: '', id: '', userName: '', amount: '', refNumber: '' })
    } catch (error) {
      console.error('Error approving cash out:', error)
      alert('Failed to approve cash out: ' + error.message)
    } finally {
      setUpdatingId('')
    }
  }

  const rejectCashOut = async (cashoutId, cashout) => {
    try {
      setUpdatingId(cashoutId)
      const cashoutRef = ref(db, `cashoutRequests/${cashoutId}`)
      await update(cashoutRef, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.uid || 'admin-mobile'
      })
      
      // Create notification for user
      if (cashout?.userId) {
        const notificationRef = ref(db, `notifications/${cashout.userId}`)
        await push(notificationRef, {
          title: 'Cash Out Rejected',
          message: `Your cash out of ₱${parseFloat(cashout.amount || 0).toLocaleString()} was rejected. Please contact support if needed.`,
          type: 'rejection',
          read: false,
          createdAt: new Date().toISOString()
        })
      }
      
      setShowConfirm({ show: false, action: '', id: '', userName: '', amount: '', refNumber: '' })
    } catch (error) {
      console.error('Error rejecting cash out:', error)
      alert('Failed to reject cash out')
    } finally {
      setUpdatingId('')
    }
  }

  const pendingCashouts = useMemo(
    () => cashouts.filter((item) => (item.status || 'pending') === 'pending'),
    [cashouts]
  )

  const approvedCashouts = useMemo(
    () => cashouts.filter((item) => item.status === 'approved'),
    [cashouts]
  )

  const rejectedCashouts = useMemo(
    () => cashouts.filter((item) => item.status === 'rejected'),
    [cashouts]
  )

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(price)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-PH') + ' ' + date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const currentData = activeTab === 'pending' ? pendingCashouts : activeTab === 'approved' ? approvedCashouts : rejectedCashouts

  if (!isAdmin) return null

  return (
    <div className="ma-admin-container">
      <header className="ma-admin-header">
        <button className="ma-admin-back" onClick={() => navigate('/admin')}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h1>Cash Out Approvals</h1>
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
            <span className="ma-topup-tab-badge">{pendingCashouts.length}</span>
          </button>
          <button 
            className={`ma-topup-tab ${activeTab === 'approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('approved')}
          >
            <span className="ma-topup-tab-label">Approved</span>
            <span className="ma-topup-tab-badge">{approvedCashouts.length}</span>
          </button>
          <button 
            className={`ma-topup-tab ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <span className="ma-topup-tab-label">Rejected</span>
            <span className="ma-topup-tab-badge">{rejectedCashouts.length}</span>
          </button>
        </div>

        {/* Tab Content */}
        <section className="ma-admin-list">
          {loading ? (
            <div className="ma-admin-empty">Loading cashout requests...</div>
          ) : currentData.length === 0 ? (
            <div className="ma-admin-empty">
              {activeTab === 'pending' && 'No pending cashout requests.'}
              {activeTab === 'approved' && 'No approved cashouts.'}
              {activeTab === 'rejected' && 'No rejected cashouts.'}
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
                         <label>GCash Number</label>
                         <span className="ma-topup-ref">{item.gcashNumber}</span>
                       </div>
                       <div className="ma-topup-detail-item">
                         <label>Account Name</label>
                         <span className="ma-topup-ref">{item.gcashName}</span>
                       </div>
                       {item.status === 'approved' && (
                         <div className="ma-topup-detail-item">
                           <label>Admin Reference</label>
                           <span className="ma-topup-ref">{item.adminReferenceNumber || 'N/A'}</span>
                         </div>
                       )}
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
                     <>
                       <div className="ma-topup-input-section">
                         <div className="ma-topup-input-group">
                           <label htmlFor={`ref-${item.id}`}>Transaction Reference</label>
                           <input
                             id={`ref-${item.id}`}
                             type="text"
                             placeholder="Enter transaction reference number"
                             value={refNumbers[item.id] || ''}
                             onChange={(e) => handleRefNumberChange(item.id, e.target.value)}
                             className="ma-topup-ref-input"
                           />
                         </div>
                       </div>
                       <div className="ma-topup-card-actions">
                         <button
                           className="ma-topup-approve-btn"
                           disabled={updatingId === item.id || !refNumbers[item.id]?.trim()}
                           onClick={() => setShowConfirm({ 
                             show: true, 
                             action: 'approve', 
                             id: item.id, 
                             userName: item.userName || item.userEmail, 
                             amount: item.amount,
                             refNumber: refNumbers[item.id] || ''
                           })}
                         >
                           <i className="fas fa-check"></i> Approve
                         </button>
                          <button
                            className="ma-topup-reject-btn"
                            disabled={updatingId === item.id}
                            onClick={() => setShowConfirm({ show: true, action: 'reject', id: item.id, userName: item.userName || item.userEmail, amount: item.amount, cashout: item })}
                          >
                           <i className="fas fa-times"></i> Reject
                         </button>
                       </div>
                     </>
                   )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {showConfirm.show && (
        <div className="ma-confirm-overlay" onClick={() => setShowConfirm({ show: false, action: '', id: '', userName: '', amount: '', refNumber: '' })}>
          <div className="ma-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Action</h3>
            <p>
              {showConfirm.action === 'approve' 
                ? `Approve ₱${parseFloat(showConfirm.amount).toFixed(2)} cash out for ${showConfirm.userName} with ref: ${showConfirm.refNumber}?`
                : `Reject ₱${parseFloat(showConfirm.amount).toFixed(2)} cash out for ${showConfirm.userName}?`}
            </p>
            <div className="ma-confirm-actions">
              <button className="ma-confirm-cancel" onClick={() => setShowConfirm({ show: false, action: '', id: '', userName: '', amount: '', refNumber: '' })}>
                Cancel
              </button>
              <button 
                className={showConfirm.action === 'approve' ? 'ma-confirm-approve' : 'ma-confirm-reject'}
                onClick={() => {
                  if (showConfirm.action === 'approve') {
                    const cashout = cashouts.find(c => c.id === showConfirm.id)
                    approveCashOut(showConfirm.id, cashout, showConfirm.refNumber)
                   } else {
                     rejectCashOut(showConfirm.id, showConfirm.cashout)
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

export default AdminCashouts
