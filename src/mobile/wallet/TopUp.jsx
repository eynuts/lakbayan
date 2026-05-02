import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { ref, push, get } from 'firebase/database'
import { db } from '../../firebase'
import './TopUp.css'

const TopUp = () => {
  const { user, manualUser } = useAuth()
  const displayUser = user || manualUser
  const navigate = useNavigate()
  const [referenceNumber, setReferenceNumber] = useState('')
  const [topupAmount, setTopupAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTopUp = async () => {
    if (!referenceNumber.trim()) {
      setError('Please enter a reference number')
      return
    }
    if (!topupAmount || topupAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

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
          
          // Create pending top-up request
          const topupsRef = ref(db, 'topupRequests')
          await push(topupsRef, {
            userId: userId,
            userEmail: displayUser.email,
            userName: displayUser.displayName || 'Unknown',
            referenceNumber: referenceNumber,
            amount: parseFloat(topupAmount),
            status: 'pending',
            createdAt: new Date().toISOString()
          })
          
          // Navigate back to wallet
          navigate('/wallet', { replace: true })
        }
      }
    } catch (error) {
      console.error('Error submitting top up:', error)
      setError('Failed to submit top up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="topup-container">
      {/* Header */}
      <header className="topup-header">
        <button className="topup-back-btn" onClick={() => navigate('/wallet', { replace: true })}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Top Up</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      {/* QR Code Section */}
      <section className="topup-qr-section">
        <div className="topup-qr-card">
          <p className="topup-qr-label">Scan to Pay</p>
          <img src="/src/assets/images/qr.png" alt="QR Code" className="topup-qr-image" />
          <p className="topup-qr-instruction">Use GCash to Pay</p>
        </div>
      </section>

      {/* Form Section */}
      <section className="topup-form-section">
        <div className="topup-form">
          {/* Reference Number */}
          <div className="topup-form-group">
            <label htmlFor="refNumber">Reference Number</label>
            <input
              id="refNumber"
              type="text"
              placeholder="Enter transaction reference number"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="topup-input"
            />
            <small className="topup-hint">Found in your payment app receipt</small>
          </div>

          {/* Top Up Amount */}
          <div className="topup-form-group">
            <label htmlFor="amount">Amount</label>
            <div className="topup-amount-input-wrapper">
              <span className="topup-currency">₱</span>
              <input
                id="amount"
                type="number"
                placeholder="0.00"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="topup-amount-input"
                min="0"
                step="0.01"
              />
            </div>
            <small className="topup-hint">Minimum ₱100</small>
          </div>

          {/* Error Message */}
          {error && <div className="topup-error">{error}</div>}

          {/* Submit Button */}
          <button
            className="topup-submit-btn"
            onClick={handleTopUp}
            disabled={loading || !referenceNumber.trim() || !topupAmount}
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>

          <p className="topup-security-note">
            <i className="fas fa-lock"></i> Your payment information is secure
          </p>
        </div>
      </section>
    </div>
  )
}

export default TopUp
