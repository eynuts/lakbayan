import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import './Location.css'

const Location = () => {
  const navigate = useNavigate()
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [translatedLocation, setTranslatedLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Reverse geocode coordinates to get location name
  const translateCoordinates = async () => {
    if (!latitude || !longitude) {
      setError('Please enter both latitude and longitude')
      return
    }

    setLoading(true)
    setError('')
    setTranslatedLocation('')

    try {
      // Using OpenStreetMap Nominatim API with address details
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
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
        
        setTranslatedLocation(fullAddress || data.display_name)
        setError('')
      } else {
        setError('No location found for these coordinates')
      }
    } catch (err) {
      setError('Error translating coordinates: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const contactInfo = [
    {
      icon: 'fa-map-marker-alt',
      title: 'Address',
      detail: 'Sidell Kite and Beach Resort, Cabalwa, Mansalay, Oriental Mindoro, Philippines'
    },
    {
      icon: 'fa-phone-alt',
      title: 'Phone',
      detail: '+63 912 345 6789'
    },
    {
      icon: 'fa-envelope',
      title: 'Email',
      detail: 'info@sidellbeach.com'
    }
  ]

  const transportOptions = [
    { icon: 'fa-ship', title: 'Ferry', desc: 'Batangas Port to Calapan/Roxas' },
    { icon: 'fa-bus', title: 'Bus', desc: 'Roxas/Calapan to Mansalay route' },
    { icon: 'fa-car', title: 'Drive', desc: 'Available parking on-site' }
  ]

  return (
    <div className="ml-container">
      {/* Fixed Header */}
      <header className="ml-header animate-fade-in">
        <button className="ml-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2>Location</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="ml-main">
        {/* Coordinate Translator Section */}
        <section className="ml-section animate-slide-up" style={{ "--delay": "0.05s" }}>
          <div className="ml-section-head">
            <h3>Find Location by Coordinates</h3>
          </div>
          <div className="ml-coords-input-container">
            <div className="ml-coord-input-group">
              <label>Latitude</label>
              <input 
                type="number" 
                placeholder="e.g., 12.4604"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                step="0.0001"
              />
            </div>
            <div className="ml-coord-input-group">
              <label>Longitude</label>
              <input 
                type="number" 
                placeholder="e.g., 121.4194"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                step="0.0001"
              />
            </div>
            <button 
              className="ml-translate-btn"
              onClick={translateCoordinates}
              disabled={loading}
            >
              {loading ? 'Translating...' : 'Translate to Location'}
            </button>
          </div>
          {error && <p className="ml-error">{error}</p>}
          {translatedLocation && (
            <div className="ml-translated-result">
              <p className="ml-result-label">Location:</p>
              <p className="ml-result-text">{translatedLocation}</p>
            </div>
          )}
        </section>
        <section className="ml-section animate-slide-up" style={{ "--delay": "0.1s" }}>
          <div className="ml-map-card">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3895.8399688431177!2d121.41940537418978!3d12.460376187809997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33bb3bdbd9ed266f%3A0x8c170c1924845422!2sSidell%20Kite%20and%20Beach%20Resort!5e0!3m2!1sen!2sph!4v1773371845345!5m2!1sen!2sph" 
              width="100%" 
              height="300" 
              style={{ border: 0 }} 
              allowFullScreen="" 
              loading="lazy" 
              title="Resort Location"
            ></iframe>
            <div className="ml-map-overlay">
              <a 
                href="https://www.google.com/maps/dir/?api=1&destination=Sidell+Kite+and+Beach+Resort" 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-directions-btn"
              >
                <i className="fas fa-directions"></i>
                Get Directions
              </a>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="ml-section animate-slide-up" style={{ "--delay": "0.2s" }}>
          <div className="ml-info-grid">
            {contactInfo.map((item, index) => (
              <div key={index} className="ml-info-card">
                <div className="ml-info-icon">
                  <i className={`fas ${item.icon}`}></i>
                </div>
                <div className="ml-info-content">
                  <h4>{item.title}</h4>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Transportation */}
        <section className="ml-section animate-slide-up" style={{ "--delay": "0.3s" }}>
          <div className="ml-section-head">
            <h3>How to Get Here</h3>
          </div>
          <div className="ml-transport-row">
            {transportOptions.map((opt, index) => (
              <div key={index} className="ml-transport-item">
                <div className="ml-transport-icon">
                  <i className={`fas ${opt.icon}`}></i>
                </div>
                <h5>{opt.title}</h5>
                <p>{opt.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Contact Buttons */}
        <section className="ml-section animate-slide-up" style={{ "--delay": "0.4s" }}>
          <div className="ml-action-buttons">
            <a href="tel:+639123456789" className="ml-action-btn call">
              <i className="fas fa-phone-alt"></i>
              Call Support
            </a>
            <a href="mailto:info@sidellbeach.com" className="ml-action-btn email">
              <i className="fas fa-envelope"></i>
              Send Email
            </a>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

export default Location
