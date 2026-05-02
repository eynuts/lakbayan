import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref, update } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './MyResort.css'

const emptyRoom = { name: '', type: '', price: '', capacity: '', photoUrl: '', amenities: [] }
const COMMON_AMENITIES = [
  'Air Conditioning', 'Free Wi-Fi', 'Smart TV', 'Hot Shower', 
  'Room Safe', 'Mini Bar', 'Balcony', 'King Size Bed'
]
const CLOUDINARY_CLOUD_NAME = 'ddubciyl3'
const CLOUDINARY_UPLOAD_PRESET = 'unsigned'

const MyResortRooms = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const photoInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [resortId, setResortId] = useState('')
  const [resortData, setResortData] = useState(null)
  const [roomForm, setRoomForm] = useState(emptyRoom)
  const [roomPhotoFile, setRoomPhotoFile] = useState(null)
  const [uploadingRoom, setUploadingRoom] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')
  const [editingIndex, setEditingIndex] = useState(null)

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
      const selected = approved[0]
      setResortId(selected.id)
      setResortData(selected)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user])

  const rooms = useMemo(() => resortData?.rooms || [], [resortData])

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

  const toggleAmenity = (amenity) => {
    setRoomForm(prev => {
      const current = prev.amenities || []
      const next = current.includes(amenity)
        ? current.filter(a => a !== amenity)
        : [...current, amenity]
      return { ...prev, amenities: next }
    })
  }

  const addRoom = async () => {
    if (!resortId || !roomForm.name.trim()) return
    setUploadingRoom(true)
    setMessage('')
    try {
      let photoUrl = roomForm.photoUrl

      if (roomPhotoFile) {
        photoUrl = await uploadToCloudinary(roomPhotoFile)
      }

      const nextRoom = {
        ...roomForm,
        photoUrl,
        createdAt: new Date().toISOString()
      }
      const nextRooms = [...rooms, nextRoom]

      await updateResortRecord({ rooms: nextRooms })
      setResortData((prev) => ({ ...prev, rooms: nextRooms }))
      setRoomForm(emptyRoom)
      setRoomPhotoFile(null)
      setEditingIndex(null)
      // Clear file input value to allow re-selection of same file
      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }
      showMessage('Room added')
    } catch (error) {
      showMessage(error.message || 'Failed to add room', 'error')
    } finally {
      setUploadingRoom(false)
    }
  }

  const startEdit = (room, index) => {
    setRoomForm({
      name: room?.name || '',
      type: room?.type || '',
      price: room?.price || '',
      capacity: room?.capacity || '',
      photoUrl: room?.photoUrl || '',
      amenities: room?.amenities || []
    })
    setRoomPhotoFile(null)
    setEditingIndex(index)
    setMessage('')
    // Clear file input value
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveEdit = async () => {
    if (editingIndex === null || !resortId) return
    if (!roomForm.name.trim()) return
    setUploadingRoom(true)
    setMessage('')
    try {
      let photoUrl = roomForm.photoUrl
      if (roomPhotoFile) {
        photoUrl = await uploadToCloudinary(roomPhotoFile)
      }
      const nextRooms = rooms.map((room, index) => {
        if (index !== editingIndex) return room
        return {
          ...room,
          ...roomForm,
          photoUrl,
          updatedAt: new Date().toISOString()
        }
      })
      await updateResortRecord({ rooms: nextRooms })
      setResortData((prev) => ({ ...prev, rooms: nextRooms }))
      setRoomForm(emptyRoom)
      setRoomPhotoFile(null)
      setEditingIndex(null)
      // Clear file input value to allow re-selection of same file
      if (photoInputRef.current) {
        photoInputRef.current.value = ''
      }
      showMessage('Room updated')
    } catch (error) {
      showMessage(error.message || 'Failed to update room', 'error')
    } finally {
      setUploadingRoom(false)
    }
  }

  if (loading) {
    return (
      <div className="mrm-container">
        <header className="mrm-header">
          <button className="mrm-back" onClick={() => navigate('/my-resort')}><i className="fas fa-chevron-left"></i></button>
          <h1>Rooms</h1>
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
          <button className="mrm-back" onClick={() => navigate('/my-resort')}><i className="fas fa-chevron-left"></i></button>
          <h1>Rooms</h1>
          <div style={{ width: 40 }}></div>
        </header>
        <main className="mrm-main">
          <div className="mrm-empty">No approved resort found for this account.</div>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="mrm-container">
      <header className="mrm-header">
        <button className="mrm-back" onClick={() => navigate('/my-resort')}><i className="fas fa-chevron-left"></i></button>
        <h1>Rooms</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <main className="mrm-main">
        {message && <div className={`mrm-message ${messageType === 'error' ? 'is-error' : ''}`}>{message}</div>}

        <section className="mrm-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ margin: 0 }}>{editingIndex === null ? 'Add New Room' : 'Edit Room'}</h3>
            {editingIndex !== null && (
              <button 
                className="mrm-action-pill" 
                style={{ background: '#fef2f2', color: '#b91c1c', border: 'none' }}
                onClick={() => {
                  setRoomForm(emptyRoom)
                  setRoomPhotoFile(null)
                  setEditingIndex(null)
                  // Clear file input value
                  if (photoInputRef.current) {
                    photoInputRef.current.value = ''
                  }
                }}
              >
                Cancel
              </button>
            )}
          </div>
          <p className="mrm-card-subtitle">
            {editingIndex === null ? 'Create a new room listing for your guests.' : 'Update the details for this specific room.'}
          </p>

          <div className="mrm-main-photo-box" onClick={() => document.getElementById('room-photo-input').click()}>
            {(roomPhotoFile || roomForm.photoUrl) ? (
              <img 
                className="mrm-preview" 
                src={roomPhotoFile ? URL.createObjectURL(roomPhotoFile) : roomForm.photoUrl} 
                alt="Room preview" 
              />
            ) : (
              <div className="mrm-preview-empty">
                <i className="fas fa-bed"></i>
                <span>Tap to add room photo</span>
              </div>
            )}
            <div className="mrm-photo-overlay">
              <i className="fas fa-camera"></i>
              <span>{roomPhotoFile ? 'Change selection' : 'Change photo'}</span>
            </div>
          </div>

          <div className="mrm-profile-fields">
            <input 
              ref={photoInputRef}
              id="room-photo-input"
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }}
              onChange={(e) => setRoomPhotoFile(e.target.files?.[0] || null)} 
            />
            <input value={roomForm.name} onChange={(e) => setRoomForm((p) => ({ ...p, name: e.target.value }))} placeholder="Room Name (e.g. Deluxe Suite)" />
            <input value={roomForm.type} onChange={(e) => setRoomForm((p) => ({ ...p, type: e.target.value }))} placeholder="Room Category" />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input value={roomForm.price} onChange={(e) => setRoomForm((p) => ({ ...p, price: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="Price (PHP)" type="number" inputMode="decimal" />
              <input value={roomForm.capacity} onChange={(e) => setRoomForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="Guest Capacity" />
            </div>

            <div className="mrm-amenities-section">
              <label className="mrm-field-label">Room Amenities</label>
              <div className="mrm-amenities-grid">
                {COMMON_AMENITIES.map(amenity => (
                  <button
                    key={amenity}
                    type="button"
                    className={`mrm-amenity-chip ${roomForm.amenities?.includes(amenity) ? 'active' : ''}`}
                    onClick={() => toggleAmenity(amenity)}
                  >
                    {amenity}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="mrm-upload-btn"
              onClick={editingIndex === null ? addRoom : saveEdit}
              disabled={uploadingRoom}
              style={(roomPhotoFile || (editingIndex !== null)) ? { background: '#0a84ff', color: '#fff' } : {}}
            >
              {uploadingRoom ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
              {uploadingRoom
                ? (editingIndex === null ? ' Adding...' : ' Saving...')
                : (editingIndex === null ? ' Add Room' : ' Save Changes')}
            </button>
          </div>
        </section>

        <section className="mrm-card">
          <h3>Existing Rooms</h3>
          {rooms.length === 0 && <div className="mrm-empty">No rooms yet</div>}
          <div className="mrm-room-grid">
            {rooms.map((room, index) => (
              <div key={`${room.name}-${index}`} className="mrm-room-card">
                <div className="mrm-room-photo">
                  {room.photoUrl ? (
                    <img src={room.photoUrl} alt={room.name || 'Room'} />
                  ) : (
                    <div className="mrm-room-photo-placeholder">
                      <i className="fas fa-image"></i>
                    </div>
                  )}
                </div>
                <div className="mrm-room-body">
                  <div className="mrm-room-head">
                    <h4>{room.name || 'Room'}</h4>
                  </div>
                  <p>{room.type || 'Type not set'}</p>
                  <small>{room.capacity ? `Capacity: ${room.capacity}` : 'Capacity not set'}</small>
                  <div className="mrm-room-meta">
                    <span className="mrm-room-price">{room.price ? `PHP ${room.price}` : 'Price on request'}</span>
                    <button className="mrm-room-edit" type="button" onClick={() => startEdit(room, index)}>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

export default MyResortRooms
