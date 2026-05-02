import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './Admin.css'

const AdminUsers = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const isAdmin = user?.role === 'admin' || user?.isAdmin === true || user?.isAdmin === 'true'

  useEffect(() => {
    if (!isAdmin) {
      navigate('/profile')
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    const usersRef = ref(db, 'users')
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setUsers([])
        setLoading(false)
        return
      }
      const parsed = Object.entries(value).map(([id, item]) => ({
        id,
        ...item
      }))
      parsed.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      setUsers(parsed)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [isAdmin])

  if (!isAdmin) return null

  return (
    <div className="ma-admin-container">
      <header className="ma-admin-header">
        <button className="ma-admin-back" onClick={() => navigate('/admin')}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h1>User List</h1>
        <button className="ma-admin-web" onClick={() => navigate('/admin-web')}>Web</button>
      </header>

      <main className="ma-admin-main">
        {loading ? (
          <div className="ma-admin-empty">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="ma-admin-empty">No users found.</div>
        ) : (
          <div className="ma-admin-cards">
            {users.map((item) => (
              <div key={item.id} className="ma-admin-app-card">
                <div className="ma-admin-app-top">
                  <h4>{item.name || 'Unnamed User'}</h4>
                  <span className={`ma-admin-status ${item.role || 'customer'}`}>{item.role || 'customer'}</span>
                </div>
                <p>{item.email || 'No email'}</p>
                <div className="ma-admin-meta">
                  <span>{item.isAdmin ? 'Admin' : 'Customer'}</span>
                  <span>{item.phone || 'No contact'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}

export default AdminUsers
