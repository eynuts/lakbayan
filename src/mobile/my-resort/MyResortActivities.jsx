import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref, update } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import './MyResort.css'

const emptyActivity = { name: '', description: '', price: '', photoUrl: '' }
const CLOUDINARY_CLOUD_NAME = 'ddubciyl3'
const CLOUDINARY_UPLOAD_PRESET = 'unsigned'

const MyResortActivities = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [resortId, setResortId] = useState('')
  const [resortData, setResortData] = useState(null)
  const [activityForm, setActivityForm] = useState(emptyActivity)
  const [activityPhotoFile, setActivityPhotoFile] = useState(null)
  const [uploadingActivity, setUploadingActivity] = useState(false)
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

  const activities = useMemo(() => resortData?.activities || [], [resortData])

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

  const addActivity = async () => {
    if (!resortId || !activityForm.name.trim()) return
    setUploadingActivity(true)
    setMessage('')
    try {
      let photoUrl = activityForm.photoUrl

      if (activityPhotoFile) {
        photoUrl = await uploadToCloudinary(activityPhotoFile)
      }

      const nextActivity = {
        ...activityForm,
        photoUrl,
        createdAt: new Date().toISOString()
      }
      const nextActivities = [...activities, nextActivity]

      await updateResortRecord({ activities: nextActivities })
      setResortData((prev) => ({ ...prev, activities: nextActivities }))
      setActivityForm(emptyActivity)
      setActivityPhotoFile(null)
      setEditingIndex(null)
      showMessage('Activity added')
    } catch (error) {
      showMessage(error.message || 'Failed to add activity', 'error')
    } finally {
      setUploadingActivity(false)
    }
  }

  const startEdit = (activity, index) => {
    setActivityForm({
      name: activity?.name || '',
      description: activity?.description || '',
      price: activity?.price || '',
      photoUrl: activity?.photoUrl || ''
    })
    setActivityPhotoFile(null)
    setEditingIndex(index)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveEdit = async () => {
    if (editingIndex === null || !resortId) return
    if (!activityForm.name.trim()) return
    setUploadingActivity(true)
    setMessage('')
    try {
      let photoUrl = activityForm.photoUrl
      if (activityPhotoFile) {
        photoUrl = await uploadToCloudinary(activityPhotoFile)
      }
      const nextActivities = activities.map((activity, index) => {
        if (index !== editingIndex) return activity
        return {
          ...activity,
          ...activityForm,
          photoUrl,
          updatedAt: new Date().toISOString()
        }
      })
      await updateResortRecord({ activities: nextActivities })
      setResortData((prev) => ({ ...prev, activities: nextActivities }))
      setActivityForm(emptyActivity)
      setActivityPhotoFile(null)
      setEditingIndex(null)
      showMessage('Activity updated')
    } catch (error) {
      showMessage(error.message || 'Failed to update activity', 'error')
    } finally {
      setUploadingActivity(false)
    }
  }

  if (loading) {
    return (
      <div className="mrm-container">
        <header className="mrm-header">
          <button className="mrm-back" onClick={() => navigate('/my-resort')}><i className="fas fa-chevron-left"></i></button>
          <h1>Activities</h1>
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
          <h1>Activities</h1>
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
        <h1>Activities</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <main className="mrm-main">
        {message && <div className={`mrm-message ${messageType === 'error' ? 'is-error' : ''}`}>{message}</div>}

        <section className="mrm-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <h3 style={{ margin: 0 }}>{editingIndex === null ? 'Add Activity' : 'Edit Activity'}</h3>
            {editingIndex !== null && (
              <button
                className="mrm-action-pill"
                style={{ background: '#fef2f2', color: '#b91c1c', border: 'none' }}
                onClick={() => {
                  setActivityForm(emptyActivity)
                  setActivityPhotoFile(null)
                  setEditingIndex(null)
                }}
              >
                Cancel
              </button>
            )}
          </div>
          <p className="mrm-card-subtitle">
            {editingIndex === null ? 'Add activity details and optional photo in one step.' : 'Update this activity listing for guests.'}
          </p>

          <div className="mrm-main-photo-box" onClick={() => document.getElementById('activity-photo-input').click()}>
            {(activityPhotoFile || activityForm.photoUrl) ? (
              <img
                className="mrm-preview"
                src={activityPhotoFile ? URL.createObjectURL(activityPhotoFile) : activityForm.photoUrl}
                alt="Activity preview"
              />
            ) : (
              <div className="mrm-preview-empty">
                <i className="fas fa-image"></i>
                <span>Tap to add activity photo</span>
              </div>
            )}
            <div className="mrm-photo-overlay">
              <i className="fas fa-camera"></i>
              <span>{activityPhotoFile ? 'Change selection' : 'Change photo'}</span>
            </div>
          </div>

          <div className="mrm-profile-fields">
            <input
              id="activity-photo-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => setActivityPhotoFile(e.target.files?.[0] || null)}
            />
            <input value={activityForm.name} onChange={(e) => setActivityForm((p) => ({ ...p, name: e.target.value }))} placeholder="Activity Name" />
            <textarea value={activityForm.description} onChange={(e) => setActivityForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={2}></textarea>
            <input value={activityForm.price} onChange={(e) => setActivityForm((p) => ({ ...p, price: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="Price (PHP)" type="number" inputMode="decimal" />

            <button
              className="mrm-upload-btn"
              onClick={editingIndex === null ? addActivity : saveEdit}
              disabled={uploadingActivity}
              style={(activityPhotoFile || (editingIndex !== null)) ? { background: '#0a84ff', color: '#fff' } : {}}
            >
              {uploadingActivity ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check-circle"></i>}
              {uploadingActivity
                ? (editingIndex === null ? ' Adding...' : ' Saving...')
                : (editingIndex === null ? ' Add Activity' : ' Save Changes')}
            </button>
          </div>
        </section>

        <section className="mrm-card">
          <h3>Existing Activities</h3>
          {activities.length === 0 && <div className="mrm-empty">No activities yet</div>}
          <div className="mrm-room-grid">
            {activities.map((activity, index) => (
              <div key={`${activity.name || 'activity'}-${index}`} className="mrm-room-card">
                <div className="mrm-room-photo">
                  {activity.photoUrl ? (
                    <img src={activity.photoUrl} alt={activity.name || 'Activity'} />
                  ) : (
                    <div className="mrm-room-photo-placeholder">
                      <i className="fas fa-image"></i>
                    </div>
                  )}
                </div>
                <div className="mrm-room-body">
                  <div className="mrm-room-head">
                    <h4>{activity.name || 'Activity'}</h4>
                  </div>
                  <p>{activity.description || 'Description not set'}</p>
                  <small>{activity.price ? `PHP ${activity.price}` : 'Price on request'}</small>
                  <div className="mrm-room-meta">
                    <span className="mrm-room-price">{activity.price ? `PHP ${activity.price}` : 'Price on request'}</span>
                    <button className="mrm-room-edit" type="button" onClick={() => startEdit(activity, index)}>
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

export default MyResortActivities
