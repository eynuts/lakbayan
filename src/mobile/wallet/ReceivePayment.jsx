import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { useAuth } from '../../AuthContext'
import { ref, get } from 'firebase/database'
import { db } from '../../firebase'
import './ReceivePayment.css'

const ReceivePayment = () => {
  const { user, manualUser } = useAuth()
  const displayUser = user || manualUser
  const navigate = useNavigate()
  const [qrValue, setQrValue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Fetch actual userId from database
  useEffect(() => {
    if (!displayUser?.email) return

    const fetchUserId = async () => {
      try {
        const usersRef = ref(db, 'users')
        const snapshot = await get(usersRef)
        const users = snapshot.val()
        
        if (users) {
          const foundUser = Object.entries(users).find(([id, userData]) => userData.email === displayUser.email)
          if (foundUser) {
            const [id] = foundUser
            setUserId(id)
          }
        }
      } catch (error) {
        console.error('Error fetching user ID:', error)
      }
    }

    fetchUserId()
  }, [displayUser?.email])

  useEffect(() => {
    // Generate QR code containing user ID for payment
    const generateQR = async () => {
      try {
        if (!userId) return
        
        const qrData = {
          type: 'payment',
          userId: userId,
          email: displayUser?.email,
          timestamp: new Date().toISOString()
        }
        const qrDataString = JSON.stringify(qrData)
        const qrCanvas = await QRCode.toDataURL(qrDataString, {
          width: 200,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        })
        setQrValue(qrCanvas)
      } catch (error) {
        console.error('Error generating QR code:', error)
      } finally {
        setLoading(false)
      }
    }

    generateQR()
  }, [userId, displayUser?.email])

  return (
    <div className="rp-container">
      {/* Header */}
      <header className="rp-header">
        <button className="rp-back-btn" onClick={() => navigate('/wallet', { replace: true })}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Receive Payment</h2>
        <div style={{width: '40px'}}></div>
      </header>

      {/* Content */}
      <main className="rp-content">
        <div className="rp-section-header">
          <p>Let others scan this QR code to send you money</p>
        </div>

        {loading ? (
          <div className="rp-loading">
            <i className="fas fa-spinner fa-spin"></i>
            <p>Generating QR Code...</p>
          </div>
        ) : qrValue ? (
          <div className="rp-qr-section">
            <div className="rp-qr-container">
              <img src={qrValue} alt="Payment QR Code" />
            </div>
            <div className="rp-info">
              <p className="rp-label">Your Account ID</p>
              <p className="rp-value">{displayUser?.email}</p>
            </div>
          </div>
        ) : (
          <div className="rp-error">
            <i className="fas fa-exclamation-circle"></i>
            <p>Failed to generate QR code</p>
          </div>
        )}

        {/* Instructions */}
        <div className="rp-instructions">
          <p>Share this QR code with another account to receive payment. They can scan it using the Scan feature in their wallet to send you money.</p>
        </div>
      </main>
    </div>
  )
}

export default ReceivePayment
