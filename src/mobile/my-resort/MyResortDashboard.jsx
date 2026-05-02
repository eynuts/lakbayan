import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { onValue, ref } from 'firebase/database'
import { useAuth } from '../../AuthContext'
import BottomNav from '../../components/BottomNav'
import { db } from '../../firebase'
import { getEffectiveBookingStatus, isRefundedBooking } from '../../utils/bookingStatus'
import './MyResortDashboard.css'

const MyResortDashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [resortData, setResortData] = useState(null)
  const [bookings, setBookings] = useState([])

  // 1. Fetch the owner's resort first
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
      } else {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [user, navigate])

  // 2. Fetch bookings and filter by resortId
  useEffect(() => {
    if (!resortData?.id) return

    const bookingsRef = ref(db, 'bookings')
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      const value = snapshot.val()
      if (!value) {
        setBookings([])
        setLoading(false)
        return
      }

      const allBookings = Object.entries(value).map(([id, item]) => ({ id, ...item }))
      // Filter bookings for THIS resort
      const filtered = allBookings.filter(b => b.resortId === resortData.id)
      
      setBookings(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
      setLoading(false)
    })

    return () => unsubscribe()
  }, [resortData])

  // 3. Analytics calculations
  const stats = useMemo(() => {
    const totalBookings = bookings.length
    const getBookingAmount = (booking) => Number(booking.totalPrice ?? booking.depositAmount) || 0
    const activeBookings = bookings.filter((booking) => !isRefundedBooking(booking))
    const confirmedRevenue = bookings
      .filter((booking) => getEffectiveBookingStatus(booking) === 'confirmed')
      .reduce((sum, b) => sum + getBookingAmount(b), 0)
    
    const totalPotentialRevenue = activeBookings.reduce((sum, b) => sum + getBookingAmount(b), 0)
    const upcomingBookings = activeBookings.filter((booking) => getEffectiveBookingStatus(booking) === 'upcoming').length
    
    return {
      totalBookings,
      confirmedRevenue,
      totalPotentialRevenue,
      upcomingBookings
    }
  }, [bookings])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(price)
  }

  if (loading) {
    return (
      <div className="mrd-container">
        <header className="mrd-header">
          <button className="mrd-back" onClick={() => navigate('/my-resort')}><i className="fas fa-chevron-left"></i></button>
          <h1>Admin Dashboard</h1>
          <div style={{ width: 40 }}></div>
        </header>
        <main className="mrd-main"><div className="mrd-empty">Analyzing data...</div></main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="mrd-container">
      <header className="mrd-header">
        <button className="mrd-back" onClick={() => navigate('/my-resort')}><i className="fas fa-chevron-left"></i></button>
        <h1>{resortData?.resortName || 'Resort'} Admin</h1>
        <div style={{ width: 40 }}></div>
      </header>

      <main className="mrd-main">
        {/* Welcome Section */}
        <section className="mrd-welcome">
          <div className="mrd-welcome-content">
            <h2>Welcome back!</h2>
            <p>Here's your resort performance overview</p>
          </div>
          <div className="mrd-welcome-icon"><i className="fas fa-chart-pie"></i></div>
        </section>

        {/* Analytics Section */}
        <section className="mrd-stats-section">
          <div className="mrd-stats-grid">
            <div className="mrd-stat-card">
              <div className="mrd-stat-header">
                <div className="mrd-stat-icon rev"><i className="fas fa-wallet"></i></div>
                <p className="mrd-stat-label">Total Revenue</p>
              </div>
              <h3 className="mrd-stat-value">{formatPrice(stats.totalPotentialRevenue)}</h3>
              <div className="mrd-stat-footer">
                <span className="mrd-stat-confirmed"><i className="fas fa-check-circle"></i> {formatPrice(stats.confirmedRevenue)} confirmed stays</span>
              </div>
            </div>
            
            <div className="mrd-stat-card">
              <div className="mrd-stat-header">
                <div className="mrd-stat-icon bookings"><i className="fas fa-calendar-check"></i></div>
                <p className="mrd-stat-label">Total Bookings</p>
              </div>
              <h3 className="mrd-stat-value">{stats.totalBookings}</h3>
              <div className="mrd-stat-footer">
                <span className="mrd-stat-pending"><i className="fas fa-clock"></i> {stats.upcomingBookings} upcoming</span>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="mrd-action-section">
          <h3 className="mrd-action-title">Quick Access</h3>
          <div className="mrd-action-grid">
            <button className="mrd-action-btn reservations-btn" type="button" onClick={() => navigate('/my-resort/reservations')}>
              <div className="mrd-action-icon"><i className="fas fa-calendar-check"></i></div>
              <div className="mrd-action-text">
                <h4>Reservations</h4>
                <p>{stats.totalBookings} Total</p>
              </div>
              <div className="mrd-action-arrow"><i className="fas fa-chevron-right"></i></div>
            </button>

            <button className="mrd-action-btn revenue-btn" type="button" onClick={() => navigate('/my-resort/revenue')}>
              <div className="mrd-action-icon"><i className="fas fa-chart-bar"></i></div>
              <div className="mrd-action-text">
                <h4>Revenue</h4>
                <p>{formatPrice(stats.confirmedRevenue)}</p>
              </div>
              <div className="mrd-action-arrow"><i className="fas fa-chevron-right"></i></div>
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}

export default MyResortDashboard
