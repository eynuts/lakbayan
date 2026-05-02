import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { ref, onValue, get } from 'firebase/database'
import { db } from '../../firebase'
import './History.css'

const History = () => {
  const { user, manualUser } = useAuth()
  const displayUser = user || manualUser
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!displayUser?.email) {
      setLoading(false)
      return
    }

    // Find user ID
    const usersRef = ref(db, 'users')
    const unsubscribe = onValue(usersRef, async (snapshot) => {
      const users = snapshot.val()
      if (users) {
        const foundUser = Object.entries(users).find(([id, userData]) => userData.email === displayUser.email)
        if (foundUser) {
          const [userId] = foundUser
          
          // Fetch wallet transactions
          const walletTxRef = ref(db, `walletTransactions/${userId}`)
          onValue(walletTxRef, (txSnapshot) => {
            const txData = txSnapshot.val()
            const txList = txData ? Object.entries(txData).map(([id, data]) => ({
              id,
              ...data,
              source: 'wallet',
              sortDate: new Date(data.createdAt || 0)
            })) : []
            
            // Fetch pending top-up requests
            const topupRef = ref(db, `topupRequests`)
            onValue(topupRef, (topupSnapshot) => {
              const topupData = topupSnapshot.val()
              const topupList = topupData ? Object.entries(topupData)
                .filter(([id, data]) => data.userId === userId)
                .map(([id, data]) => ({
                  id,
                  ...data,
                  source: 'topup_request',
                  sortDate: new Date(data.createdAt || 0),
                  title: 'Top Up Request',
                  type: 'topup_request',
                  statusColor: 'pending'
                })) : []
              
              // Fetch pending cashout requests
              const cashoutRef = ref(db, `cashoutRequests`)
              onValue(cashoutRef, (cashoutSnapshot) => {
                const cashoutData = cashoutSnapshot.val()
                const cashoutList = cashoutData ? Object.entries(cashoutData)
                  .filter(([id, data]) => data.userId === userId)
                  .map(([id, data]) => ({
                    id,
                    ...data,
                    source: 'cashout_request',
                    sortDate: new Date(data.createdAt || 0),
                    title: 'Cash Out Request',
                    type: 'cashout_request',
                    statusColor: 'pending'
                  })) : []
                
                // Combine and sort by date (newest first)
                const allTransactions = [...txList, ...topupList, ...cashoutList]
                  .sort((a, b) => b.sortDate - a.sortDate)
                
                setTransactions(allTransactions)
                setLoading(false)
              })
            })
          })
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [displayUser?.email])

  const formatPrice = (amount) => {
    const value = typeof amount === 'number' ? amount : parseFloat(amount) || 0
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(value)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday, ' + date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
    } else {
      return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
    }
  }

  const getTransactionIcon = (source, type, amount, status) => {
    if (source === 'topup_request' || source === 'cashout_request') {
      return source === 'topup_request' ? 'fa-clock' : 'fa-clock'
    }
    if (type === 'topup') return 'fa-arrow-down'
    if (type === 'cashout') return 'fa-arrow-up'
    if (amount < 0) return 'fa-arrow-up'
    return 'fa-arrow-down'
  }

  if (!displayUser) return null

  return (
    <div className="history-container">
      {/* Header */}
      <header className="history-header">
        <button className="history-back-btn" onClick={() => navigate('/wallet', { replace: true })}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Transaction History</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      {/* History List */}
      <main className="history-main">
        {loading ? (
          <div className="history-loading">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="history-empty">
            <i className="fas fa-receipt"></i>
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="history-list">
            {transactions.map((tx, index) => {
              const iconClass = getTransactionIcon(tx.source, tx.type, tx.amount, tx.status)
              const isPending = tx.status === 'pending'
              const isPlus = tx.amount > 0 || (tx.source === 'topup_request')
              
              return (
                <div 
                  key={tx.id} 
                  className="history-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={`history-icon ${isPending ? 'pending' : isPlus ? 'plus' : 'minus'}`}>
                    <i className={`fas ${iconClass}`}></i>
                  </div>
                  <div className="history-details">
                    <h4>{tx.title || (tx.type === 'topup' ? 'Wallet Top-up' : tx.type === 'cashout' ? 'Cash Out' : 'Transaction')}</h4>
                    <p>{formatDate(tx.createdAt)}</p>
                    {isPending && (
                      <span className="history-status pending">
                        {tx.status.toUpperCase()}
                      </span>
                    )}
                    {tx.referenceNumber && (
                      <p className="history-ref">Ref: {tx.referenceNumber}</p>
                    )}
                  </div>
                  <div className={`history-amount ${isPlus ? 'positive' : 'negative'}`}>
                    {isPlus ? '+' : ''}{formatPrice(tx.amount || 0)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

export default History
