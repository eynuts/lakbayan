import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './ResortDetail.css'

// Fix for default marker icon in Leaflet + React
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

const resortPinIcon = L.divIcon({
  className: 'rd-resort-pin',
  html: '<span class="rd-resort-pin__shadow"></span><span class="rd-resort-pin__body"><span class="rd-resort-pin__core"></span></span>',
  iconSize: [34, 48],
  iconAnchor: [17, 44]
})

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'

const ResortDetail = () => {
  const navigate = useNavigate()
  const { resortId } = useParams()
  const [loading, setLoading] = useState(true)
  const [resort, setResort] = useState(null)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [translatedAddress, setTranslatedAddress] = useState(null)
  const [expandedDescription, setExpandedDescription] = useState(false)
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  // Function to check if a string is coordinates (latitude, longitude)
  const isCoordinates = (str) => {
    if (!str) return false
    const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/
    return coordPattern.test(str.trim())
  }

  // Function to reverse geocode coordinates to address
  const reverseGeocodeCoordinates = async (lat, lng) => {
    try {
      // Using OpenStreetMap Nominatim API with address details
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json'
          }
        }
      )
      const data = await response.json()
      if (data.address) {
        // Build a detailed address from all available components
        const address = data.address
        const parts = []
        
        // Priority order for most detailed address
        if (address.house_number) parts.push(address.house_number)
        if (address.road || address.street) parts.push(address.road || address.street)
        if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood)
        if (address.hamlet) parts.push(address.hamlet)
        if (address.village) parts.push(address.village)
        if (address.town || address.city) parts.push(address.town || address.city)
        if (address.county) parts.push(address.county)
        if (address.municipality) parts.push(address.municipality)
        if (address.province || address.state) parts.push(address.province || address.state)
        if (address.postcode) parts.push(address.postcode)
        if (address.country) parts.push(address.country)
        
        // Remove duplicates and filter empty values
        const uniqueParts = [...new Set(parts.filter(p => p && p.trim()))]
        const fullAddress = uniqueParts.join(', ')
        
        return fullAddress || data.display_name
      }
      return null
    } catch (err) {
      console.error('Geocoding error:', err)
      return null
    }
  }

  const getAmenityIcon = (name) => {
    const map = {
      'Air Conditioning': 'fa-snowflake',
      'Free Wi-Fi': 'fa-wifi',
      'Smart TV': 'fa-tv',
      'Hot Shower': 'fa-shower',
      'Room Safe': 'fa-lock',
      'Mini Bar': 'fa-glass-cheers',
      'Balcony': 'fa-mountain',
      'King Size Bed': 'fa-bed'
    }
    return map[name] || 'fa-star'
  }

  useEffect(() => {
    if (!resortId) {
      setLoading(false)
      return
    }

    const resortRef = ref(db, `resortApplications/${resortId}`)
    const unsubscribe = onValue(resortRef, (snapshot) => {
      const item = snapshot.val()

      if (!item || (item?.status !== 'approved' && item?.status !== 'accepted') || item?.blacklisted) {
        setResort(null)
        setLoading(false)
        return
      }

      const profile = item?.resortProfile || {}
      const rooms = Array.isArray(item?.rooms) ? item.rooms : []
      const activities = Array.isArray(item?.activities) ? item.activities : []
      const gallery = Array.isArray(item?.gallery) ? item.gallery : []
      const mainPhoto =
        profile.mainPhotoUrl ||
        item?.mainPhotoUrl ||
        gallery[0]?.url ||
        rooms[0]?.photoUrl ||
        FALLBACK_IMAGE

      const address = profile.address || item?.location || 'Location not provided'

      setResort({
        id: resortId,
        name: item?.resortName || 'Unnamed Resort',
        type: item?.resortType || 'Resort',
        description: profile.description || item?.description || 'No description yet.',
        address: address,
        contactNumber: profile.contactNumber || item?.contactNumber || '',
        email: profile.email || item?.email || item?.ownerEmail || '',
        website: profile.website || '',
        entranceFee: profile.entranceFee || '',
        latitude: Number(profile.latitude),
        longitude: Number(profile.longitude),
        mainPhoto,
        rooms,
        activities,
        gallery,
        visibility: {
          showMainPhoto: profile.visibility?.showMainPhoto ?? true,
          showDescription: profile.visibility?.showDescription ?? true,
          showContacts: profile.visibility?.showContacts ?? true,
          showAmenities: profile.visibility?.showAmenities ?? true,
          showRooms: profile.visibility?.showRooms ?? true,
          showActivities: profile.visibility?.showActivities ?? true,
          showGallery: profile.visibility?.showGallery ?? true
        }
      })
      setLoading(false)
    })

    return () => unsubscribe()
  }, [resortId])

  // Separate effect to translate coordinates
  useEffect(() => {
    if (!resort || !resort.address) return

    const translateAddressIfNeeded = async () => {
      if (isCoordinates(resort.address)) {
        const [lat, lng] = resort.address.split(',').map(val => parseFloat(val.trim()))
        const translatedAddr = await reverseGeocodeCoordinates(lat, lng)
        if (translatedAddr) {
          setTranslatedAddress(translatedAddr)
          setResort(prev => ({
            ...prev,
            address: translatedAddr
          }))
        }
      }
    }

    translateAddressIfNeeded()
  }, [resort?.id])

   const heroImages = useMemo(() => {
     if (!resort) return []
     const images = [
       resort.mainPhoto,
       ...resort.gallery.map((photo) => photo.url),
       ...resort.rooms.map((room) => room.photoUrl),
       ...resort.activities.map((activity) => activity.photoUrl)
     ].filter(Boolean)

     return [...new Set(images)].slice(0, 5)
   }, [resort])

   const galleryImages = useMemo(() => {
     if (!resort) return []
     return resort.gallery
       .filter(photo => photo?.url)
       .map((photo, index) => ({
         id: `${resort.id}-${index}`,
         url: photo.url,
         caption: photo.caption || `${resort.name} - Photo ${index + 1}`,
         category: photo.category || 'Resort'
       }))
   }, [resort])

  const formatPrice = (price) => {
    if (!price) return 'Price on request'
    const numeric = Number(price)
    if (Number.isNaN(numeric)) return price
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(numeric)
  }

  const phoneHref = resort?.contactNumber ? `tel:${resort.contactNumber.replace(/\s+/g, '')}` : ''
  const emailHref = resort?.email ? `mailto:${resort.email}` : ''
  const websiteHref = resort?.website
    ? resort.website.startsWith('http')
      ? resort.website
      : `https://${resort.website}`
    : ''

  useEffect(() => {
    if (
      !mapContainerRef.current ||
      typeof resort?.latitude !== 'number' ||
      typeof resort?.longitude !== 'number' ||
      Number.isNaN(resort.latitude) ||
      Number.isNaN(resort.longitude)
    ) {
      return
    }

    const coordinates = [resort.latitude, resort.longitude]

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
      if (markerRef.current) {
        markerRef.current.setLatLng(coordinates)
      } else {
        markerRef.current = L.marker(coordinates, { icon: resortPinIcon }).addTo(mapRef.current)
      }
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
  }, [resort?.latitude, resort?.longitude])

  if (loading) {
    return (
      <div className="rd-container">
        <header className="rd-header">
          <button className="rd-back-btn" onClick={() => navigate(-1)}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <h1>Resort Details</h1>
          <div style={{ width: 40 }}></div>
        </header>
        <main className="rd-main">
          <div className="rd-empty">Loading resort...</div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (!resort) {
    return (
      <div className="rd-container">
        <header className="rd-header">
          <button className="rd-back-btn" onClick={() => navigate(-1)}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <h1>Resort Details</h1>
          <div style={{ width: 40 }}></div>
        </header>
        <main className="rd-main">
          <div className="rd-empty">This resort is not available.</div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="rd-container">
      <header className="rd-header">
        <button className="rd-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h1>{resort.name}</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <main className="rd-main">
        {resort.visibility.showMainPhoto && (
          <section className="rd-hero">
            <img src={resort.mainPhoto} alt={resort.name} />
            <div className="rd-hero-overlay">
              <span className="rd-type">{resort.type}</span>
              <h2>{resort.name}</h2>
              <p>{resort.address}</p>
              <div className="rd-hero-stats">
                <span>{resort.rooms.length} Rooms</span>
                <span>{resort.activities.length} Activities</span>
                <span>{resort.gallery.length} Photos</span>
              </div>
            </div>
          </section>
        )}

        {resort.visibility.showDescription && (
          <section className="rd-card">
            <h3>About This Resort</h3>
            <div className={`rd-description ${expandedDescription ? 'rd-description--expanded' : ''}`}>
              <p>{resort.description}</p>
            </div>
            {resort.description && resort.description.length > 200 && (
              <button 
                className="rd-read-more-btn"
                onClick={() => setExpandedDescription(!expandedDescription)}
              >
                {expandedDescription ? (
                  <>
                    <span>Read less</span>
                    <i className="fas fa-chevron-up"></i>
                  </>
                ) : (
                  <>
                    <span>Read more</span>
                    <i className="fas fa-chevron-down"></i>
                  </>
                )}
              </button>
            )}
          </section>
        )}

        {resort.visibility.showContacts && (
          <section className="rd-card">
            <h3>Contact</h3>
            {resort.contactNumber && <div className="rd-detail-row"><strong>Phone</strong><a href={phoneHref}>{resort.contactNumber}</a></div>}
            {resort.email && <div className="rd-detail-row"><strong>Email</strong><a href={emailHref}>{resort.email}</a></div>}
            {resort.website && <div className="rd-detail-row"><strong>Website</strong><a href={websiteHref} target="_blank" rel="noreferrer">{resort.website}</a></div>}
            <div className="rd-detail-row"><strong>Address</strong><span>{resort.address}</span></div>
            {resort.entranceFee && <div className="rd-detail-row"><strong>Entrance Fee</strong><span>₱{resort.entranceFee}</span></div>}
            
            {typeof resort.latitude === 'number' && !Number.isNaN(resort.latitude) && typeof resort.longitude === 'number' && !Number.isNaN(resort.longitude) && (
              <div className="rd-map-container">
                <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
              </div>
            )}
          </section>
        )}

        {resort.visibility.showRooms && resort.rooms.length > 0 && (
          <section className="rd-card">
            <h3>Rooms</h3>
            <div className="rd-list">
              {resort.rooms.map((room, index) => (
                <div
                  key={`${room.name || 'room'}-${index}`}
                  className="rd-item rd-item-clickable"
                  onClick={() => setSelectedRoom(room)}
                >
                  {room.photoUrl && <img src={room.photoUrl} alt={room.name || 'Room'} />}
                  <div className="rd-item-body">
                    <div className="rd-item-head">
                      <h4>{room.name || 'Room'}</h4>
                      <span>{formatPrice(room.price)}</span>
                    </div>
                    {room.type && <p>{room.type}</p>}
                    {room.capacity && <small>Capacity: {room.capacity}</small>}
                  </div>
                  <div className="rd-item-tap-hint">
                    <i className="fas fa-chevron-right"></i>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {resort.visibility.showActivities && resort.activities.length > 0 && (
          <section className="rd-card">
            <h3>Activities</h3>
            <div className="rd-list">
              {resort.activities.map((activity, index) => (
                <div key={`${activity.name || 'activity'}-${index}`} className="rd-item">
                  {activity.photoUrl && <img src={activity.photoUrl} alt={activity.name || 'Activity'} />}
                  <div className="rd-item-body">
                    <div className="rd-item-head">
                      <h4>{activity.name || 'Activity'}</h4>
                      <span>{formatPrice(activity.price)}</span>
                    </div>
                    {activity.description && <p>{activity.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {resort.visibility.showGallery && galleryImages.length > 0 && (
          <section className="rd-card">
            <h3>Gallery</h3>
            <div className="rd-gallery">
              {galleryImages.map((image, index) => (
                <div key={image.id || index} className="rd-gallery-item">
                  <img src={image.url} alt={image.caption} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <BottomNav />

      {/* Room Detail Bottom Sheet Modal */}
      {selectedRoom && (
        <div className="rd-modal-overlay" onClick={() => setSelectedRoom(null)}>
          <div className="rd-modal-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <div className="rd-modal-handle"><span /></div>

            {/* Room Image */}
            {selectedRoom.photoUrl && (
              <div className="rd-modal-img-wrap">
                <img src={selectedRoom.photoUrl} alt={selectedRoom.name || 'Room'} />
                <button
                  className="rd-modal-close"
                  onClick={() => setSelectedRoom(null)}
                  aria-label="Close"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            )}

            {/* Content area */}
            <div className="rd-modal-body">
              {/* Badge + Name + Price */}
              <div className="rd-modal-title-row">
                <div>
                  {selectedRoom.type && (
                    <span className="rd-modal-badge">{selectedRoom.type}</span>
                  )}
                  <h3>{selectedRoom.name || 'Room'}</h3>
                </div>
                <div className="rd-modal-price">
                  <span className="rd-modal-price-amount">
                    {formatPrice(selectedRoom.price)}
                  </span>
                  <span className="rd-modal-price-unit">/night</span>
                </div>
              </div>

              {/* Quick info pills */}
              <div className="rd-modal-pills">
                {selectedRoom.capacity && (
                  <div className="rd-modal-pill">
                    <i className="fas fa-user-group"></i>
                    <span>{selectedRoom.capacity} {Number(selectedRoom.capacity) === 1 ? 'Guest' : 'Guests'}</span>
                  </div>
                )}
                {selectedRoom.amenities && selectedRoom.amenities.slice(0, 2).map(amenity => (
                  <div key={amenity} className="rd-modal-pill">
                    <i className={`fas ${getAmenityIcon(amenity)}`}></i>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>

              {/* Description */}
              {selectedRoom.description && (
                <div className="rd-modal-section">
                  <h4>About this room</h4>
                  <p>{selectedRoom.description}</p>
                </div>
              )}

              {/* Amenities */}
              <div className="rd-modal-section">
                <h4>Amenities</h4>
                <div className="rd-modal-amenities">
                  {selectedRoom.amenities && selectedRoom.amenities.length > 0 ? (
                    selectedRoom.amenities.map(amenity => (
                      <div key={amenity} className="rd-modal-amenity">
                        <i className={`fas ${getAmenityIcon(amenity)}`}></i>
                        <span>{amenity}</span>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Standard resort amenities included.</p>
                  )}
                </div>
              </div>

              {/* Deposit note */}
              <div className="rd-modal-deposit-note">
                <i className="fas fa-info-circle"></i>
                <span>Full payment is required to confirm your booking.</span>
              </div>
            </div>

            {/* Sticky Book Now button */}
            <div className="rd-modal-action">
              <button
                className="rd-modal-book-btn"
                onClick={() => {
                  navigate('/booking', {
                    state: {
                      room: {
                        title: selectedRoom.name || 'Room',
                        subtitle: selectedRoom.type || 'Standard',
                        image: selectedRoom.photoUrl || FALLBACK_IMAGE,
                        price: Number(selectedRoom.price) || 0,
                        capacity: String(selectedRoom.capacity || '2'),
                      },
                      resortName: resort.name,
                      resortId: resortId,
                    }
                  })
                }}
              >
                Book Now &mdash; {formatPrice(selectedRoom.price)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResortDetail
