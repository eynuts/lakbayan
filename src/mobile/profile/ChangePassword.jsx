import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './ChangePassword.css'

const ChangePassword = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      setMessage('Passwords do not match!')
      return
    }
    // In a real app, you'd call your auth service here
    setMessage('Password updated successfully!')
    setTimeout(() => {
      navigate('/security')
    }, 1500)
  }

  return (
    <div className="mcp-container">
      {/* Header */}
      <header className="mcp-header animate-fade-in">
        <button className="mcp-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2>Change Password</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="mcp-main animate-slide-up">
        <form onSubmit={handleSubmit} className="mcp-form">
          <div className="mcp-input-group">
            <label>Current Password</label>
            <div className="mcp-input-wrapper">
              <i className="fas fa-lock"></i>
              <input 
                type="password" 
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter current password"
                required
              />
            </div>
          </div>

          <div className="mcp-input-group">
            <label>New Password</label>
            <div className="mcp-input-wrapper">
              <i className="fas fa-key"></i>
              <input 
                type="password" 
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                required
              />
            </div>
          </div>

          <div className="mcp-input-group">
            <label>Confirm New Password</label>
            <div className="mcp-input-wrapper">
              <i className="fas fa-check-circle"></i>
              <input 
                type="password" 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          {message && (
            <div className={`mcp-message ${message.includes('success') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <button type="submit" className="mcp-save-btn">
            Update Password
          </button>
        </form>
      </main>
    </div>
  )
}

export default ChangePassword
