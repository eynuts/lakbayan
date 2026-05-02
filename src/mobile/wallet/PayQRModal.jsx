import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { useAuth } from '../../AuthContext'
import './PayQRModal.css'

const PayQRModal = ({ onClose, userId, userEmail }) => {
  const [qrValue, setQrValue] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Generate QR code containing user ID for payment
    const generateQR = async () => {
      try {
        const qrData = {
          type: 'payment',
          userId: userId,
          email: userEmail,
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
  }, [userId, userEmail])

  return (
    <div className="pqm-overlay" onClick={onClose}>
      <div className="pqm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pqm-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
        
        <div className="pqm-header">
          <h2>Receive Payment</h2>
          <p>Let others scan this QR code to send you money</p>
        </div>

        <div className="pqm-content">
          {loading ? (
            <div className="pqm-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <p>Generating QR Code...</p>
            </div>
          ) : qrValue ? (
            <>
              <div className="pqm-qr-container">
                <img src={qrValue} alt="Payment QR Code" />
              </div>
              <div className="pqm-info">
                <p className="pqm-label">Your Account ID</p>
                <p className="pqm-value">{userEmail}</p>
              </div>
            </>
          ) : (
            <div className="pqm-error">
              <p>Failed to generate QR code</p>
            </div>
          )}
        </div>

        <button className="pqm-action-btn" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}

export default PayQRModal
