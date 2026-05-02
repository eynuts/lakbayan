import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './Profile.css'

const Profile = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const displayUser = user
  const isAdmin = displayUser?.role === 'admin' || displayUser?.isAdmin === true || displayUser?.isAdmin === 'true'
  const [hasApprovedResort, setHasApprovedResort] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  useEffect(() => {
    if (!displayUser || isAdmin) {
      setHasApprovedResort(false)
      return
    }
    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setHasApprovedResort(false)
        return
      }
      const items = Object.values(value)
      const approved = items.some((item) => {
        const status = item?.status
        const statusApproved = status === 'approved' || status === 'accepted'
        const sameOwner =
          item?.ownerId === displayUser?.uid ||
          item?.ownerEmail === displayUser?.email ||
          item?.email === displayUser?.email
        return statusApproved && sameOwner
      })
      setHasApprovedResort(approved)
    })
    return () => unsubscribe()
  }, [displayUser, isAdmin])

  if (!displayUser) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <h1>Profile</h1>
        </div>
        <main className="profile-main animate-slide-up">
          <div className="profile-card">
            <div className="profile-avatar-section">
              <div className="profile-avatar guest-avatar">
                <i className="fas fa-user-secret"></i>
              </div>
              <h2>Guest User</h2>
              <p>Sign in to unlock all features</p>
            </div>

            <div className="profile-menu">
              <div className="menu-item" onClick={() => navigate('/login')}>
                <i className="fas fa-sign-in-alt"></i>
                <span>Login / Sign Up</span>
                <i className="fas fa-chevron-right"></i>
              </div>
              <div className="menu-item" onClick={() => navigate('/discover')}>
                <i className="fas fa-compass"></i>
                <span>Discover</span>
                <i className="fas fa-chevron-right"></i>
              </div>
              <div className="menu-item" onClick={() => navigate('/location')}>
                <i className="fas fa-map-marker-alt"></i>
                <span>How to Get Here</span>
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          </div>

        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="profile-container">
      <div className="profile-header animate-fade-in">
        <h1>Profile</h1>
      </div>

      <main className="profile-main animate-slide-up">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <img 
              src={displayUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.displayName)}&background=0077b6&color=fff`} 
              alt={displayUser.displayName} 
              className="profile-avatar"
            />
            <h2>{displayUser.displayName}</h2>
            <p>{displayUser.email}</p>
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">0</span>
              <span className="stat-label">Bookings</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">0</span>
              <span className="stat-label">Reviews</span>
            </div>
          </div>

          <div className="profile-menu">
            <div className="menu-item" onClick={() => navigate('/edit-profile')}>
              <i className="fas fa-user-edit"></i>
              <span>Edit Profile</span>
              <i className="fas fa-chevron-right"></i>
            </div>
            <div className="menu-item">
              <i className="fas fa-bell"></i>
              <span>Notifications</span>
              <i className="fas fa-chevron-right"></i>
            </div>
            <div className="menu-item" onClick={() => navigate('/security')}>
              <i className="fas fa-shield-alt"></i>
              <span>Security</span>
              <i className="fas fa-chevron-right"></i>
            </div>
            {isAdmin ? (
              <div className="menu-item" onClick={() => navigate('/admin')}>
                <i className="fas fa-user-shield"></i>
                <span>Admin</span>
                <i className="fas fa-chevron-right"></i>
              </div>
            ) : (
              <>
                <div className="menu-item" onClick={() => navigate('/register-resort')}>
                  <i className="fas fa-plus-circle"></i>
                  <span>Register a resort</span>
                  <i className="fas fa-chevron-right"></i>
                </div>
                 {hasApprovedResort && (
                   <div className="menu-item" onClick={() => navigate('/my-resorts')}>
                     <i className="fas fa-hotel"></i>
                     <span>My Resorts</span>
                     <i className="fas fa-chevron-right"></i>
                   </div>
                 )}
              </>
            )}
            <div className="menu-item logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              <span>Logout</span>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

export default Profile
