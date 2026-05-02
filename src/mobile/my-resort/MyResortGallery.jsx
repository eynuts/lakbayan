import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref, update } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './MyResort.css'

const emptyGalleryPhoto = { caption: '' }
const CLOUDINARY_CLOUD_NAME = 'ddubciyl3'
const CLOUDINARY_UPLOAD_PRESET = 'unsigned'

const MyResortGallery = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [resortId, setResortId] = useState('')
  const [resortData, setResortData] = useState(null)
  const [galleryForm, setGalleryForm] = useState(emptyGalleryPhoto)
  const [galleryPhotoFile, setGalleryPhotoFile] = useState(null)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

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

  const uploadGalleryPhoto = async () => {
    if (!resortId || !galleryPhotoFile) return
    setUploadingGallery(true)
    setMessage('')
    try {
      const url = await uploadToCloudinary(galleryPhotoFile)
      const nextGallery = [
        ...gallery,
        {
          url,
          caption: galleryForm.caption.trim(),
          createdAt: new Date().toISOString()
        }
      ]
      await updateResortRecord({
        gallery: nextGallery
      })
      setResortData((prev) => ({ ...prev, gallery: nextGallery }))
      setGalleryForm(emptyGalleryPhoto)
      setGalleryPhotoFile(null)
      showMessage('Gallery photo uploaded and saved')
    } catch (error) {
      showMessage(error.message || 'Gallery photo upload failed', 'error')
    } finally {
      setUploadingGallery(false)
    }
  }

  if (loading) {
    return (
      <div className="mrm-container">
        <header className="mrm-header">
          <button className="mrm-back" onClick={() => navigate('/my-resort')}><i className="fas fa-chevron-left"></i></button>
          <h1>Gallery</h1>
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
          <h1>Gallery</h1>
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
        <h1>Gallery</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <main className="mrm-main">
        {message && <div className={`mrm-message ${messageType === 'error' ? 'is-error' : ''}`}>{message}</div>}

        <section className="mrm-card">
          <h3>Upload Gallery Photo</h3>
          <p className="mrm-card-subtitle">Upload photos directly to Cloudinary and publish to your gallery.</p>
          <input value={galleryForm.caption} onChange={(e) => setGalleryForm((p) => ({ ...p, caption: e.target.value }))} placeholder="Photo Caption (optional)" />
          <div className="mrm-upload-row">
            <input type="file" accept="image/*" onChange={(e) => setGalleryPhotoFile(e.target.files?.[0] || null)} />
            <button className="mrm-upload-btn" onClick={uploadGalleryPhoto} disabled={uploadingGallery || !galleryPhotoFile}>
              {uploadingGallery ? 'Uploading...' : 'Upload and Save Gallery Photo'}
            </button>
          </div>
        </section>

        <section className="mrm-card">
          <h3>Gallery Photos</h3>
          <div className="mrm-gallery-grid">
            {gallery.length === 0 && <div className="mrm-empty">No gallery photos yet.</div>}
            {gallery.map((photo, i) => (
              <div key={i} className="mrm-gallery-item">
                <img src={photo.url} alt={photo.caption || `Gallery ${i + 1}`} />
                {photo.caption && <p className="mrm-gallery-caption">{photo.caption}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

export default MyResortGallery
