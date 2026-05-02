import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import { db } from '../../firebase'
import './MyResorts.css'

const MyResorts = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [resorts, setResorts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      navigate('/profile')
      return
    }

    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setResorts([])
        setLoading(false)
        return
      }

      // Filter resorts owned by current user
      const userResorts = Object.entries(value)
        .filter(([, item]) => {
          const sameOwner =
            item?.ownerId === user?.uid ||
            item?.ownerEmail === user?.email ||
            item?.email === user?.email
          return sameOwner
        })
        .map(([id, item]) => {
          const profile = item?.resortProfile || {}
          const gallery = Array.isArray(item?.gallery) ? item.gallery : []
          const rooms = Array.isArray(item?.rooms) ? item.rooms : []
          const activities = Array.isArray(item?.activities) ? item.activities : []
          const image =
            profile.mainPhotoUrl ||
            item?.mainPhotoUrl ||
            gallery[0]?.url ||
            'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'

          return {
            id,
            name: item?.resortName || 'Unnamed Resort',
            type: item?.resortType || 'Resort',
            address: profile.address || item?.location || 'Location not provided',
            description: profile.description || item?.description || '',
            image,
            status: item?.status || 'pending',
            roomCount: rooms.length,
            activityCount: activities.length,
            createdAt: item?.createdAt || ''
          }
        })
        .sort((a, b) => {
          // Sort: Approved first, then by date
          const statusOrder = { approved: 0, accepted: 0, pending: 1, rejected: 2 }
          const aStatus = statusOrder[a.status] ?? 1
          const bStatus = statusOrder[b.status] ?? 1
          if (aStatus !== bStatus) return aStatus - bStatus
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        })

      setResorts(userResorts)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user, navigate])

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'accepted':
        return 'approved'
      case 'pending':
        return 'pending'
      case 'rejected':
        return 'rejected'
      default:
        return 'pending'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
      case 'accepted':
        return 'Approved'
      case 'pending':
        return 'Pending Review'
      case 'rejected':
        return 'Rejected'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="mr-mylist-container">
      {/* Header */}
      <header className="mr-mylist-header">
        <button className="mr-mylist-back" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>My Resorts</h2>
        <button 
          className="mr-mylist-add"
          onClick={() => navigate('/register-resort')}
        >
          <i className="fas fa-plus"></i>
        </button>
      </header>

      <main className="mr-mylist-main">
        {loading ? (
          <div className="mr-mylist-loading">
            <div className="mr-mylist-spinner"></div>
            <p>Loading your resorts...</p>
          </div>
        ) : resorts.length === 0 ? (
          <div className="mr-mylist-empty">
            <i className="fas fa-hotel"></i>
            <h3>No Resorts Yet</h3>
            <p>Start your journey by registering your first resort!</p>
            <button 
              className="mr-mylist-empty-btn"
              onClick={() => navigate('/register-resort')}
            >
              Register a Resort
            </button>
          </div>
        ) : (
          <div className="mr-mylist-grid">
            {resorts.map((resort, index) => (
              <div
                key={resort.id}
                className="mr-mylist-card"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => navigate(`/my-resort?resortId=${resort.id}`)}
              >
                <div className="mr-mylist-img">
                  <img src={resort.image} alt={resort.name} onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'} />
                  <div className={`mr-mylist-status ${getStatusColor(resort.status)}`}>
                    {getStatusText(resort.status)}
                  </div>
                </div>
                <div className="mr-mylist-content">
                  <h3>{resort.name}</h3>
                  <p className="mr-mylist-type">{resort.type}</p>
                  <p className="mr-mylist-address">
                    <i className="fas fa-map-marker-alt"></i>
                    {resort.address}
                  </p>
                  <div className="mr-mylist-stats">
                    <span><i className="fas fa-bed"></i>{resort.roomCount} rooms</span>
                    <span><i className="fas fa-person-hiking"></i>{resort.activityCount} activities</span>
                  </div>
                </div>
                <div className="mr-mylist-arrow">
                  <i className="fas fa-chevron-right"></i>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default MyResorts
