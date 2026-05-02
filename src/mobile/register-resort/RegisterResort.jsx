import { useState } from 'react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { createResortApplication } from '../../firebase'
import './RegisterResort.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})
L.Marker.prototype.options.icon = DefaultIcon

const RegisterResort = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [mapQuery, setMapQuery] = useState('Mansalay, Oriental Mindoro')
  const [searchResult, setSearchResult] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [mapPosition, setMapPosition] = useState({ lat: 12.5208, lng: 121.4381 })
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [formData, setFormData] = useState({
    resortName: '',
    resortType: 'Beach Resort',
    location: '',
    description: '',
    contactNumber: '',
    email: user?.email || '',
    features: [],
  })

  // Function to check if a string is coordinates
  const isCoordinates = (str) => {
    if (!str) return false
    const coordPattern = /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/
    return coordPattern.test(str.trim())
  }

  // Initialize and update map when modal opens or position changes
  useEffect(() => {
    if (!showLocationModal || !mapContainerRef.current) return

    // Initialize map if not already done
    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current).setView([mapPosition.lat, mapPosition.lng], 13)
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map)

      markerRef.current = L.marker([mapPosition.lat, mapPosition.lng]).addTo(map)
    } else {
      // Update existing marker and center
      if (markerRef.current) {
        markerRef.current.setLatLng([mapPosition.lat, mapPosition.lng])
      }
      mapRef.current.setView([mapPosition.lat, mapPosition.lng], 13)
    }

    return () => {
      // Cleanup on modal close
      if (mapRef.current && !showLocationModal) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [showLocationModal, mapPosition])

  // Function to reverse geocode coordinates
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
      console.log('Nominatim full response:', data)
      
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
        
        console.log('Converted address:', fullAddress)
        return fullAddress || data.display_name
      }
      return null
    } catch (err) {
      console.error('Geocoding error:', err)
      return null
    }
  }

  // Handle search/coordinate conversion
  const handleSearchLocation = async () => {
    if (!mapQuery.trim()) {
      setSearchError('Please enter a location or coordinates')
      return
    }

    setSearchLoading(true)
    setSearchError('')
    setSearchResult('')

    if (isCoordinates(mapQuery)) {
      // Convert coordinates to address and update map
      const [lat, lng] = mapQuery.split(',').map(val => parseFloat(val.trim()))
      setMapPosition({ lat, lng })
      const address = await reverseGeocodeCoordinates(lat, lng)
      if (address) {
        setSearchResult(address)
      } else {
        // If reverse geocoding fails, use the coordinates as-is
        setSearchResult(mapQuery)
      }
    } else {
      // Use the search query as is
      setSearchResult(mapQuery)
    }

    setSearchLoading(false)
  }

  const featuresList = [
    'Swimming Pool', 'Beach Access', 'WiFi', 'Restaurant', 
    'Parking', 'Air Conditioning', 'Pet Friendly', 'Spa & Wellness'
  ]
  const resortTypes = ['Beach Resort', 'Mountain Resort', 'Spa & Wellness', 'Eco Lodge']

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFeatureToggle = (feature) => {
    setFormData(prev => {
      const features = prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
      return { ...prev, features }
    })
  }

  const handleTypeSelect = (type) => {
    setFormData(prev => ({ ...prev, resortType: type }))
    setShowTypeModal(false)
  }

  const openLocationModal = () => {
    setMapQuery(formData.location || 'Mansalay, Oriental Mindoro')
    setShowLocationModal(true)
  }

  const useMapQueryAsLocation = () => {
    const locationToUse = searchResult || mapQuery
    setFormData(prev => ({ ...prev, location: locationToUse }))
    setShowLocationModal(false)
    setSearchResult('')
    setSearchError('')
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)
        const coords = `${lat}, ${lng}`
        setFormData(prev => ({ ...prev, location: coords }))
        setMapQuery(coords)
      },
      () => {
        setError('Unable to get current location. Please allow location permission.')
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Parse coordinates from location if they exist
      let dataToSubmit = { ...formData }
      if (formData.location && isCoordinates(formData.location)) {
        const [lat, lng] = formData.location.split(',').map(val => parseFloat(val.trim()))
        dataToSubmit.resortProfile = {
          ...dataToSubmit.resortProfile,
          latitude: lat,
          longitude: lng,
          address: formData.location
        }
      }
      
      await createResortApplication(dataToSubmit, user)
      setLoading(false)
      setIsSubmitted(true)
    } catch (submitError) {
      setLoading(false)
      setError('Failed to submit resort application. Please try again.')
    }
  }

  if (isSubmitted) {
    return (
      <div className="mr-mobile-container">
      <header className="mh-mobile-header">
        <button className="mh-back-btn" onClick={() => navigate('/home')}>
           <i className="fas fa-arrow-left"></i>
        </button>
        <h1>Success</h1>
        <div className="mh-placeholder"></div>
      </header>

        <main className="mr-mobile-main success-view">
          <div className="mr-success-animation">
            <div className="mr-success-circle">
              <i className="fas fa-check"></i>
            </div>
          </div>
          <h2>Application Sent!</h2>
          <p>Thank you for choosing Sidell. Our team will review your resort application and get back to you within 3-5 business days.</p>
          
          <div className="mr-next-steps">
            <h3>Next Steps:</h3>
            <div className="step-item">
              <div className="step-num">1</div>
              <span>Verification by Sidell Admin</span>
            </div>
            <div className="step-item">
              <div className="step-num">2</div>
              <span>Email Confirmation & Dashboard Setup</span>
            </div>
            <div className="step-item">
              <div className="step-num">3</div>
              <span>Go Live!</span>
            </div>
          </div>

          <button className="mr-done-btn" onClick={() => navigate('/home')}>
            Back to Home
          </button>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="mh-container mr-mobile-container">
      {/* Mobile Header */}
      <header className="mh-mobile-header animate-fade-in">
        <button className="mh-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <h1>Register Resort</h1>
        <div className="mh-placeholder"></div>
      </header>

      <main className="mr-mobile-main">
        <div className="mr-form-card animate-slide-up">
          <div className="mr-card-header">
            <h3>Resort Details</h3>
            <p>Start your journey with us</p>
          </div>
          {error && (
            <div className="mr-submit-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mr-form">
            <div className="mr-input-group">
              <label>Resort Name</label>
              <div className="mr-input-wrapper">
                <i className="fas fa-hotel"></i>
                <input 
                  type="text" 
                  name="resortName" 
                  value={formData.resortName} 
                  onChange={handleChange} 
                  placeholder="Official Resort Name" 
                  required 
                />
              </div>
            </div>

            <div className="mr-input-group">
              <label>Type</label>
              <div className="mr-input-wrapper">
                <i className="fas fa-umbrella-beach"></i>
                <button
                  type="button"
                  className="mr-type-selector"
                  onClick={() => setShowTypeModal(true)}
                >
                  {formData.resortType}
                  <i className="fas fa-chevron-down mr-type-chevron"></i>
                </button>
              </div>
            </div>

            <div className="mr-input-group">
              <label>Contact Number</label>
              <div className="mr-input-wrapper">
                <i className="fas fa-phone"></i>
                <input 
                  type="tel" 
                  name="contactNumber" 
                  value={formData.contactNumber} 
                  onChange={handleChange} 
                  placeholder="+63 9xx xxx xxxx" 
                  required 
                />
              </div>
            </div>

            <div className="mr-input-group">
              <label>Location</label>
              <div className="mr-input-wrapper">
                <i className="fas fa-map-marker-alt"></i>
                <input 
                  type="text" 
                  name="location" 
                  value={formData.location} 
                  onChange={handleChange} 
                  placeholder="Complete Address" 
                  required 
                />
                <button type="button" className="mr-location-map-btn" onClick={openLocationModal}>
                  <i className="fas fa-map"></i>
                </button>
              </div>
            </div>

            <div className="mr-input-group">
              <label>Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                placeholder="What makes your resort unique?" 
                rows="3"
                required
              ></textarea>
            </div>

            <div className="mr-features-section">
              <label>Key Amenities</label>
              <div className="mr-features-grid">
                {featuresList.map(feature => (
                  <div 
                    key={feature} 
                    className={`mr-feature-chip ${formData.features.includes(feature) ? 'active' : ''}`}
                    onClick={() => handleFeatureToggle(feature)}
                  >
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            <div className="mr-upload-section">
              <label>Photos (Min. 5)</label>
              <div className="mr-photo-uploader">
                <div className="uploader-icon">
                  <i className="fas fa-camera"></i>
                </div>
                <span>Add Photos</span>
              </div>
            </div>

            <button type="submit" className="mr-submit-btn" disabled={loading}>
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Submitting...</>
              ) : (
                'Send Application'
              )}
            </button>
          </form>
        </div>
      </main>

      <BottomNav />

      {showTypeModal && (
        <div className="mr-modal-overlay" onClick={() => setShowTypeModal(false)}>
          <div className="mr-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mr-modal-header">
              <h3>Select Resort Type</h3>
              <button type="button" className="mr-modal-close" onClick={() => setShowTypeModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mr-modal-options">
              {resortTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`mr-modal-option ${formData.resortType === type ? 'active' : ''}`}
                  onClick={() => handleTypeSelect(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLocationModal && (
        <div className="mr-modal-overlay" onClick={() => setShowLocationModal(false)}>
          <div className="mr-modal-sheet mr-map-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mr-modal-header">
              <h3>Pin Resort Location</h3>
              <button type="button" className="mr-modal-close" onClick={() => setShowLocationModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mr-map-search">
              <input
                type="text"
                value={mapQuery}
                onChange={(e) => setMapQuery(e.target.value)}
                placeholder="Search location or paste coordinates (e.g., 12.4604, 121.4194)"
              />
              <button type="button" onClick={handleSearchLocation} disabled={searchLoading}>
                <i className={`fas ${searchLoading ? 'fa-spinner fa-spin' : 'fa-search'}`}></i>
              </button>
              <button type="button" onClick={handleUseCurrentLocation}>
                <i className="fas fa-location-crosshairs"></i>
              </button>
            </div>

            {searchError && (
              <div className="mr-search-error">
                <i className="fas fa-exclamation-circle"></i>
                {searchError}
              </div>
            )}

            {searchResult && (
              <div className="mr-search-result">
                <div className="mr-result-label">
                  <i className="fas fa-map-pin"></i>
                  Converted Location
                </div>
                <div className="mr-result-text">{searchResult}</div>
              </div>
            )}

            <div className="mr-map-preview" ref={mapContainerRef} style={{ height: '240px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
              {/* Leaflet map will be rendered here */}
            </div>
            <div className="mr-map-actions">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchResult || mapQuery || 'Mansalay, Oriental Mindoro')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-open-maps-btn"
              >
                Open in Maps
              </a>
              <button type="button" className="mr-use-location-btn" onClick={useMapQueryAsLocation}>
                Use this location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RegisterResort
