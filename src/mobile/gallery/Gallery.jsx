import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, onValue } from 'firebase/database'
import { db } from '../../firebase'
import BottomNav from '../../components/BottomNav'
import './Gallery.css'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80'

const Gallery = () => {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setPhotos([])
        setLoading(false)
        return
      }

      // Extract all gallery photos from approved resorts
      const allPhotos = []
      Object.entries(value).forEach(([resortId, resort]) => {
        if (resort?.status === 'approved' || resort?.status === 'accepted') {
          const gallery = Array.isArray(resort?.gallery) ? resort.gallery : []
          const resortName = resort?.resortName || 'Unknown Resort'
          
          gallery.forEach((photo, index) => {
            if (photo?.url) {
              allPhotos.push({
                id: `${resortId}-${index}`,
                resortId,
                resortName,
                url: photo.url,
                caption: photo.caption || `${resortName} - Photo ${index + 1}`,
                category: photo.category || 'Resort',
                index
              })
            }
          })
        }
      })

      setPhotos(allPhotos)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Get unique categories for filter tabs
  const categories = useMemo(() => {
    const cats = new Set(photos.map(p => p.category).filter(Boolean))
    return ['all', ...Array.from(cats).sort()]
  }, [photos])

  // Filter photos
  const filteredPhotos = useMemo(() => {
    let result = photos

    // Category filter
    if (activeFilter !== 'all') {
      result = result.filter(p => p.category === activeFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.caption?.toLowerCase().includes(query) ||
        p.resortName?.toLowerCase().includes(query)
      )
    }

    return result
  }, [photos, activeFilter, searchQuery])

  const openLightbox = (photo, index) => {
    setSelectedPhoto({ ...photo, currentIndex: index })
    document.body.style.overflow = 'hidden'
  }

  const closeLightbox = () => {
    setSelectedPhoto(null)
    document.body.style.overflow = 'auto'
  }

  const navigatePhoto = (direction) => {
    if (!selectedPhoto) return
    const newIndex = direction === 'next' 
      ? selectedPhoto.currentIndex + 1 
      : selectedPhoto.currentIndex - 1
    
    if (newIndex >= 0 && newIndex < filteredPhotos.length) {
      setSelectedPhoto({ ...filteredPhotos[newIndex], currentIndex: newIndex })
    }
  }

  const formatCategory = (cat) => {
    return cat.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  return (
    <div className="mga-container">
      {/* Header */}
      <header className="mga-header">
        <button className="mga-back-btn" onClick={() => navigate(-1)}>
          <i className="fas fa-chevron-left"></i>
        </button>
        <h2>Gallery</h2>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="mga-main">
        {/* Search Bar */}
        <section className="mga-search-section">
          <div className="mga-search-bar">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search photos or resorts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="mga-search-clear" onClick={() => setSearchQuery('')}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </section>

        {/* Category Filters */}
        <section className="mga-filter-section">
          <div className="mga-filter-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`mga-filter-tab ${activeFilter === cat ? 'active' : ''}`}
                onClick={() => setActiveFilter(cat)}
              >
                {cat === 'all' ? 'All Photos' : formatCategory(cat)}
              </button>
            ))}
          </div>
        </section>

        {/* Results Count */}
        {!loading && (
          <section className="mga-results-count">
            <p>
              {searchQuery || activeFilter !== 'all'
                ? `${filteredPhotos.length} photo${filteredPhotos.length !== 1 ? 's' : ''}`
                : `${photos.length} photos from resorts`}
            </p>
          </section>
        )}

        {/* Gallery Grid */}
        <section className="mga-gallery-section">
          {loading ? (
            <div className="mga-loading">
              <div className="mga-loading-spinner"></div>
              <p>Loading gallery...</p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="mga-empty-state">
              <i className="fas fa-images"></i>
              <h3>No Photos Found</h3>
              <p>{searchQuery ? 'Try a different search term' : 'No gallery photos uploaded yet'}</p>
            </div>
          ) : (
            <div className="mga-grid">
              {filteredPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="mga-item"
                  onClick={() => openLightbox(photo, index)}
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <img src={photo.url} alt={photo.caption} loading="lazy" onError={(e) => e.target.src = FALLBACK_IMAGE} />
                  <div className="mga-item-overlay">
                    <span className="mga-category">{photo.category}</span>
                    <span className="mga-resort-name">{photo.resortName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Lightbox */}
      {selectedPhoto && (
        <div className="mga-lightbox" onClick={closeLightbox}>
          <button className="mga-close-btn" onClick={closeLightbox}>
            <i className="fas fa-times"></i>
          </button>

          {/* Navigation Buttons */}
          {filteredPhotos.length > 1 && (
            <>
              <button 
                className="mga-nav-btn mga-prev"
                onClick={(e) => { e.stopPropagation(); navigatePhoto('prev') }}
                disabled={selectedPhoto.currentIndex === 0}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <button 
                className="mga-nav-btn mga-next"
                onClick={(e) => { e.stopPropagation(); navigatePhoto('next') }}
                disabled={selectedPhoto.currentIndex === filteredPhotos.length - 1}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </>
          )}

          <div className="mga-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.url} alt={selectedPhoto.caption} />
            <div className="mga-lightbox-info">
              <h3>{selectedPhoto.caption}</h3>
              <p>
                <span className="mga-lightbox-resort">{selectedPhoto.resortName}</span>
                {selectedPhoto.category && <span className="mga-lightbox-category">{selectedPhoto.category}</span>}
              </p>
              <p className="mga-lightbox-counter">
                {selectedPhoto.currentIndex + 1} / {filteredPhotos.length}
              </p>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

export default Gallery
