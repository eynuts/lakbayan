import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { db } from '../../firebase'
import './Rooms.css'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
const resortPinIcon = L.divIcon({
  className: 'mr-resort-pin',
  html: '<span class="mr-resort-pin__shadow"></span><span class="mr-resort-pin__body"><span class="mr-resort-pin__core"></span></span>',
  iconSize: [34, 48],
  iconAnchor: [17, 44]
})

const Rooms = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('popularity')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [showMapModal, setShowMapModal] = useState(false)
  const [accommodations, setAccommodations] = useState([])
  const [loading, setLoading] = useState(true)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const navigate = useNavigate()

  const sortOptions = [
    { id: 'popularity', label: 'Most Popular', icon: 'fa-star' },
    { id: 'price-low', label: 'Price: Lowest to Highest', icon: 'fa-arrow-up-wide-short' },
    { id: 'price-high', label: 'Price: Highest to Lowest', icon: 'fa-arrow-down-wide-short' },
    { id: 'newest', label: 'Newest to Oldest', icon: 'fa-calendar-plus' },
    { id: 'oldest', label: 'Oldest to Newest', icon: 'fa-calendar' }
  ]

  const categories = [
    { id: 'all', label: 'All Rooms' }
  ]

  useEffect(() => {
    window.scrollTo(0, 0)
    
    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setAccommodations([])
        setLoading(false)
        return
      }

      const allApprovedRooms = Object.entries(value)
        .filter(([, item]) => item?.status === 'approved' || item?.status === 'accepted')
        .flatMap(([resortId, item]) => {
          const resortRooms = Array.isArray(item?.rooms) ? item.rooms : []
          const resortProfile = item?.resortProfile || {}
          const resortAddress = resortProfile.address || item?.location || 'Address not available'
          return resortRooms.map((room, index) => ({
            ...room,
            id: `${resortId}-${index}`,
            dbId: resortId,
            resortName: item.resortName || 'Unnamed Resort',
            resortAddress,
            resortLatitude: Number(resortProfile.latitude),
            resortLongitude: Number(resortProfile.longitude),
            title: room.name || 'Unnamed Room',
            subtitle: room.type || 'Standard',
            image: room.photoUrl || FALLBACK_IMAGE,
            price: Number(room.price) || 0,
            capacity: room.capacity ? `Up to ${room.capacity} guests` : 'Capacity not set',
            popular: !!room.popular || index === 0,
            features: room.amenities || ['Standard amenities'],
            category: (room.type || 'room').toLowerCase().includes('kubo') ? 'kubo' : 'house'
          }))
        })

      setAccommodations(allApprovedRooms)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const sortedAndFilteredRooms = useMemo(() => {
    let result = accommodations
    
    // Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(room => 
        room.title.toLowerCase().includes(query) || 
        room.subtitle.toLowerCase().includes(query) ||
        (room.description && room.description.toLowerCase().includes(query))
      )
    }
    
    // Sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          return (b.popular ? 1 : 0) - (a.popular ? 1 : 0)
        case 'price-low':
          return a.price - b.price
        case 'price-high':
          return b.price - a.price
        case 'newest':
          return b.id.localeCompare(a.id)
        default:
          return 0
      }
    })
    
    return result
  }, [searchQuery, sortBy, accommodations])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(price)
  }

  useEffect(() => {
    if (
      !showMapModal ||
      !selectedRoom ||
      !mapContainerRef.current ||
      typeof selectedRoom.resortLatitude !== 'number' ||
      typeof selectedRoom.resortLongitude !== 'number' ||
      Number.isNaN(selectedRoom.resortLatitude) ||
      Number.isNaN(selectedRoom.resortLongitude)
    ) {
      return
    }

    const coordinates = [selectedRoom.resortLatitude, selectedRoom.resortLongitude]

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        scrollWheelZoom: false,
        dragging: !L.Browser.mobile,
        touchZoom: true,
        zoomControl: true
      }).setView(coordinates, 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapRef.current)

      markerRef.current = L.marker(coordinates, { icon: resortPinIcon }).addTo(mapRef.current)
    } else {
      mapRef.current.setView(coordinates, 15)
      markerRef.current?.setLatLng(coordinates)
    }

    setTimeout(() => {
      mapRef.current?.invalidateSize()
    }, 0)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
    }
  }, [showMapModal, selectedRoom])

  return (
    <div className="mr-container">
      {/* Header */}
      <header className="mr-header">
        <button className="mr-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Select Room</h2>
        <div style={{width: '40px'}}></div>
      </header>

       {/* Search and Sort Section */}
       <div className="mr-search-section animate-fade-in">
         <div className="mr-search-bar">
           <i className="fas fa-search search-icon"></i>
           <input 
             type="text" 
             placeholder="Search by room name or type..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
           {searchQuery && (
             <button className="clear-search" onClick={() => setSearchQuery('')}>
               <i className="fas fa-times-circle"></i>
             </button>
           )}
         </div>
         <button 
           className={`mr-sort-btn ${sortBy !== 'popularity' ? 'active' : ''}`}
           onClick={() => setShowSortMenu(true)}
         >
           <i className="fas fa-sliders-h"></i>
         </button>
       </div>

       {/* Room List */}
      <div className="mr-list">
        {sortedAndFilteredRooms.length > 0 ? (
          sortedAndFilteredRooms.map((room) => (
          <div key={room.id} className="mr-card animate-slide-up">
            <div className="mr-card-img">
              <img src={room.image} alt={room.title} />
              {room.popular && <span className="mr-badge-popular">Popular</span>}
            </div>
            <div className="mr-card-body">
              <div className="mr-card-header">
                <div className="mr-resort-owner">
                  by {room.resortName}
                </div>
                <div>
                  <span className="mr-subtitle">{room.subtitle}</span>
                  <h3>{room.title}</h3>
                </div>
                <div className="mr-price-tag">
                  <span className="amount">{formatPrice(room.price)}</span>
                  <span className="unit">/night</span>
                </div>
              </div>

              <div className="mr-capacity">
                <i className="fas fa-user-group"></i>
                <span>{room.capacity}</span>
              </div>

              <div className="mr-features">
                {room.features.slice(0, 3).map((f, i) => (
                  <span key={i} className="mr-feature-pill">{f}</span>
                ))}
              </div>

              <button className="mr-view-btn" onClick={() => setSelectedRoom(room)}>
                View Details
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="mr-empty-search animate-fade-in">
          <i className={loading ? "fas fa-spinner fa-spin" : "fas fa-search"}></i>
          <p>{loading ? "Syncing with database..." : "No rooms match your search."}</p>
          {!loading && <button onClick={() => {setSearchQuery(''); setActiveCategory('all');}}>Clear all filters</button>}
        </div>
      )}
      </div>

      {/* Sort Menu Bottom Sheet */}
      {showSortMenu && (
        <div className="mr-modal-overlay animate-fade-in" onClick={() => setShowSortMenu(false)}>
          <div className="mr-sort-sheet animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mr-sort-header">
              <h3>Sort By</h3>
              <button onClick={() => setShowSortMenu(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="mr-sort-options">
              {sortOptions.map(option => (
                <button 
                  key={option.id}
                  className={`mr-sort-option ${sortBy === option.id ? 'active' : ''}`}
                  onClick={() => {
                    setSortBy(option.id)
                    setShowSortMenu(false)
                  }}
                >
                  <i className={`fas ${option.icon}`}></i>
                  <span>{option.label}</span>
                  {sortBy === option.id && <i className="fas fa-check check-icon"></i>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedRoom && (
        <div className="mr-modal-overlay animate-fade-in" onClick={() => setSelectedRoom(null)}>
          <div className="mr-modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mr-modal-img">
              <img src={selectedRoom.image} alt={selectedRoom.title} />
              <button className="mr-close-btn" onClick={() => setSelectedRoom(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mr-modal-body">
              <div className="mr-modal-header">
                <h3>{selectedRoom.title}</h3>
                <span className="mr-modal-price">{formatPrice(selectedRoom.price)}/night</span>
              </div>
              <div className="mr-modal-resort-meta">
                <span className="mr-modal-resort-name">{selectedRoom.resortName}</span>
                <p className="mr-modal-address">
                  <i className="fas fa-location-dot"></i>
                  <span>{selectedRoom.resortAddress}</span>
                </p>
              </div>
              <p className="mr-modal-desc">{selectedRoom.description}</p>
              
              <h4>Features</h4>
              <ul className="mr-modal-features">
                {selectedRoom.features.map((f, i) => (
                  <li key={i}><i className="fas fa-check-circle"></i> {f}</li>
                ))}
              </ul>

              <button
                className="mr-map-btn"
                onClick={() => setShowMapModal(true)}
                disabled={
                  typeof selectedRoom.resortLatitude !== 'number' ||
                  typeof selectedRoom.resortLongitude !== 'number' ||
                  Number.isNaN(selectedRoom.resortLatitude) ||
                  Number.isNaN(selectedRoom.resortLongitude)
                }
              >
                <i className="fas fa-map-location-dot"></i>
                {typeof selectedRoom.resortLatitude === 'number' &&
                typeof selectedRoom.resortLongitude === 'number' &&
                !Number.isNaN(selectedRoom.resortLatitude) &&
                !Number.isNaN(selectedRoom.resortLongitude)
                  ? 'View Resort Map'
                  : 'Map Not Available'}
              </button>

              <button 
                className="mr-book-btn"
                onClick={() => navigate('/booking', { state: { 
                  room: selectedRoom,
                  resortId: selectedRoom.dbId,
                  resortName: selectedRoom.resortName
                } })}
              >
                Proceed to Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {showMapModal && selectedRoom && (
        <div className="mr-map-modal-overlay animate-fade-in" onClick={() => setShowMapModal(false)}>
          <div className="mr-map-modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="mr-map-modal-handle">
              <span />
            </div>
            <div className="mr-map-modal-header">
              <div className="mr-map-modal-copy">
                <span className="mr-map-modal-kicker">Resort Location</span>
                <h3>{selectedRoom.resortName}</h3>
                <p>{selectedRoom.resortAddress}</p>
                <div className="mr-map-modal-meta">
                  <span className="mr-map-meta-pill">
                    <i className="fas fa-location-crosshairs"></i>
                    Live Pin
                  </span>
                  <span className="mr-map-meta-pill is-soft">
                    <i className="fas fa-map"></i>
                    Tap and zoom map
                  </span>
                </div>
              </div>
              <button className="mr-map-close-btn" onClick={() => setShowMapModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mr-map-frame">
              <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
            </div>
            <div className="mr-map-modal-footer">
              <div className="mr-map-coords">
                <span>Lat {selectedRoom.resortLatitude?.toFixed?.(5)}</span>
                <span>Lng {selectedRoom.resortLongitude?.toFixed?.(5)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Rooms
