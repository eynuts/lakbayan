import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { ref, push, get } from 'firebase/database'
import { db } from '../../firebase'
import './CashOut.css'

const CashOut = () => {
  const { user, manualUser } = useAuth()
  const displayUser = user || manualUser
  const navigate = useNavigate()
  const [gcashNumber, setGcashNumber] = useState('')
  const [gcashName, setGcashName] = useState('')
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState(0)
  const [loadingBalance, setLoadingBalance] = useState(true)

  // Fetch balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      if (!displayUser?.email) {
        setLoadingBalance(false)
        return
      }

      try {
        // Find user by email
        const usersRef = ref(db, 'users')
        const snapshot = await get(usersRef)
        const users = snapshot.val()
        
        if (users) {
          const foundUser = Object.entries(users).find(([id, userData]) => userData.email === displayUser.email)
          if (foundUser) {
            const [userId] = foundUser
            // Get wallet balance
            const walletRef = ref(db, `wallets/${userId}`)
            const walletSnapshot = await get(walletRef)
            let currentBalance = 0
            if (walletSnapshot.exists()) {
              currentBalance = walletSnapshot.val().balance || 0
            }
            setBalance(currentBalance)
          }
        }
      } catch (err) {
        console.error('Error fetching balance:', err)
      } finally {
        setLoadingBalance(false)
      }
    }

    fetchBalance()
  }, [displayUser?.email])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(price)
  }

  const handleCashOut = async () => {
    if (!gcashNumber.trim()) {
      setError('Please enter a GCash number')
      return
    }
    if (!gcashName.trim()) {
      setError('Please enter the GCash account name')
      return
    }
    if (!cashoutAmount || cashoutAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    const amount = parseFloat(cashoutAmount)

    setLoading(true)
    setError('')

    try {
      // Find user by email
      const usersRef = ref(db, 'users')
      const snapshot = await get(usersRef)
      const users = snapshot.val()
      
      if (users) {
        const foundUser = Object.entries(users).find(([id, userData]) => userData.email === displayUser.email)
        if (foundUser) {
          const [userId] = foundUser
          
          // Check wallet balance
          const walletRef = ref(db, `wallets/${userId}`)
          const walletSnapshot = await get(walletRef)
          let currentBalance = 0
          if (walletSnapshot.exists()) {
            currentBalance = walletSnapshot.val().balance || 0
          }
          
          // Validate sufficient balance
          if (amount > currentBalance) {
            setError(`Insufficient balance. Maximum allowed: ${formatPrice(currentBalance)}`)
            setLoading(false)
            return
          }
          
          // Create pending cashout request
          const cashoutsRef = ref(db, 'cashoutRequests')
          await push(cashoutsRef, {
            userId: userId,
            userEmail: displayUser.email,
            userName: displayUser.displayName || 'Unknown',
            gcashNumber: gcashNumber,
            gcashName: gcashName,
            amount: amount,
            status: 'pending',
            createdAt: new Date().toISOString()
          })
          
          // Navigate back to wallet
          navigate('/wallet', { replace: true })
        }
      }
    } catch (error) {
      console.error('Error submitting cash out:', error)
      setError('Failed to submit cash out. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cashout-container">
      {/* Header */}
      <header className="cashout-header">
        <button className="cashout-back-btn" onClick={() => navigate('/wallet', { replace: true })}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Cash Out</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      {/* Info Section */}
      <section className="cashout-info-section">
        <div className="cashout-info-card">
          <div className="cashout-info-icon">
            <i className="fas fa-money-bill-transfer"></i>
          </div>
          <p className="cashout-info-text">
            Cash out to your GCash account. Funds will be transferred once approved by admin.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="cashout-form-section">
        <div className="cashout-form">
          {/* GCash Number */}
          <div className="cashout-form-group">
            <label htmlFor="gcashNumber">GCash Number</label>
            <input
              id="gcashNumber"
              type="tel"
              placeholder="Enter GCash number"
              value={gcashNumber}
              onChange={(e) => setGcashNumber(e.target.value)}
              className="cashout-input"
            />
            <small className="cashout-hint">10-digit mobile number</small>
          </div>

          {/* GCash Name */}
          <div className="cashout-form-group">
            <label htmlFor="gcashName">Account Name</label>
            <input
              id="gcashName"
              type="text"
              placeholder="Enter GCash account name"
              value={gcashName}
              onChange={(e) => setGcashName(e.target.value)}
              className="cashout-input"
            />
            <small className="cashout-hint">As registered in GCash</small>
          </div>

          {/* Cash Out Amount */}
          <div className="cashout-form-group">
            <label htmlFor="amount">Amount</label>
            <div className="cashout-amount-input-wrapper">
              <span className="cashout-currency">₱</span>
              <input
                id="amount"
                type="number"
                placeholder="0.00"
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                className="cashout-amount-input"
                min="0"
                max={balance}
                step="0.01"
              />
            </div>
            <small className="cashout-hint">
              {loadingBalance ? 'Loading balance...' : `Minimum ₱100. Maximum: ${formatPrice(balance)}`}
            </small>
          </div>

          {/* Error Message */}
          {error && <div className="cashout-error">{error}</div>}

          {/* Submit Button */}
          <button
            className="cashout-submit-btn"
            onClick={handleCashOut}
            disabled={loading || !gcashNumber.trim() || !gcashName.trim() || !cashoutAmount}
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>

          <p className="cashout-security-note">
            <i className="fas fa-lock"></i> Your transaction information is secure
          </p>
        </div>
      </section>
    </div>
  )
}

export default CashOut
