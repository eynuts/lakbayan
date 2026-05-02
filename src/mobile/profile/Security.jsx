import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import './Security.css'

const Security = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [twoFactor, setTwoFactor] = useState(false)
  const [notifications, setNotifications] = useState(true)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="mse-container">
      {/* Header */}
      <header className="mse-header animate-fade-in">
        <button className="mse-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2>Security</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="mse-main">
        {/* Security Status */}
        <section className="mse-section animate-slide-up" style={{ "--delay": "0.1s" }}>
          <div className="mse-status-card">
            <div className="mse-status-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="mse-status-info">
              <h3>Account Secure</h3>
              <p>Your security settings are up to date.</p>
            </div>
          </div>
        </section>

        {/* Security Options */}
        <section className="mse-section animate-slide-up" style={{ "--delay": "0.2s" }}>
          <div className="mse-section-head">
            <h3>Login & Recovery</h3>
          </div>
          <div className="mse-options-list">
            <div className="mse-option-item" onClick={() => navigate('/change-password')}>
              <div className="mse-option-icon">
                <i className="fas fa-key"></i>
              </div>
              <div className="mse-option-content">
                <h4>Change Password</h4>
                <p>Last changed 3 months ago</p>
              </div>
              <i className="fas fa-chevron-right mse-arrow"></i>
            </div>

            <div className="mse-option-item">
              <div className="mse-option-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <div className="mse-option-content">
                <h4>Two-Factor Auth</h4>
                <p>Add extra security to your account</p>
              </div>
              <label className="mse-switch">
                <input 
                  type="checkbox" 
                  checked={twoFactor} 
                  onChange={() => setTwoFactor(!twoFactor)} 
                />
                <span className="mse-slider"></span>
              </label>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mse-section animate-slide-up" style={{ "--delay": "0.3s" }}>
          <div className="mse-section-head">
            <h3>Danger Zone</h3>
          </div>
          <button className="mse-danger-btn">
            <i className="fas fa-user-slash"></i>
            Delete Account
          </button>
        </section>
      </main>
    </div>
  )
}

export default Security
