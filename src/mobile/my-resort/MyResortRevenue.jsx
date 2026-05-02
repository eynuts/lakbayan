import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import { getEffectiveBookingStatus, isRefundedBooking } from '../../utils/bookingStatus'
import './MyResortRevenue.css'

const MyResortRevenue = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [resortData, setResortData] = useState(null)
  const [resortId, setResortId] = useState('')
  const [bookings, setBookings] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')

  // Fetch resort data
  useEffect(() => {
    if (!user) {
      navigate('/profile')
      return
    }

    const applicationsRef = ref(db, 'resortApplications')
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setLoading(false)
        return
      }

      const apps = Object.entries(value).map(([id, item]) => ({ id, ...item }))
      const myResort = apps.find(item =>
        (item.status === 'approved' || item.status === 'accepted') &&
        (item.ownerId === user?.uid || item.ownerEmail === user?.email || item.email === user?.email)
      )

      if (myResort) {
        setResortData(myResort)
        setResortId(myResort.id)
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [user, navigate])

  // Fetch bookings for this resort
  useEffect(() => {
    if (!resortId) return

    const bookingsRef = ref(db, 'bookings')
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setBookings([])
        setLoading(false)
        return
      }

      const allBookings = Object.entries(value).map(([id, item]) => ({ id, ...item }))
      const filtered = allBookings.filter(b => b.resortId === resortId)
      setBookings(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      setLoading(false)
    })

    return () => unsubscribe()
  }, [resortId])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(price)
  }

  const getBookingAmount = (booking) => Number(booking.totalPrice ?? booking.depositAmount) || 0
  const getBookingState = (booking) => getEffectiveBookingStatus(booking)

  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : bookings.filter((booking) => getBookingState(booking) === filterStatus)

  const stats = {
    totalRevenue: bookings
      .filter((booking) => !isRefundedBooking(booking))
      .reduce((sum, b) => sum + getBookingAmount(b), 0),
    confirmedRevenue: bookings
      .filter((booking) => getBookingState(booking) === 'confirmed')
      .reduce((sum, b) => sum + getBookingAmount(b), 0),
    pendingRevenue: bookings
      .filter((booking) => getBookingState(booking) === 'upcoming')
      .reduce((sum, b) => sum + getBookingAmount(b), 0),
    refundedRevenue: bookings
      .filter((booking) => isRefundedBooking(booking))
      .reduce((sum, b) => sum + getBookingAmount(b), 0),
    totalBookings: bookings.length,
    confirmedBookings: bookings.filter((booking) => getBookingState(booking) === 'confirmed').length,
    pendingBookings: bookings.filter((booking) => getBookingState(booking) === 'upcoming').length,
    refundedBookings: bookings.filter((booking) => isRefundedBooking(booking)).length
  }

  if (loading) {
    return (
      <div className="mrev-container">
        <header className="mrev-header">
          <button className="mrev-back" onClick={() => navigate('/my-resort/dashboard')}><i className="fas fa-chevron-left"></i></button>
          <h1>Revenue</h1>
          <div style={{ width: 40 }}></div>
        </header>
        <main className="mrev-main"><div className="mrev-empty">Loading revenue data...</div></main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="mrev-container">
      <header className="mrev-header">
        <button className="mrev-back" onClick={() => navigate('/my-resort/dashboard')}><i className="fas fa-chevron-left"></i></button>
        <h1>Revenue & Analytics</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <main className="mrev-main">
        {/* Overview Cards */}
        <section className="mrev-overview">
          <div className="mrev-card mrev-card-primary">
            <div className="mrev-card-icon"><i className="fas fa-wallet"></i></div>
            <div className="mrev-card-content">
              <p>Total Revenue</p>
              <h2>{formatPrice(stats.totalRevenue)}</h2>
            </div>
          </div>

          <div className="mrev-card mrev-card-success">
            <div className="mrev-card-icon"><i className="fas fa-check-circle"></i></div>
            <div className="mrev-card-content">
              <p>Confirmed</p>
              <h3>{formatPrice(stats.confirmedRevenue)}</h3>
            </div>
          </div>

          <div className="mrev-card mrev-card-warning">
            <div className="mrev-card-icon"><i className="fas fa-clock"></i></div>
            <div className="mrev-card-content">
              <p>Upcoming</p>
              <h3>{formatPrice(stats.pendingRevenue)}</h3>
            </div>
          </div>

          <div className="mrev-card mrev-card-danger">
            <div className="mrev-card-icon"><i className="fas fa-undo"></i></div>
            <div className="mrev-card-content">
              <p>Refunded</p>
              <h3>{formatPrice(stats.refundedRevenue)}</h3>
            </div>
          </div>
        </section>

        {/* Filter */}
        <section className="mrev-filter">
          <div className="mrev-filter-label">Filter by Status:</div>
          <div className="mrev-filter-buttons">
            <button 
              className={`mrev-filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All ({bookings.length})
            </button>
            <button 
              className={`mrev-filter-btn ${filterStatus === 'confirmed' ? 'active' : ''}`}
              onClick={() => setFilterStatus('confirmed')}
            >
              Confirmed ({stats.confirmedBookings})
            </button>
            <button 
              className={`mrev-filter-btn ${filterStatus === 'upcoming' ? 'active' : ''}`}
              onClick={() => setFilterStatus('upcoming')}
            >
              Upcoming ({stats.pendingBookings})
            </button>
          </div>
        </section>

        {/* Transaction List */}
        <section className="mrev-transactions">
          <h3>Transaction Details</h3>
          {filteredBookings.length > 0 ? (
            <div className="mrev-list">
              {filteredBookings.map((booking) => (
                <div key={booking.id} className="mrev-item">
                  <div className="mrev-item-header">
                    <div className="mrev-item-guest">
                      <div className="mrev-guest-icon"><i className="fas fa-user"></i></div>
                      <div>
                        <h4>{booking.firstName} {booking.lastName}</h4>
                        <p>{booking.referenceNumber}</p>
                      </div>
                    </div>
                    <span className={`mrev-status ${getBookingState(booking)}`}>
                      {getBookingState(booking)}
                    </span>
                  </div>
                  <div className="mrev-item-details">
                    <div className="mrev-amount">
                      <span className="mrev-label">Payment</span>
                      <span className="mrev-value">{formatPrice(getBookingAmount(booking))}</span>
                    </div>
                    <div className="mrev-date">
                      <i className="fas fa-calendar-alt"></i>
                      <span>{new Date(booking.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mrev-empty-state">
              <i className="fas fa-inbox"></i>
              <p>No transactions found for this filter.</p>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

export default MyResortRevenue
