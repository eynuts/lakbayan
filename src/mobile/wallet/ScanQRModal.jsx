import { useState, useRef, useEffect } from 'react'
import './ScanQRModal.css'

const ScanQRModal = ({ onClose, onPaymentSuccess, userBalance, userId, userEmail }) => {
  const [scannedData, setScannedData] = useState(null)
  const [amount, setAmount] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const handleQRUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        // Since we don't have a scanner library, we'll use a simple file upload
        // In a real app, you'd use a QR scanner library like jsQR or html5-qrcode
        // For now, we'll show an input to paste the QR data
        alert('QR scanning feature requires a camera/scanner library. For now, paste the data directly.')
      } catch (err) {
        setError('Failed to scan QR code')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handlePasteQRData = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const qrData = JSON.parse(text)
      if (qrData.type === 'payment' && qrData.userId) {
        setScannedData(qrData)
        setError('')
      } else {
        setError('Invalid QR code data')
      }
    } catch (err) {
      setError('Failed to read QR data. Make sure you have the QR data copied.')
    }
  }

  const handlePaymentClick = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    if (parseFloat(amount) > userBalance) {
      setError('Insufficient balance')
      return
    }
    setShowConfirmation(true)
  }

  const handleConfirmPayment = async () => {
    setLoading(true)
    try {
      await onPaymentSuccess({
        recipientId: scannedData.userId,
        recipientEmail: scannedData.email,
        amount: parseFloat(amount),
        senderId: userId,
        senderEmail: userEmail
      })
      setScannedData(null)
      setAmount('')
      setShowConfirmation(false)
    } catch (err) {
      setError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sqm-overlay" onClick={onClose}>
      <div className="sqm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="sqm-close-btn" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>

        {!scannedData ? (
          <>
            <div className="sqm-header">
              <h2>Scan & Pay</h2>
              <p>Scan the QR code to send money</p>
            </div>

            <div className="sqm-content">
              <div className="sqm-info">
                <i className="fas fa-qrcode"></i>
                <p>Methods to scan:</p>
              </div>

              <div className="sqm-method-buttons">
                <button 
                  className="sqm-method-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <i className="fas fa-image"></i>
                  Upload Image
                </button>
                <button 
                  className="sqm-method-btn"
                  onClick={handlePasteQRData}
                >
                  <i className="fas fa-clipboard"></i>
                  Paste QR Data
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleQRUpload}
                style={{ display: 'none' }}
              />

              {error && <div className="sqm-error">{error}</div>}
            </div>
          </>
        ) : showConfirmation ? (
          <>
            <div className="sqm-header">
              <h2>Confirm Payment</h2>
            </div>

            <div className="sqm-confirmation">
              <div className="sqm-confirm-item">
                <label>Recipient</label>
                <p>{scannedData.email}</p>
              </div>

              <div className="sqm-confirm-item">
                <label>Amount</label>
                <p className="sqm-amount">₱{parseFloat(amount).toFixed(2)}</p>
              </div>

              <div className="sqm-confirm-item">
                <label>Your Balance After</label>
                <p className="sqm-balance">₱{(userBalance - parseFloat(amount)).toFixed(2)}</p>
              </div>

              {error && <div className="sqm-error">{error}</div>}

              <div className="sqm-confirm-buttons">
                <button 
                  className="sqm-confirm-btn cancel"
                  onClick={() => setShowConfirmation(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="sqm-confirm-btn confirm"
                  onClick={handleConfirmPayment}
                  disabled={loading}
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Confirm'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="sqm-header">
              <h2>Enter Amount</h2>
            </div>

            <div className="sqm-payment-input">
              <div className="sqm-recipient-info">
                <p className="sqm-label">Sending to:</p>
                <p className="sqm-email">{scannedData.email}</p>
              </div>

              <div className="sqm-amount-input-group">
                <label>Amount (PHP)</label>
                <div className="sqm-input-wrapper">
                  <span className="sqm-currency">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {error && <div className="sqm-error">{error}</div>}

              <div className="sqm-footer-info">
                <p>Available Balance: <strong>₱{userBalance.toFixed(2)}</strong></p>
              </div>

              <div className="sqm-action-buttons">
                <button 
                  className="sqm-action-btn secondary"
                  onClick={() => {
                    setScannedData(null)
                    setAmount('')
                  }}
                >
                  Scan Again
                </button>
                <button 
                  className="sqm-action-btn primary"
                  onClick={handlePaymentClick}
                  disabled={!amount || loading}
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Next'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ScanQRModal
