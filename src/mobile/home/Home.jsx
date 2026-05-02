import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import { useAuth } from '../../AuthContext'
import NotificationModal from '../notification/NotificationModal'
import { wakeBackend } from '../../utils/backend'
import './Home.css'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'

const Home = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [resorts, setResorts] = useState([])
  const [loadingResorts, setLoadingResorts] = useState(true)
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [userNotifications, setUserNotifications] = useState([])

  useEffect(() => {
    wakeBackend()
  }, [])

  useEffect(() => {
    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setResorts([])
        setLoadingResorts(false)
        return
      }

      const approvedResorts = Object.entries(value)
        .filter(([, item]) => item?.status === 'approved' || item?.status === 'accepted')
        .map(([id, item]) => {
          const profile = item?.resortProfile || {}
          const gallery = Array.isArray(item?.gallery) ? item.gallery : []
          const mainPhoto =
            profile.mainPhotoUrl ||
            item?.mainPhotoUrl ||
            gallery[0]?.url ||
            FALLBACK_IMAGE

          return {
            id,
            name: item?.resortName || 'Unnamed Resort',
            type: item?.resortType || 'Resort',
            description: profile.description || item?.description || 'No description yet.',
            address: profile.address || item?.location || 'Location not provided',
            contactNumber: profile.contactNumber || item?.contactNumber || '',
            mainPhoto,
            gallery,
            rooms: Array.isArray(item?.rooms) ? item.rooms : [],
            activities: Array.isArray(item?.activities) ? item.activities : [],
            rating: (4 + Math.random() * 1.5).toFixed(1),
            priceRange: item?.priceRange || '₱1,000 - ₱3,000',
            createdAt: item?.createdAt || ''
          }
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

      setResorts(approvedResorts)
      setLoadingResorts(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user?.uid) {
      setUserNotifications([])
      setUnreadCount(0)
      return
    }
    const notificationsRef = ref(db, `notifications/${user.uid}`)
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const notifs = snapshot.val()
        const parsed = Object.entries(notifs)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setUserNotifications(parsed)
        const unread = parsed.filter(n => !n.read).length
        setUnreadCount(unread)
      } else {
        setUserNotifications([])
        setUnreadCount(0)
      }
    })
    return () => unsubscribe()
  }, [user?.uid])

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredResorts = resorts.filter((resort) => {
    if (!normalizedQuery) return true
    return [
      resort.name,
      resort.type,
      resort.address,
      resort.description
    ].some((value) => value?.toLowerCase().includes(normalizedQuery))
  })

  const featuredResort = filteredResorts[0] || resorts[0] || null
  const activeResultsCount = normalizedQuery ? filteredResorts.length : resorts.length

  const categories = [
    { id: 'resort', label: 'Rooms', icon: 'fa-hotel', path: '/rooms' },
    { id: 'destination', label: 'Destination', icon: 'fa-globe-asia', path: '/discover' },
    { id: 'food', label: 'Activities', icon: 'fa-utensils', path: '/activity' },
    { id: 'crafts', label: 'Gallery', icon: 'fa-images', path: '/gallery' },
    { id: 'wallet', label: 'Wallet', icon: 'fa-wallet', path: '/wallet' }
  ]

  return (
    <div className="mh-container">
      <header className="mh-header animate-fade-in">
        <div className="mh-location">
          <div className="mh-location-text">
            <span>Live Marketplace</span>
            <strong>{activeResultsCount} Resorts Ready To Explore</strong>
          </div>
        </div>
        <div className="mh-header-actions">
          <button className="mh-bell" type="button" onClick={() => setShowNotificationModal(true)}>
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && <span className="dot"></span>}
          </button>
        </div>
      </header>

      <main className="mh-main">
        <section className="mh-hero animate-slide-up" style={{ '--delay': '0.1s' }}>
          <div className="mh-hero-wrapper">
            <img src={featuredResort?.mainPhoto || FALLBACK_IMAGE} alt={featuredResort?.name || 'Resort'} />
            <div className="mh-hero-overlay"></div>
            <div className="mh-hero-text">
              <span className="mh-hero-badge">{featuredResort?.type || 'Featured Destination'}</span>
              <h1>{featuredResort ? featuredResort.name : 'Discover Your Next Resort Stay'}</h1>
              <p>{featuredResort ? featuredResort.address : 'Find real resorts uploaded by owners in the app.'}</p>
              {featuredResort && (
                <button className="mh-hero-btn" type="button" onClick={() => navigate(`/resorts/${featuredResort.id}`)}>
                  View Resort
                  <i className="fas fa-arrow-right"></i>
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="mh-search animate-slide-up" style={{ '--delay': '0.15s' }}>
          <div className="mh-search-bar">
            <input
              type="text"
              placeholder="Search resorts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="mh-search-btn" type="button" aria-label="Search resorts">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </section>

        <section className="mh-categories animate-slide-up" style={{ '--delay': '0.2s' }}>
          <div className="mh-cat-grid">
            {categories.map((cat) => (
              <Link to={cat.path} key={cat.id} className="mh-cat-item">
                <div className="mh-cat-icon">
                  <i className={`fas ${cat.icon}`}></i>
                </div>
                <span>{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mh-popular animate-slide-up" style={{ '--delay': '0.3s' }}>
          <div className="mh-section-head">
            <div>
              <h2>Resorts In The App</h2>
              <p>{activeResultsCount} listing{activeResultsCount === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="mh-dest-grid">
            {loadingResorts && <div className="mh-empty">Loading resorts...</div>}
            {!loadingResorts && filteredResorts.length === 0 && (
              <div className="mh-empty">
                {resorts.length ? 'No resorts match your search.' : 'No approved resorts uploaded yet.'}
              </div>
            )}
            {!loadingResorts && filteredResorts.map((resort) => (
              <button key={resort.id} className="mh-dest-card" type="button" onClick={() => navigate(`/resorts/${resort.id}`)}>
                <div className="mh-dest-img">
                  <img src={resort.mainPhoto} alt={resort.name} />
                </div>
                <div className="mh-dest-content">
                  <span className="mh-dest-type">{resort.type}</span>
                  <h3 className="mh-dest-name">{resort.name}</h3>
                  <p className="mh-dest-address">
                    <i className="fas fa-map-marker-alt"></i>
                    {resort.address}
                  </p>
                  <div className="mh-dest-footer">
                    <div className="mh-dest-stats">
                      <span><i className="fas fa-bed"></i>{resort.rooms.length}</span>
                      <span><i className="fas fa-person-hiking"></i>{resort.activities.length}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
      {showNotificationModal && (
        <NotificationModal
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
          userId={user?.uid || null}
        />
      )}
    </div>
  )
}

export default Home
