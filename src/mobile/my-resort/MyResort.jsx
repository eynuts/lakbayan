import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { onValue, ref, update } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import MapModal from './MapModal'
import './MyResort.css'

const CLOUDINARY_CLOUD_NAME = 'ddubciyl3'
const CLOUDINARY_UPLOAD_PRESET = 'unsigned'

const MyResort = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resortId, setResortId] = useState('')
  const [resortData, setResortData] = useState(null)
  const [isMapModalOpen, setIsMapModalOpen] = useState(false)
  const [savingMapLocation, setSavingMapLocation] = useState(false)
  const [profileForm, setProfileForm] = useState({
    resortName: '',
    mainPhotoUrl: '',
    description: '',
    contactNumber: '',
    email: '',
    address: '',
    website: '',
    latitude: null,
    longitude: null,
    entranceFee: ''
  })
  const [visibility, setVisibility] = useState({
    showMainPhoto: true,
    showDescription: true,
    showContacts: true,
    showAmenities: true,
    showRooms: true,
    showActivities: true,
    showGallery: true
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [mainPhotoFile, setMainPhotoFile] = useState(null)
  const [uploadingMain, setUploadingMain] = useState(false)

  // Get resortId from query param if provided
  const queryResortId = searchParams.get('resortId')

  useEffect(() => {
    if (!user) {
      navigate('/profile')
    }
  }, [user, navigate])

  useEffect(() => {
    if (!user) return
    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setResortData(null)
        setResortId('')
        setLoading(false)
        return
      }
      const applications = Object.entries(value).map(([id, item]) => ({ id, ...item }))
      const approved = applications
        .filter((item) => {
          const statusApproved = item?.status === 'approved' || item?.status === 'accepted'
          const sameOwner =
            item?.ownerId === user?.uid ||
            item?.ownerEmail === user?.email ||
            item?.email === user?.email
          return statusApproved && sameOwner
        })
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      if (!approved.length) {
        setResortData(null)
        setResortId('')
        setLoading(false)
        return
      }

      // Select resort: use query param if provided, otherwise first approved
      let selected
      if (queryResortId) {
        selected = approved.find(r => r.id === queryResortId) || approved[0]
      } else {
        selected = approved[0]
      }
      
      setResortId(selected.id)
      setResortData(selected)
      const baseProfile = selected.resortProfile || {}
      setProfileForm({
        resortName: baseProfile.resortName || selected.resortName || '',
        mainPhotoUrl: baseProfile.mainPhotoUrl || '',
        description: baseProfile.description || selected.description || '',
        contactNumber: baseProfile.contactNumber || selected.contactNumber || '',
        email: baseProfile.email || selected.email || selected.ownerEmail || user?.email || '',
        address: baseProfile.address || selected.location || '',
        website: baseProfile.website || '',
        latitude: baseProfile.latitude || null,
        longitude: baseProfile.longitude || null,
        entranceFee: baseProfile.entranceFee || ''
      })
      setVisibility({
        showMainPhoto: baseProfile.visibility?.showMainPhoto ?? true,
        showDescription: baseProfile.visibility?.showDescription ?? true,
        showContacts: baseProfile.visibility?.showContacts ?? true,
        showAmenities: baseProfile.visibility?.showAmenities ?? true,
        showRooms: baseProfile.visibility?.showRooms ?? true,
        showActivities: baseProfile.visibility?.showActivities ?? true,
        showGallery: baseProfile.visibility?.showGallery ?? true
      })
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  const rooms = useMemo(() => resortData?.rooms || [], [resortData])
  const activities = useMemo(() => resortData?.activities || [], [resortData])
  const gallery = useMemo(() => resortData?.gallery || [], [resortData])

  const showMessage = (text, type = 'success') => {
    setMessage(text)
    setMessageType(type)
  }

  const updateResortRecord = async (payload) => {
    if (!resortId) return
    await update(ref(db, `resortApplications/${resortId}`), {
      ...payload,
      updatedAt: new Date().toISOString()
    })
  }

  const saveProfile = async () => {
    if (!resortId) return
    setSaving(true)
    setMessage('')
    try {
      await updateResortRecord({
        resortName: profileForm.resortName,
        resortProfile: {
          ...profileForm,
          visibility
        }
      })
      showMessage('Resort profile updated')
    } catch (error) {
      showMessage(error.message || 'Failed to save resort profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const uploadToCloudinary = async (file) => {
    if (!file) throw new Error('No file selected')
    if (!CLOUDINARY_UPLOAD_PRESET) throw new Error('Missing upload preset')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    })
    const data = await response.json()
    if (!response.ok || !data.secure_url) {
      throw new Error(data?.error?.message || 'Upload failed')
    }
    return data.secure_url
  }

  const uploadMainPhoto = async () => {
    if (!mainPhotoFile) return
    setUploadingMain(true)
    setMessage('')
    try {
      const url = await uploadToCloudinary(mainPhotoFile)
      const nextProfile = {
        ...profileForm,
        mainPhotoUrl: url
      }
      setProfileForm(nextProfile)
      await updateResortRecord({
        resortProfile: {
          ...nextProfile,
          visibility
        }
      })
      setMainPhotoFile(null)
      showMessage('Main photo uploaded and saved')
    } catch (error) {
      showMessage(error.message || 'Main photo upload failed', 'error')
    } finally {
      setUploadingMain(false)
    }
  }

  const reverseGeocode = async (lat, lng) => {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=18&addressdetails=1`
    )
    if (!response.ok) {
      throw new Error('Failed to resolve address')
    }
    const data = await response.json()
    return data?.display_name || ''
  }

  const handleMapSave = async (position) => {
    if (!resortId) return
    setSavingMapLocation(true)
    setMessage('')
    let resolvedAddress = ''
    try {
      resolvedAddress = await reverseGeocode(position.lat, position.lng)
    } catch {
      resolvedAddress = `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
    }

    const nextProfile = {
      ...profileForm,
      latitude: position.lat,
      longitude: position.lng,
      address: resolvedAddress || profileForm.address
    }

    try {
      await updateResortRecord({
        resortProfile: {
          ...nextProfile,
          visibility
        }
      })
      setProfileForm(nextProfile)
      setIsMapModalOpen(false)
      showMessage('Pinned location saved')
    } catch (error) {
      showMessage(error.message || 'Failed to save pinned location', 'error')
    } finally {
      setSavingMapLocation(false)
    }
  }

  if (loading) {
    return (
      <div className="mrm-container">
        <header className="mrm-header">
          <button className="mrm-back" onClick={() => navigate('/profile')}><i className="fas fa-chevron-left"></i></button>
          <h1>My Resort</h1>
          <div style={{ width: 40 }}></div>
        </header>
        <main className="mrm-main"><div className="mrm-empty">Loading resort...</div></main>
        <BottomNav />
      </div>
    )
  }

  if (!resortData) {
    return (
      <div className="mrm-container">
        <header className="mrm-header">
          <button className="mrm-back" onClick={() => navigate('/profile')}><i className="fas fa-chevron-left"></i></button>
          <h1>My Resort</h1>
          <div style={{ width: 40 }}></div>
        </header>
        <main className="mrm-main">
          <div className="mrm-empty">
            No approved resort found for this account.
            <button onClick={() => navigate('/register-resort')}>Register Resort</button>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="mrm-container">
      <header className="mrm-header">
        <button className="mrm-back" onClick={() => navigate('/profile')}><i className="fas fa-chevron-left"></i></button>
        <h1>My Resort</h1>
        <div className="mrm-header-actions">
          <button className="mrm-header-btn mrm-dashboard-btn" onClick={() => navigate('/my-resort/dashboard')} title="Admin Dashboard"><i className="fas fa-chart-line"></i></button>
          <button className="mrm-save" onClick={saveProfile} disabled={saving}>{saving ? '...' : 'Save'}</button>
        </div>
      </header>

      <main className="mrm-main">
        <section className="mrm-overview">
          <div className="mrm-overview-main">
            <p className="mrm-overview-label">Resort Studio</p>
            <h2>{resortData.resortName || 'My Resort'}</h2>
            <span>{resortData.resortType || 'Resort Dashboard'}</span>
          </div>
          <div className="mrm-overview-stats">
            <div className="mrm-stat">
              <strong>{rooms.length}</strong>
              <span>Rooms</span>
            </div>
            <div className="mrm-stat">
              <strong>{activities.length}</strong>
              <span>Activities</span>
            </div>
            <div className="mrm-stat">
              <strong>{gallery.length}</strong>
              <span>Photos</span>
            </div>
          </div>
        </section>

        {message && <div className={`mrm-message ${messageType === 'error' ? 'is-error' : ''}`}>{message}</div>}

        <section className="mrm-card">
          <h3>Resort Profile</h3>
          <p className="mrm-card-subtitle">Set your visible resort details and showcase image.</p>
          
          <div className="mrm-main-photo-box" onClick={() => document.getElementById('main-photo-input').click()}>
            {(mainPhotoFile || profileForm.mainPhotoUrl) ? (
              <img 
                className="mrm-preview" 
                src={mainPhotoFile ? URL.createObjectURL(mainPhotoFile) : profileForm.mainPhotoUrl} 
                alt="Resort showcase" 
              />
            ) : (
              <div className="mrm-preview-empty">
                <i className="fas fa-image"></i>
                <span>Tap to choose resort photo</span>
              </div>
            )}
            <div className="mrm-photo-overlay">
              <i className="fas fa-camera"></i>
              <span>{mainPhotoFile ? 'Change selection' : 'Change photo'}</span>
            </div>
          </div>

          <div className="mrm-upload-row">
            <input 
              id="main-photo-input"
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={(e) => setMainPhotoFile(e.target.files?.[0] || null)} 
            />
            <button 
              className="mrm-upload-btn action-primary" 
              onClick={uploadMainPhoto} 
              disabled={uploadingMain || !mainPhotoFile}
              style={mainPhotoFile ? { background: '#0a84ff', color: '#fff' } : {}}
            >
              {uploadingMain ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>}
              {uploadingMain ? ' Saving...' : ' Save Selected Photo'}
            </button>
          </div>

          <div className="mrm-profile-fields">
            <input value={profileForm.resortName} onChange={(e) => setProfileForm((p) => ({ ...p, resortName: e.target.value }))} placeholder="Resort Name" />
            <textarea value={profileForm.description} onChange={(e) => setProfileForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3}></textarea>
            <input value={profileForm.contactNumber} onChange={(e) => setProfileForm((p) => ({ ...p, contactNumber: e.target.value }))} placeholder="Contact Number" />
            <input value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
            <input value={profileForm.entranceFee} onChange={(e) => setProfileForm((p) => ({ ...p, entranceFee: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="Entrance Fee (PHP) - Optional" type="number" inputMode="decimal" />
            
            <div className="mrm-address-row">
              <input value={profileForm.address} onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" />
              <button 
                type="button" 
                className={`mrm-map-btn ${profileForm.latitude ? 'has-coords' : ''}`}
                onClick={() => setIsMapModalOpen(true)}
              >
                <i className={`fas ${profileForm.latitude ? 'fa-map-marker-alt' : 'fa-map-marked-alt'}`}></i>
                {profileForm.latitude ? 'Location Pinned' : 'Pin Location on Map'}
              </button>
            </div>

            <input value={profileForm.website} onChange={(e) => setProfileForm((p) => ({ ...p, website: e.target.value }))} placeholder="Website" />
          </div>
        </section>

        <section className="mrm-card">
          <h3>What guests can see</h3>
          <p className="mrm-card-subtitle">Toggle each section to control your public resort page.</p>
          <div className="mrm-toggle-list">
            {Object.entries(visibility).map(([key, val]) => {
              const labelMap = {
                showMainPhoto: 'Main Photo',
                showDescription: 'Description',
                showContacts: 'Contact Details',
                showAmenities: 'Amenities',
                showRooms: 'Rooms & Units',
                showActivities: 'Activities',
                showGallery: 'Photo Gallery'
              }
              const label = labelMap[key] || key.replace('show', '')
              
              return (
                <label key={key} className="mrm-toggle">
                  <span className="mrm-toggle-title">{label}</span>
                  <input
                    className="mrm-toggle-input"
                    type="checkbox"
                    checked={val}
                    onChange={(e) => setVisibility((p) => ({ ...p, [key]: e.target.checked }))}
                  />
                </label>
              )
            })}
          </div>
        </section>

        <section className="mrm-card">
          <h3>Manage Resort Content</h3>
          <p className="mrm-card-subtitle">Open a dedicated screen to manage each section.</p>
          <div className="mrm-action-grid">
            <button className="mrm-action-card" type="button" onClick={() => navigate('/my-resort/rooms')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="mrm-action-icon"><i className="fas fa-bed"></i></div>
                <div>
                  <h4>Rooms</h4>
                  <p>{rooms.length} added</p>
                </div>
              </div>
              <span className="mrm-action-pill">Manage</span>
            </button>
            <button className="mrm-action-card" type="button" onClick={() => navigate('/my-resort/activities')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="mrm-action-icon"><i className="fas fa-swimmer"></i></div>
                <div>
                  <h4>Activities</h4>
                  <p>{activities.length} listed</p>
                </div>
              </div>
              <span className="mrm-action-pill">Manage</span>
            </button>
            <button className="mrm-action-card" type="button" onClick={() => navigate('/my-resort/gallery')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="mrm-action-icon"><i className="fas fa-images"></i></div>
                <div>
                  <h4>Gallery</h4>
                  <p>{gallery.length} photos</p>
                </div>
              </div>
              <span className="mrm-action-pill">Manage</span>
            </button>
          </div>
        </section>
      </main>

      <MapModal 
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSave={handleMapSave}
        saving={savingMapLocation}
        initialPosition={profileForm.latitude ? { lat: profileForm.latitude, lng: profileForm.longitude } : null}
      />

      <BottomNav />
    </div>
  )
}

export default MyResort
