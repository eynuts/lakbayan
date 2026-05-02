import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { getWalletBalance, getWalletTransactions } from '../../firebase'
import { ref, onValue } from 'firebase/database'
import { db } from '../../firebase'
import './Wallet.css'

const Wallet = () => {
  const { user, manualUser } = useAuth()
  const displayUser = user || manualUser
  const navigate = useNavigate()
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [dbTransactions, setDbTransactions] = useState([])
  const [paymentMessage, setPaymentMessage] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Fetch user ID from database and load balance
  useEffect(() => {
    if (!displayUser?.email) {
      setLoading(false)
      return
    }

    const usersRef = ref(db, 'users')
    const unsubscribe = onValue(usersRef, async (snapshot) => {
      const users = snapshot.val()
      if (users) {
        const foundUser = Object.entries(users).find(([id, userData]) => userData.email === displayUser.email)
        if (foundUser) {
          const [id] = foundUser
          setUserId(id)
          
          // Fetch balance from database
          try {
            const walletBalance = await getWalletBalance(id)
            setBalance(walletBalance)
            
            // Fetch transactions from database
            const transactions = await getWalletTransactions(id)
            setDbTransactions(transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
          } catch (error) {
            console.error('Error loading wallet data:', error)
            setBalance(0) // Fallback balance
          }
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [displayUser?.email])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(price)
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
      return date.toLocaleDateString('en-PH')
    }
  }



  const transactions = dbTransactions

  if (loading) {
    return (
      <div className="mw-container">
        <header className="mw-header">
          <button className="mw-back-btn" onClick={() => navigate('/home', { replace: true })}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>My Wallet</h2>
          <div style={{width: '40px'}}></div>
        </header>
        <main style={{ padding: '20px', textAlign: 'center' }}>Loading wallet...</main>
      </div>
    )
  }

  return (
    <div className="mw-container">
      {/* Header */}
      <header className="mw-header">
        <button className="mw-back-btn" onClick={() => navigate('/home', { replace: true })}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>My Wallet</h2>
        <div style={{width: '40px'}}></div>
      </header>

      {/* Balance Card */}
      <section className="mw-balance-section animate-slide-up">
        <div className="mw-balance-card">
          <div className="mw-card-chip"></div>
          <div className="mw-balance-info">
            <p>Available Balance</p>
            <h1>{formatPrice(balance)}</h1>
            <div className="mw-user-badge">
              <i className="fas fa-user-circle"></i>
              <span>{displayUser?.email || userId || 'sidell_guest_001'}</span>
            </div>
          </div>
          <div className="mw-card-footer">
            <div className="mw-card-logo">SIDELL</div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="mw-quick-actions animate-slide-up" style={{ "--delay": "0.1s" }}>
        <div className="mw-actions-grid">
          <button className="mw-action-btn" onClick={() => navigate('/topup', { replace: true })}>
            <div className="mw-icon-wrap primary">
              <i className="fas fa-plus"></i>
            </div>
            <span>Cash In</span>
          </button>
          <button className="mw-action-btn" onClick={() => navigate('/cashout', { replace: true })}>
            <div className="mw-icon-wrap secondary">
              <i className="fas fa-arrow-up"></i>
            </div>
            <span>Cash Out</span>
          </button>
          <button className="mw-action-btn" onClick={() => navigate('/scan', { replace: true })}>
            <div className="mw-icon-wrap accent">
              <i className="fas fa-qrcode"></i>
            </div>
            <span>Scan</span>
          </button>
          <button className="mw-action-btn" onClick={() => navigate('/receive', { replace: true })}>
            <div className="mw-icon-wrap info">
              <i className="fas fa-receipt"></i>
            </div>
            <span>Pay</span>
          </button>
          <button className="mw-action-btn" onClick={() => navigate('/send', { replace: true })}>
            <div className="mw-icon-wrap success">
              <i className="fas fa-paper-plane"></i>
            </div>
            <span>Send</span>
          </button>
          <button className="mw-action-btn" onClick={() => navigate('/history', { replace: true })}>
            <div className="mw-icon-wrap warning">
              <i className="fas fa-history"></i>
            </div>
            <span>History</span>
          </button>
        </div>
      </section>

      {/* Transactions Section */}
      <section className="mw-transactions-section animate-slide-up" style={{ "--delay": "0.2s" }}>
        <div className="mw-section-head">
          <h3>Recent Transactions</h3>
          <button className="mw-view-all">See All</button>
        </div>
        
        <div className="mw-transactions-list">
          {transactions.length > 0 ? (
            transactions.map(tx => (
              <div key={tx.id} className="mw-tx-item">
                <div className={`mw-tx-icon ${(tx.type === 'topup' || tx.amount > 0) ? 'plus' : 'minus'}`}>
                  <i className={`fas ${tx.icon || (tx.type === 'topup' ? 'fa-plus-circle' : 'fa-shopping-bag')}`}></i>
                </div>
                <div className="mw-tx-details">
                  <h4>{tx.title || (tx.type === 'topup' ? 'Wallet Top-up' : 'Payment')}</h4>
                  <p>{tx.date ? (tx.date.includes(',') ? tx.date : formatDate(tx.createdAt)) : formatDate(tx.createdAt)}</p>
                </div>
                <div className={`mw-tx-amount ${(tx.amount || 0) > 0 ? 'positive' : 'negative'}`}>
                  {(tx.amount || 0) > 0 ? '+' : ''}{formatPrice(tx.amount || 0)}
                </div>
              </div>
            ))
          ) : (
            <div className="mw-no-transactions">
              <i className="fas fa-receipt"></i>
              <p>No transactions yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {paymentMessage && (
        <div className="mw-payment-message">
          <i className={`fas ${paymentMessage.includes('Error') ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
          <p>{paymentMessage}</p>
        </div>
      )}
    </div>
  )
}

export default Wallet
