import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import './EditProfile.css'

const EditProfile = () => {
  const navigate = useNavigate()
  const { user, setManualUser } = useAuth()
  
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    photoURL: user?.photoURL || ''
  })

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
    // Update the user in context
    const updatedUser = {
      ...user,
      displayName: formData.displayName,
      email: formData.email,
      photoURL: formData.photoURL
    }
    setManualUser(updatedUser)
    navigate('/profile')
  }

  return (
    <div className="mep-container">
      {/* Header */}
      <header className="mep-header animate-fade-in">
        <button className="mep-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2>Edit Profile</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="mep-main animate-slide-up">
        <form onSubmit={handleSubmit} className="mep-form">
          <div className="mep-avatar-upload">
            <div className="mep-avatar-preview">
              <img 
                src={formData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.displayName)}&background=0077b6&color=fff`} 
                alt="Profile Preview" 
              />
              <div className="mep-upload-badge">
                <i className="fas fa-camera"></i>
              </div>
            </div>
            <p>Tap to change avatar URL</p>
            <input 
              type="text" 
              name="photoURL"
              value={formData.photoURL}
              onChange={handleChange}
              placeholder="Enter Image URL"
              className="mep-input-url"
            />
          </div>

          <div className="mep-input-group">
            <label>Full Name</label>
            <div className="mep-input-wrapper">
              <i className="fas fa-user"></i>
              <input 
                type="text" 
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Juan Dela Cruz"
                required
              />
            </div>
          </div>

          <div className="mep-input-group">
            <label>Email Address</label>
            <div className="mep-input-wrapper mep-disabled">
              <i className="fas fa-envelope"></i>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                readOnly
                placeholder="your@email.com"
              />
            </div>
            <p className="mep-helper-text">Email cannot be changed</p>
          </div>

          <button type="submit" className="mep-save-btn">
            Save Changes
          </button>
        </form>
      </main>
    </div>
  )
}

export default EditProfile
