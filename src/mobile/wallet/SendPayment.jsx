import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { ref, get } from 'firebase/database'
import { db } from '../../firebase'
import { transferPayment, getWalletBalance } from '../../firebase'
import './SendPayment.css'

const SendPayment = () => {
  const { user, manualUser } = useAuth()
  const displayUser = user || manualUser
  const navigate = useNavigate()

  // Send form state
  const [recipientEmail, setRecipientEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userBalance, setUserBalance] = useState(0)
  const [userId, setUserId] = useState(null)
  const [validatingEmail, setValidatingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')

  // Receipt state
  const [showReceipt, setShowReceipt] = useState(false)
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Fetch user ID and balance
  useEffect(() => {
    if (!displayUser?.email) {
      return
    }

    const usersRef = ref(db, 'users')
    get(usersRef).then(async (snapshot) => {
      const users = snapshot.val()
      if (users) {
        const foundUser = Object.entries(users).find(([id, userData]) => userData.email === displayUser.email)
        if (foundUser) {
          const [id] = foundUser
          setUserId(id)
          
          try {
            const walletBalance = await getWalletBalance(id)
            setUserBalance(walletBalance)
          } catch (error) {
            console.error('Error loading wallet balance:', error)
            setUserBalance(0)
          }
        }
      }
    })
  }, [displayUser?.email])

  // Validate email exists in database
  const validateEmailExists = async (email) => {
    setValidatingEmail(true)
    setEmailError('')
    try {
      const usersRef = ref(db, 'users')
      const snapshot = await get(usersRef)
      const users = snapshot.val()
      
      if (!users) {
        setEmailError('No users found in database')
        setValidatingEmail(false)
        return false
      }

      const emailExists = Object.entries(users).some(([id, userData]) => userData.email === email)
      
      if (!emailExists) {
        setEmailError('No account registered to this email')
        setValidatingEmail(false)
        return false
      }

      setValidatingEmail(false)
      return true
    } catch (err) {
      console.error('Error validating email:', err)
      setEmailError('Error validating email')
      setValidatingEmail(false)
      return false
    }
  }

  const handleEmailBlur = async () => {
    if (recipientEmail.trim() && recipientEmail !== displayUser?.email) {
      await validateEmailExists(recipientEmail.trim())
    } else if (recipientEmail === displayUser?.email) {
      setEmailError('Cannot send to your own email')
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    
    // Validation
    if (!recipientEmail.trim()) {
      setError('Please enter recipient email')
      return
    }
    
    if (recipientEmail === displayUser?.email) {
      setError('Cannot send to your own email')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (parseFloat(amount) > userBalance) {
      setError('Insufficient balance')
      return
    }

    if (emailError) {
      setError(emailError)
      return
    }

    setLoading(true)
    setError('')

    try {
      // Verify email exists one more time before transaction
      const isValid = await validateEmailExists(recipientEmail.trim())
      if (!isValid) {
        setError('Recipient email not found')
        setLoading(false)
        return
      }

      // Get recipient user ID
      const usersRef = ref(db, 'users')
      const usersSnapshot = await get(usersRef)
      const users = usersSnapshot.val()
      const recipientData = Object.entries(users).find(([id, userData]) => userData.email === recipientEmail.trim())
      
      if (!recipientData) {
        setError('Recipient not found')
        setLoading(false)
        return
      }

      const [recipientId, recipientUser] = recipientData

      // Process transfer
      const result = await transferPayment(
        {
          userId: userId,
          email: displayUser?.email
        },
        {
          userId: recipientId,
          email: recipientEmail.trim()
        },
        parseFloat(amount)
      )

      // Generate transaction reference (timestamp-based)
      const refNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // Show receipt
      setReceipt({
        refNumber,
        recipientEmail: recipientEmail.trim(),
        amount: parseFloat(amount),
        newBalance: result.newSenderBalance,
        timestamp: new Date().toLocaleString('en-PH'),
        status: 'success'
      })
      setShowReceipt(true)
    } catch (err) {
      console.error('Transfer error:', err)
      setError(err.message || 'Failed to send payment')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToForm = () => {
    setShowReceipt(false)
    setRecipientEmail('')
    setAmount('')
    setError('')
    setEmailError('')
  }

  if (showReceipt && receipt) {
    return (
      <div className="sp-container">
        <header className="sp-header">
          <button className="sp-back-btn" onClick={() => navigate('/wallet', { replace: true })}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>Receipt</h2>
          <div style={{ width: '40px' }}></div>
        </header>

        <main className="sp-main">
          <div className="sp-receipt-section animate-slide-up">
            <div className="sp-receipt-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Payment Sent Successfully!</h2>
            
            <div className="sp-receipt-card">
              <div className="sp-receipt-row">
                <span>Sent To</span>
                <strong>{receipt.recipientEmail}</strong>
              </div>

              <div className="sp-receipt-row">
                <span>Amount</span>
                <strong>₱{receipt.amount.toFixed(2)}</strong>
              </div>

              <div className="sp-receipt-divider"></div>

              <div className="sp-receipt-row">
                <span>Reference Number</span>
                <strong className="sp-ref-number">{receipt.refNumber}</strong>
              </div>

              <div className="sp-receipt-row">
                <span>Date & Time</span>
                <strong>{receipt.timestamp}</strong>
              </div>

              <div className="sp-receipt-divider"></div>

              <div className="sp-receipt-row">
                <span>New Balance</span>
                <strong className="sp-balance">₱{receipt.newBalance.toFixed(2)}</strong>
              </div>
            </div>

            <div className="sp-receipt-actions">
              <button 
                className="sp-receipt-btn primary"
                onClick={() => navigate('/wallet', { replace: true })}
              >
                Back to Wallet
              </button>
              <button 
                className="sp-receipt-btn secondary"
                onClick={handleBackToForm}
              >
                Send Another
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="sp-container">
      <header className="sp-header">
        <button className="sp-back-btn" onClick={() => navigate('/wallet', { replace: true })}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Send Payment</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="sp-main">
        {/* Balance Card */}
        <section className="sp-balance-section animate-slide-up">
          <div className="sp-balance-card">
            <p className="sp-balance-label">Available Balance</p>
            <p className="sp-balance-amount">₱{userBalance.toFixed(2)}</p>
          </div>
        </section>

        {/* Form */}
        <section className="sp-form-section animate-slide-up">
          <form onSubmit={handleSend} className="sp-form">
            {/* Email Input */}
            <div className="sp-form-group">
              <label htmlFor="email">Recipient Email</label>
              <input
                id="email"
                type="email"
                placeholder="recipient@email.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                onBlur={handleEmailBlur}
                disabled={loading}
                className="sp-input"
              />
              {validatingEmail && (
                <small className="sp-validating">
                  <i className="fas fa-spinner fa-spin"></i> Checking email...
                </small>
              )}
              {emailError && (
                <small className="sp-email-error">
                  <i className="fas fa-exclamation-circle"></i> {emailError}
                </small>
              )}
            </div>

            {/* Amount Input */}
            <div className="sp-form-group">
              <label htmlFor="amount">Amount (PHP)</label>
              <div className="sp-input-wrapper">
                <span className="sp-currency">₱</span>
                <input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="sp-amount-input"
                  min="0"
                  step="0.01"
                />
              </div>
              <small className="sp-hint">Max: ₱{userBalance.toFixed(2)}</small>
            </div>

            {/* Error Message */}
            {error && (
              <div className="sp-error">
                <i className="fas fa-exclamation-circle"></i>
                <p>{error}</p>
              </div>
            )}

            {/* Send Button */}
            <button
              type="submit"
              className="sp-send-btn"
              disabled={loading || !recipientEmail.trim() || !amount || emailError !== ''}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i> Send Payment
                </>
              )}
            </button>

            {/* Info Box */}
            <div className="sp-info-box">
              <p>
                <i className="fas fa-info-circle"></i>
                Make sure the recipient email is correct. Once sent, the payment cannot be reversed.
              </p>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default SendPayment
