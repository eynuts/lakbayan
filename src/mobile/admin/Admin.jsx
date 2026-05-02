import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import './Admin.css'

const AdminMobile = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true || user?.isAdmin === 'true'

  useEffect(() => {
    if (!isAdmin) {
      navigate('/profile')
    }
  }, [isAdmin, navigate])

  if (!isAdmin) return null

  return (
    <div className="ma-admin-container">
      <header className="ma-admin-header">
        <button className="ma-admin-back" onClick={() => navigate('/profile')}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h1>Admin</h1>
        <button className="ma-admin-web" onClick={() => navigate('/admin-web')}>
          Web
        </button>
      </header>

      <main className="ma-admin-main">
        <section className="ma-admin-welcome">
          <h2>Welcome, {user?.displayName || 'Admin'}</h2>
          <p>Choose what you want to manage.</p>
        </section>

        <section className="ma-admin-nav-grid">
          <button className="ma-admin-nav-card" onClick={() => navigate('/admin/users')}>
            <i className="fas fa-users"></i>
            <h3>User List</h3>
            <p>View registered users</p>
          </button>
          <button className="ma-admin-nav-card" onClick={() => navigate('/admin/applications')}>
            <i className="fas fa-file-signature"></i>
            <h3>Application List</h3>
            <p>Review and approve resorts</p>
          </button>
          <button className="ma-admin-nav-card" onClick={() => navigate('/admin/topups')}>
            <i className="fas fa-wallet"></i>
            <h3>Top Up Approvals</h3>
            <p>Approve wallet top ups</p>
          </button>
          <button className="ma-admin-nav-card" onClick={() => navigate('/admin/cashouts')}>
            <i className="fas fa-money-bill-transfer"></i>
            <h3>Cash Out Approvals</h3>
            <p>Approve cash out requests</p>
          </button>
        </section>
      </main>
      <BottomNav />
    </div>
  )
}

export default AdminMobile
