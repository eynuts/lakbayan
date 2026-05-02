import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import { getWalletBalance, transferPayment } from '../../firebase'
import { ref, onValue } from 'firebase/database'
import { db } from '../../firebase'
import './ScanQR.css'

const ScanQR = () => {
  const { user, manualUser } = useAuth()
  const displayUser = user || manualUser
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [scannedData, setScannedData] = useState(null)
  const [amount, setAmount] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userBalance, setUserBalance] = useState(0)
  const [userId, setUserId] = useState(null)
  const [scanning, setScanning] = useState(true)
  const [cameraError, setCameraError] = useState('')
  const scanningRef = useRef(true)
  const streamRef = useRef(null)
  const barcodeDetectorRef = useRef(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Fetch user ID and balance
  useEffect(() => {
    if (!displayUser?.email) {
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

    return () => unsubscribe()
  }, [displayUser?.email])

  // Start camera
  useEffect(() => {
    const stopCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }

    const startCamera = async () => {
      try {
        setCameraError('')

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Camera API is not available on this device.')
        }

        stopCamera()

        let stream

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' }
            }
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          })
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err) {
        const permissionMessage =
          err?.name === 'NotAllowedError'
            ? 'Camera permission was denied. Please allow camera access for Sidell in Android settings.'
            : 'Unable to access camera. Please check permissions and try again.'

        setCameraError(permissionMessage)
        console.error('Camera error:', err)
      }
    }

    if (scanning) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [scanning])

  // QR Code scanning loop
  useEffect(() => {
    const scanQRCode = async () => {
      if (!scanning || !videoRef.current || !canvasRef.current || !scanningRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        return
      }

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Simple QR code detection - look for specific patterns
        // This is a basic implementation; for production use html5-qrcode library
        try {
          const code = await detectQRCode(data, canvas.width, canvas.height)
          if (code && scanningRef.current) {
            try {
              const qrData = JSON.parse(code)
              if (qrData.type === 'payment' && qrData.userId) {
                scanningRef.current = false
                setScanning(false)
                setScannedData(qrData)
                setError('')
              }
            } catch (e) {
              // Not valid QR data, continue scanning
            }
          }
        } catch (e) {
          // Continue scanning
        }
      }

      if (scanning && scanningRef.current) {
        requestAnimationFrame(scanQRCode)
      }
    }

    const frameId = requestAnimationFrame(scanQRCode)
    return () => cancelAnimationFrame(frameId)
  }, [scanning])

  const detectQRCode = async (imageData, width, height) => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      if (!barcodeDetectorRef.current) {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['qr_code']
        })
      }

      const imageBitmap = await createImageBitmap(
        new ImageData(new Uint8ClampedArray(imageData), width, height)
      )

      try {
        const [result] = await barcodeDetectorRef.current.detect(imageBitmap)
        return result?.rawValue ?? null
      } finally {
        imageBitmap.close()
      }
    }

    return null
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
      await transferPayment(
        {
          userId: userId,
          email: displayUser?.email
        },
        {
          userId: scannedData.userId,
          email: scannedData.email
        },
        parseFloat(amount)
      )
      
      // Refresh balance
      const newBalance = await getWalletBalance(userId)
      setUserBalance(newBalance)
      
      setScannedData(null)
      setAmount('')
      setShowConfirmation(false)
      setScanning(true)
      scanningRef.current = true
      
      // Show success and redirect
      setTimeout(() => {
        navigate('/wallet', { replace: true })
      }, 1000)
    } catch (err) {
      setError(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setScannedData(null)
    setAmount('')
    setError('')
    setScanning(true)
    scanningRef.current = true
  }

  const handleBack = () => {
    navigate('/wallet', { replace: true })
  }

  return (
    <div className="sq-container">
      {/* Header */}
      <header className="sq-header">
        <button className="sq-back-btn" onClick={handleBack}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Scan & Pay</h2>
        <div style={{width: '40px'}}></div>
      </header>

      {/* Content */}
      <main className="sq-content">
        {!scannedData ? (
          <>
            {cameraError ? (
              <div className="sq-error-message">
                <i className="fas fa-exclamation-circle"></i>
                <p>{cameraError}</p>
              </div>
            ) : (
              <div className="sq-camera-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="sq-video"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div className="sq-scanner-overlay">
                  <div className="sq-scanner-frame"></div>
                  <p className="sq-scanner-hint">Align QR code within frame</p>
                </div>
              </div>
            )}
          </>
        ) : showConfirmation ? (
          <>
            <div className="sq-modal-backdrop" onClick={handleCancel}></div>
            <div className="sq-modal">
              <div className="sq-confirmation">
                <div className="sq-confirm-item">
                  <label>Recipient</label>
                  <p>{scannedData.email}</p>
                </div>

                <div className="sq-confirm-item">
                  <label>Amount</label>
                  <p className="sq-amount">₱{parseFloat(amount).toFixed(2)}</p>
                </div>

                <div className="sq-confirm-item">
                  <label>Your Balance After</label>
                  <p className="sq-balance">₱{(userBalance - parseFloat(amount)).toFixed(2)}</p>
                </div>

                {error && <div className="sq-error">{error}</div>}

                <div className="sq-confirm-buttons">
                  <button 
                    className="sq-confirm-btn cancel"
                    onClick={() => handleCancel()}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    className="sq-confirm-btn confirm"
                    onClick={handleConfirmPayment}
                    disabled={loading}
                  >
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Confirm'}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="sq-payment-input">
              <div className="sq-recipient-info">
                <p className="sq-label">Sending to:</p>
                <p className="sq-email">{scannedData.email}</p>
              </div>

              <div className="sq-amount-input-group">
                <label>Amount (PHP)</label>
                <div className="sq-input-wrapper">
                  <span className="sq-currency">₱</span>
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

              {error && <div className="sq-error">{error}</div>}

              <div className="sq-footer-info">
                <p>Available Balance: <strong>₱{userBalance.toFixed(2)}</strong></p>
              </div>

              <button 
                className="sq-pay-btn"
                onClick={handlePaymentClick}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                Continue to Payment
              </button>

              <button 
                className="sq-back-payment-btn"
                onClick={() => {
                  setScannedData(null)
                  setAmount('')
                  setError('')
                  setScanning(true)
                  scanningRef.current = true
                }}
              >
                Scan Another QR
              </button>
            </div>
          </>
        )}

        {/* Instructions */}
        {!scannedData && !cameraError && (
          <div className="sq-instructions">
            <p>Ask the recipient to show you their payment QR code to send them money securely through your wallet.</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default ScanQR

