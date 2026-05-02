import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ref, push, set, get, update, onValue } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import { db } from '../../firebase'
import { sendBookingConfirmation } from '../../utils/emailIntegration'
import './Payment.css'

const Payment = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, manualUser } = useAuth()
  const displayUser = user || manualUser

  const bookingData = location.state?.bookingData || null
  const [userId, setUserId] = useState(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [insufficientBalance, setInsufficientBalance] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!displayUser?.email) {
      setLoading(false)
      return
    }

    const usersRef = ref(db, 'users')
    const unsubscribe = onValue(usersRef, async (snapshot) => {
      const users = snapshot.val()
      if (users) {
        const foundUser = Object.entries(users).find(([, userData]) => userData.email === displayUser.email)
        if (foundUser) {
          const [id] = foundUser
          setUserId(id)

          try {
            const walletRef = ref(db, `wallets/${id}`)
            const walletSnapshot = await get(walletRef)
            if (walletSnapshot.exists()) {
              setWalletBalance(walletSnapshot.val().balance || 0)
            }
          } catch (err) {
            console.error('Error loading wallet:', err)
          }
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [displayUser?.email])

  useEffect(() => {
    if (bookingData) {
      setInsufficientBalance(walletBalance < bookingData.totalPrice)
    }
  }, [walletBalance, bookingData])

  const handlePayment = async (e) => {
    e.preventDefault()

    if (!bookingData) {
      alert('No booking data found. Please start a new booking.')
      navigate('/booking')
      return
    }

    if (!userId) {
      alert('User not found. Please login again.')
      return
    }

    if (insufficientBalance) {
      alert('Insufficient wallet balance for this booking.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const newBalance = walletBalance - bookingData.totalPrice
      const walletRef = ref(db, `wallets/${userId}`)
      await update(walletRef, {
        balance: newBalance,
        updatedAt: new Date().toISOString()
      })

      const transactionsRef = ref(db, `walletTransactions/${userId}`)
      await push(transactionsRef, {
        type: 'payment',
        title: `${bookingData.resortName} - ${bookingData.room.title}`,
        amount: -bookingData.totalPrice,
        roomName: bookingData.room.title,
        resortName: bookingData.resortName,
        checkIn: bookingData.checkIn,
        checkOut: bookingData.checkOut,
        createdAt: new Date().toISOString()
      })

      const referenceNumber = 'BK' + Date.now().toString().slice(-6)

      const bookingsRef = ref(db, 'bookings')
      const newBookingRef = push(bookingsRef)

      const bookingRecord = {
        ...bookingData,
        userId,
        referenceNumber,
        checkIn: bookingData.checkIn instanceof Date ? bookingData.checkIn.toISOString() : bookingData.checkIn,
        checkOut: bookingData.checkOut instanceof Date ? bookingData.checkOut.toISOString() : bookingData.checkOut,
        paymentStatus: 'paid',
        paymentMethod: 'wallet',
        bookingStatus: 'upcoming',
        createdAt: new Date().toISOString()
      }

      await set(newBookingRef, bookingRecord)

      try {
        const bookingNotification = {
          title: 'Booking Paid',
          message: `${bookingData.room?.title} at ${bookingData.resortName} - ${bookingData.nights} night(s) on ${bookingData.checkIn ? new Date(bookingData.checkIn).toLocaleDateString() : ''}`,
          type: 'booking',
          read: false,
          createdAt: new Date().toISOString()
        }
        await push(ref(db, `notifications/${userId}`), bookingNotification)
      } catch (notifErr) {
        console.error('Error creating notification:', notifErr)
      }

      const emailResult = await sendBookingConfirmation({
        userEmail: bookingData.email,
        userName: `${bookingData.firstName} ${bookingData.lastName}`,
        roomId: bookingData.room?.id || '',
        resortId: bookingData.resortId || '',
        userId,
        roomType: bookingData.room?.title || 'Room',
        roomName: bookingData.room?.title || 'Room',
        numberOfGuests: bookingData.guests || '1',
        totalAmount: bookingData.totalPrice,
        receiptId: referenceNumber,
        checkInDate: bookingData.checkIn ? new Date(bookingData.checkIn).toLocaleDateString() : new Date().toLocaleDateString(),
      })

      if (!emailResult.success) {
        console.error('Failed to send reservation email:', emailResult.message)
      } else {
        console.log('Booking confirmation email sent successfully!')
      }

      setShowSuccess(true)
      setWalletBalance(newBalance)

      setTimeout(() => {
        navigate('/home', { replace: true })
      }, 3000)
    } catch (err) {
      console.error('Error processing payment:', err)
      setError('Failed to process payment. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(price)
  }

  if (!bookingData) {
    return (
      <div className="mp-container">
        <header className="mp-header">
          <button className="mp-back-btn" onClick={() => navigate(-1)} type="button">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>Payment</h2>
          <div style={{width: '40px'}}></div>
        </header>
        <div className="mp-main">
          <div className="mp-error-state">
            <i className="fas fa-exclamation-circle"></i>
            <h3>No Booking Data Found</h3>
            <p>Please complete the booking form first.</p>
            <button onClick={() => navigate('/booking')} className="mp-primary-btn">
              Go to Booking
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="mp-container">
        <header className="mp-header">
          <button className="mp-back-btn" onClick={() => navigate('/home', { replace: true })} type="button">
            <i className="fas fa-arrow-left"></i>
          </button>
          <h2>Success</h2>
          <div style={{width: '40px'}}></div>
        </header>
        <div className="mp-main">
          <div className="mp-success-state animate-slide-up">
            <div className="mp-success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Payment Successful!</h2>
            <p>Your booking is paid and will be confirmed on the check-in date.</p>
            <div className="mp-success-details">
              <div className="mp-detail-item">
                <span>Amount Paid</span>
                <strong>{formatPrice(bookingData.totalPrice)}</strong>
              </div>
              <div className="mp-detail-item">
                <span>New Balance</span>
                <strong>{formatPrice(walletBalance)}</strong>
              </div>
            </div>
            <p className="mp-redirect">Redirecting to home...</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mp-container">
        <header className="mp-header">
          <div style={{width: '40px'}}></div>
          <h2>Payment</h2>
          <div style={{width: '40px'}}></div>
        </header>
        <div className="mp-main">
          <div className="mp-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Loading wallet information...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mp-container">
      <header className="mp-header">
        <button className="mp-back-btn" onClick={() => navigate(-1)} type="button">
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Wallet Payment</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="mp-main">
        <section className="mp-balance-section animate-slide-up">
          <div className={`mp-balance-card ${insufficientBalance ? 'insufficient' : ''}`}>
            <div className="mp-balance-header">
              <h3>Your Wallet Balance</h3>
              <span className={`mp-balance-status ${insufficientBalance ? 'warning' : 'sufficient'}`}>
                {insufficientBalance ? 'Insufficient' : 'Sufficient'}
              </span>
            </div>
            <p className="mp-balance-amount">{formatPrice(walletBalance)}</p>
            <p className="mp-balance-required">Required: {formatPrice(bookingData.totalPrice)}</p>
          </div>
        </section>

        {error && (
          <div className="mp-error-banner animate-slide-up" style={{ '--delay': '0.1s' }}>
            <i className="fas fa-exclamation-circle"></i>
            <p>{error}</p>
          </div>
        )}

        {insufficientBalance && (
          <div className="mp-warning-banner animate-slide-up" style={{ '--delay': '0.15s' }}>
            <i className="fas fa-exclamation-triangle"></i>
            <div className="mp-warning-content">
              <p><strong>Insufficient Wallet Balance</strong></p>
              <p>You need {formatPrice(bookingData.totalPrice - walletBalance)} more to complete this booking.</p>
              <button
                className="mp-topup-btn"
                onClick={() => navigate('/topup', { replace: true })}
              >
                Top Up Now
              </button>
            </div>
          </div>
        )}

        <section className="mp-summary-section animate-slide-up" style={{ '--delay': '0.2s' }}>
          <h3 className="mp-section-title">
            <i className="fas fa-receipt"></i>
            Booking Summary
          </h3>
          <div className="mp-summary-card">
            <div className="mp-summary-row">
              <span>Resort</span>
              <strong>{bookingData.resortName}</strong>
            </div>
            <div className="mp-summary-row">
              <span>Room</span>
              <strong>{bookingData.room?.title}</strong>
            </div>
            <div className="mp-summary-row">
              <span>Check-in</span>
              <span>{bookingData.checkIn ? new Date(bookingData.checkIn).toLocaleDateString('en-PH') : 'Not set'}</span>
            </div>
            <div className="mp-summary-row">
              <span>Check-out</span>
              <span>{bookingData.checkOut ? new Date(bookingData.checkOut).toLocaleDateString('en-PH') : 'Not set'}</span>
            </div>
            <div className="mp-summary-row">
              <span>Nights</span>
              <span>{bookingData.nights}</span>
            </div>
            <div className="mp-summary-row">
              <span>Guests</span>
              <span>{bookingData.guests} guest(s)</span>
            </div>
            <div className="mp-summary-divider"></div>
            <div className="mp-summary-row total">
              <span>Total Amount</span>
              <strong>{formatPrice(bookingData.totalPrice)}</strong>
            </div>
          </div>
        </section>

        <div className="mp-actions animate-slide-up" style={{ '--delay': '0.3s' }}>
          <button
            className="mp-submit-btn"
            onClick={handlePayment}
            disabled={isSubmitting || insufficientBalance}
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Processing...
              </>
            ) : insufficientBalance ? (
              <>
                <i className="fas fa-exclamation-circle"></i>
                Insufficient Balance
              </>
            ) : (
              <>
                <i className="fas fa-wallet"></i>
                Pay Now
              </>
            )}
          </button>
          <button
            className="mp-cancel-btn"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </main>
    </div>
  )
}

export default Payment
