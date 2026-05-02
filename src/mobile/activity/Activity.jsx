import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, onValue } from 'firebase/database'
import { db } from '../../firebase'
import BottomNav from '../../components/BottomNav'
import './Activity.css'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'

const Activity = () => {
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('newest') // 'newest' or 'popular'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setActivities([])
        setLoading(false)
        return
      }

      // Get approved resorts
      const approvedResorts = Object.entries(value)
        .filter(([, item]) => item?.status === 'approved' || item?.status === 'accepted')
        .map(([resortId, item]) => {
          const resortActivities = item?.activities || []
          return resortActivities.map((activity, index) => ({
            ...activity,
            resortId,
            resortName: item?.resortName || 'Unknown Resort',
            resortType: item?.resortType || 'Resort',
            mainPhoto: item?.mainPhotoUrl || item?.resortProfile?.mainPhotoUrl || FALLBACK_IMAGE,
            activityIndex: index,
            createdAt: item?.createdAt || new Date(0).toISOString()
          }))
        })
        .flat()

      setActivities(approvedResorts)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Filter activities based on search query
  const filteredActivities = useMemo(() => {
    if (!searchQuery.trim()) return activities

    const query = searchQuery.toLowerCase().trim()
    return activities.filter(activity => 
      activity.title?.toLowerCase().includes(query) ||
      activity.description?.toLowerCase().includes(query) ||
      activity.category?.toLowerCase().includes(query) ||
      activity.resortName?.toLowerCase().includes(query)
    )
  }, [activities, searchQuery])

  // Sort activities
  const sortedActivities = useMemo(() => {
    const sorted = [...filteredActivities]
    
    if (sortBy === 'newest') {
      // Sort by resort createdAt first, then by activity index to maintain order within resort
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0)
        const dateB = new Date(b.createdAt || 0)
        if (dateB - dateA !== 0) {
          return dateB - dateA
        }
        // For same resort, keep original order
        return a.activityIndex - b.activityIndex
      })
    } else if (sortBy === 'popular') {
      // Sort by activity price descending (higher price = more premium = popular)
      // Or we could sort by resort name alphabetically as a proxy
      sorted.sort((a, b) => {
        // Prioritize activities with higher price
        const priceA = a.price || 0
        const priceB = b.price || 0
        if (priceB !== priceA) {
          return priceB - priceA
        }
        // Then by resort name
        return (a.resortName || '').localeCompare(b.resortName || '')
      })
    }

    return sorted
  }, [filteredActivities, sortBy])

  const formatPrice = (price) => {
    if (price === 0 || price === '0' || price === 'Free') return 'Free'
    const numPrice = typeof price === 'string' ? parseFloat(price.replace(/[^0-9.]/g, '')) : price
    return `₱${typeof numPrice === 'number' ? numPrice.toLocaleString() : numPrice}`
  }

  if (loading) {
    return (
      <div className="ma-container">
        <header className="ma-header">
          <button className="ma-back-btn" onClick={() => navigate(-1)}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <h2>Activities</h2>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="ma-main">
          <div className="ma-loading">Loading activities...</div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="ma-container">
      {/* Header */}
      <header className="ma-header">
        <button className="ma-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2>Activities</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="ma-main">
        {/* Search Bar */}
        <section className="ma-search-section animate-slide-up" style={{ "--delay": "0.1s" }}>
          <div className="ma-search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search activities or resorts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="ma-search-clear" onClick={() => setSearchQuery('')}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </section>

        {/* Sort Options */}
        <section className="ma-sort-section animate-slide-up" style={{ "--delay": "0.15s" }}>
          <div className="ma-sort-options">
            <button
              className={`ma-sort-btn ${sortBy === 'newest' ? 'active' : ''}`}
              onClick={() => setSortBy('newest')}
            >
              <i className="fas fa-clock"></i>
              <span>Newest</span>
            </button>
            <button
              className={`ma-sort-btn ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => setSortBy('popular')}
            >
              <i className="fas fa-fire"></i>
              <span>Popular</span>
            </button>
          </div>
        </section>

        {/* Results Count */}
        <section className="ma-results-info animate-slide-up" style={{ "--delay": "0.2s" }}>
          <p>
            {searchQuery 
              ? `Found ${sortedActivities.length} result${sortedActivities.length !== 1 ? 's' : ''}`
              : `Showing all ${sortedActivities.length} activities`
            }
          </p>
        </section>

        {/* Activities List */}
        <section className="ma-activities-section animate-slide-up" style={{ "--delay": "0.25s" }}>
          {sortedActivities.length === 0 ? (
            <div className="ma-empty-state">
              <i className="fas fa-search"></i>
              <p>No activities found</p>
              <small>Try adjusting your search terms</small>
            </div>
          ) : (
            <div className="ma-activity-list">
              {sortedActivities.map((activity, index) => (
                <button
                  key={`${activity.resortId}-${activity.activityIndex}`}
                  className="ma-activity-card"
                  type="button"
                  onClick={() => navigate(`/resorts/${activity.resortId}`)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="ma-activity-img">
                    <img 
                      src={activity.photoUrl || activity.image || activity.mainPhoto || FALLBACK_IMAGE} 
                      alt={activity.title} 
                      onError={(e) => { e.target.src = FALLBACK_IMAGE }}
                    />
                    <div className="ma-activity-price">
                      {formatPrice(activity.price)}
                      {activity.unit ? `/${activity.unit.replace('/', '')}` : ''}
                    </div>
                    <div className="ma-activity-resort-badge">
                      {activity.resortName}
                    </div>
                  </div>
                  <div className="ma-activity-info">
                    <div className="ma-activity-title-row">
                      <h4>{activity.title}</h4>
                      {activity.icon && <i className={`fas ${activity.icon}`}></i>}
                    </div>
                    <p>{activity.description || 'No description available'}</p>
                    <div className="ma-activity-meta">
                      <span className="ma-activity-category">
                        <i className="fas fa-tag"></i>
                        {activity.category || 'General'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

export default Activity
