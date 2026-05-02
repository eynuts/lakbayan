import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, onValue } from 'firebase/database'
import { db } from '../../firebase'
import { getEffectiveBookingStatus, isRefundedBooking } from '../../utils/bookingStatus'
import BottomNav from '../../components/BottomNav'
import './Discover.css'

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1571896349842-6e85a0c429ce?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
]

const Discover = () => {
  const navigate = useNavigate()
  const [resorts, setResorts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('popular') // 'popular', 'newest', 'rooms', 'activities'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const resortsRef = ref(db, 'resortApplications')
    const bookingsRef = ref(db, 'bookings')

    let resortSnapshotValue = null
    let bookingSnapshotValue = null

    const syncDiscover = () => {
      if (resortSnapshotValue === null || bookingSnapshotValue === null) return

      const bookings = bookingSnapshotValue
        ? Object.values(bookingSnapshotValue).filter(Boolean)
        : []

      const approvedResorts = Object.entries(resortSnapshotValue || {})
        .filter(([, item]) => (item?.status === 'approved' || item?.status === 'accepted') && !item?.blacklisted)
        .map(([id, item], index) => {
          const profile = item?.resortProfile || {}
          const gallery = Array.isArray(item?.gallery) ? item.gallery : []
          const rooms = Array.isArray(item?.rooms) ? item.rooms : []
          const activities = Array.isArray(item?.activities) ? item.activities : []
          const bookingCount = bookings.filter(booking => booking?.resortId === id).length
          const confirmedCount = bookings.filter(
            (booking) =>
              booking?.resortId === id &&
              !isRefundedBooking(booking) &&
              getEffectiveBookingStatus(booking) === 'confirmed'
          ).length
          const image =
            profile.mainPhotoUrl ||
            item?.mainPhotoUrl ||
            gallery[0]?.url ||
            FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]

          return {
            id,
            name: item?.resortName || 'Unnamed Resort',
            type: item?.resortType || 'Resort',
            address: profile.address || item?.location || 'Mansalay, Oriental Mindoro',
            description:
              profile.description ||
              item?.description ||
              'A beautiful resort experience waiting for you.',
            image,
            gallery,
            bookingCount,
            confirmedCount,
            roomCount: rooms.length,
            activityCount: activities.length,
            rating: (4 + Math.random() * 1.5).toFixed(1), // Simulated rating
            priceRange: item?.priceRange || '₱1,000 - ₱3,000',
            createdAt: item?.createdAt || new Date(0).toISOString()
          }
        })

      setResorts(approvedResorts)
      setLoading(false)
    }

    const unsubscribeResorts = onValue(resortsRef, (snapshot) => {
      resortSnapshotValue = snapshot.val()
      syncDiscover()
    })

    const unsubscribeBookings = onValue(bookingsRef, (snapshot) => {
      bookingSnapshotValue = snapshot.val()
      syncDiscover()
    })

    return () => {
      unsubscribeResorts()
      unsubscribeBookings()
    }
  }, [])

  // Search filter
  const filteredResorts = useMemo(() => {
    if (!searchQuery.trim()) return resorts

    const query = searchQuery.toLowerCase().trim()
    return resorts.filter(resort =>
      resort.name?.toLowerCase().includes(query) ||
      resort.type?.toLowerCase().includes(query) ||
      resort.address?.toLowerCase().includes(query) ||
      resort.description?.toLowerCase().includes(query)
    )
  }, [resorts, searchQuery])

  // Sort resorts
  const sortedResorts = useMemo(() => {
    const sorted = [...filteredResorts]

    switch (sortBy) {
      case 'popular':
        sorted.sort((a, b) => {
          if (b.bookingCount !== a.bookingCount) return b.bookingCount - a.bookingCount
          if (b.confirmedCount !== a.confirmedCount) return b.confirmedCount - a.confirmedCount
          return a.name.localeCompare(b.name)
        })
        break
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        break
      case 'rooms':
        sorted.sort((a, b) => b.roomCount - a.roomCount)
        break
      case 'activities':
        sorted.sort((a, b) => b.activityCount - a.activityCount)
        break
      default:
        break
    }

    return sorted
  }, [filteredResorts, sortBy])

  const formatNumber = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num
  }

  const SkeletonCard = () => (
    <div className="md-skeleton-card">
      <div className="md-skeleton-img"></div>
      <div className="md-skeleton-content">
        <div className="md-skeleton-header">
          <div className="md-skeleton-type"></div>
          <div className="md-skeleton-rating"></div>
        </div>
        <div className="md-skeleton-title"></div>
        <div className="md-skeleton-address"></div>
        <div className="md-skeleton-stats">
          <div className="md-skeleton-stat"></div>
          <div className="md-skeleton-stat"></div>
          <div className="md-skeleton-stat"></div>
        </div>
        <div className="md-skeleton-price"></div>
      </div>
    </div>
  )

  return (
    <div className="md-container animate-fade-in">
      {/* Header */}
      <header className="md-header">
        <button className="md-back-btn" onClick={() => navigate('/mobile-home')}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2>Discover Resorts</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="md-main">
        {/* Search Bar */}
        <section className="md-search-section animate-slide-up" style={{ '--delay': '0.05s' }}>
          <div className="md-search-wrapper">
            <div className="md-search-bar">
              <i className="fas fa-search"></i>
              <input
                type="text"
                placeholder="Search resorts by name, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="md-search-clear" onClick={() => setSearchQuery('')}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            <button className="md-filter-btn">
              <i className="fas fa-sliders-h"></i>
            </button>
          </div>
        </section>

        {/* Sort Options */}
        <section className="md-sort-section animate-slide-up" style={{ '--delay': '0.1s' }}>
          <div className="md-sort-tabs">
            <button
              className={`md-sort-tab ${sortBy === 'popular' ? 'active' : ''}`}
              onClick={() => setSortBy('popular')}
            >
              <i className="fas fa-fire"></i>
              <span>Popular</span>
            </button>
            <button
              className={`md-sort-tab ${sortBy === 'newest' ? 'active' : ''}`}
              onClick={() => setSortBy('newest')}
            >
              <i className="fas fa-clock"></i>
              <span>Newest</span>
            </button>
            <button
              className={`md-sort-tab ${sortBy === 'rooms' ? 'active' : ''}`}
              onClick={() => setSortBy('rooms')}
            >
              <i className="fas fa-bed"></i>
              <span>Rooms</span>
            </button>
            <button
              className={`md-sort-tab ${sortBy === 'activities' ? 'active' : ''}`}
              onClick={() => setSortBy('activities')}
            >
              <i className="fas fa-person-hiking"></i>
              <span>Activities</span>
            </button>
          </div>
        </section>

        {/* Results Header */}
        {!loading && resorts.length > 0 && (
          <section className="md-results-header animate-slide-up" style={{ '--delay': '0.15s' }}>
            <p>
              {searchQuery 
                ? `${sortedResorts.length} result${sortedResorts.length !== 1 ? 's' : ''} found`
                : `${sortedResorts.length} resorts available`
              }
            </p>
          </section>
        )}

        {/* Featured/Hero Resort */}
        {loading ? (
          <div className="md-skeleton-hero animate-slide-up" style={{ '--delay': '0.2s' }}></div>
        ) : sortedResorts.length > 0 && !searchQuery && (
          <section className="md-hero-section animate-slide-up" style={{ '--delay': '0.2s' }}>
            <button
              type="button"
              className="md-hero-card"
              onClick={() => navigate(`/resorts/${sortedResorts[0].id}`)}
            >
              <div className="md-hero-img">
                <img src={sortedResorts[0].image} alt={sortedResorts[0].name} />
                <div className="md-hero-overlay"></div>
                <div className="md-hero-badges">
                  <div className="md-hero-rank-badge">
                    <i className="fas fa-fire"></i>
                    <span>#1 Trending</span>
                  </div>
                  <button className="md-wishlist-btn" onClick={(e) => { e.stopPropagation(); }}>
                    <i className="far fa-heart"></i>
                  </button>
                </div>
              </div>
              <div className="md-hero-content">
                <div className="md-hero-top-info">
                  <span className="md-hero-type">{sortedResorts[0].type}</span>
                  <div className="md-hero-rating">
                    <i className="fas fa-star"></i>
                    <span>{sortedResorts[0].rating || '4.5'}</span>
                  </div>
                </div>
                <h3 className="md-hero-title">{sortedResorts[0].name}</h3>
                <p className="md-hero-location">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>{sortedResorts[0].address}</span>
                </p>
                <div className="md-hero-footer">
                  <div className="md-hero-stats-group">
                    <div className="md-hero-stat-item">
                      <i className="fas fa-calendar-check"></i>
                      <span>{formatNumber(sortedResorts[0].bookingCount)} Bookings</span>
                    </div>
                    <div className="md-hero-stat-item">
                      <i className="fas fa-bed"></i>
                      <span>{sortedResorts[0].roomCount} Rooms</span>
                    </div>
                  </div>
                  <div className="md-hero-price-tag">
                    <small>From</small>
                    <strong>{sortedResorts[0].priceRange.split(' ')[0]}</strong>
                  </div>
                </div>
              </div>
            </button>
          </section>
        )}

        {/* Resorts Grid */}
        <section className={`md-resorts-section ${searchQuery ? '' : 'with-hero'}`} 
                 style={{ '--delay': searchQuery ? '0.1s' : '0.3s' }}>
          <div className="md-section-head">
            <h3>{searchQuery ? 'Search Results' : 'Explore More Resorts'}</h3>
            {!searchQuery && (
              <p>Top-rated destinations chosen by travelers.</p>
            )}
          </div>

          {loading ? (
            <div className="md-resort-grid">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : sortedResorts.length === 0 ? (
            <div className="md-empty-state">
              <i className="fas fa-search"></i>
              <p>No resorts found</p>
              <small>Try adjusting your search terms or filters</small>
            </div>
          ) : (
            <div className="md-resort-grid">
              {sortedResorts.slice(searchQuery ? 0 : 1).map((resort, index) => (
                <button
                  key={resort.id}
                  type="button"
                  className="md-resort-card"
                  onClick={() => navigate(`/resorts/${resort.id}`)}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className="md-resort-img">
                    <img src={resort.image} alt={resort.name} onError={(e) => e.target.src = FALLBACK_IMAGES[0]} />
                    {!searchQuery && (
                      <div className="md-resort-rank">
                        #{index + (searchQuery ? 1 : 2)}
                      </div>
                    )}
                    <button className="md-wishlist-btn small" onClick={(e) => { e.stopPropagation(); }}>
                      <i className="far fa-heart"></i>
                    </button>
                    <div className="md-resort-overlay">
                      <div className="md-resort-view-btn">View Details</div>
                    </div>
                  </div>
                  <div className="md-resort-content">
                    <div className="md-resort-header">
                      <span className="md-resort-type">{resort.type}</span>
                      <div className="md-resort-rating">
                        <i className="fas fa-star"></i>
                        <span>{resort.rating || '4.5'}</span>
                      </div>
                    </div>
                    <h4>{resort.name}</h4>
                    <p className="md-resort-address">
                      <i className="fas fa-map-marker-alt"></i>
                      {resort.address}
                    </p>
                    <div className="md-resort-stats">
                      <span><i className="fas fa-calendar-check"></i>{formatNumber(resort.bookingCount)}</span>
                      <span><i className="fas fa-bed"></i>{resort.roomCount}</span>
                      <span><i className="fas fa-person-hiking"></i>{resort.activityCount}</span>
                    </div>
                    <div className="md-resort-footer">
                      <div className="md-resort-price">
                        {resort.priceRange}
                      </div>
                      <div className="md-resort-arrow">
                        <i className="fas fa-chevron-right"></i>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Info Section */}
        {!searchQuery && !loading && (
          <section className="md-info-section animate-slide-up" style={{ '--delay': '0.4s' }}>
            <div className="md-info-card">
              <div className="md-info-icon">
                <i className="fas fa-info-circle"></i>
              </div>
              <div className="md-info-content">
                <h4>How We Rank</h4>
                <p>Resorts are ranked based on booking activity and traveler ratings to help you find the best experiences.</p>
              </div>
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default Discover
