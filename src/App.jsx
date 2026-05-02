import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './mobile/home/Home'
import Rooms from './mobile/rooms/Rooms'
import Activity from './mobile/activity/Activity'
import Gallery from './mobile/gallery/Gallery'
import Discover from './mobile/discover/Discover'
import Login from './mobile/login/Login'
import EmailLogin from './mobile/login/EmailLogin'
import SignUp from './mobile/login/SignUp'
import Location from './mobile/location/Location'
import Booking from './mobile/booking/Booking'
import Wallet from './mobile/wallet/Wallet'
import TopUp from './mobile/wallet/TopUp'
import CashOut from './mobile/wallet/CashOut'
import History from './mobile/wallet/History'
import ScanQR from './mobile/wallet/ScanQR'
import SendPayment from './mobile/wallet/SendPayment'
import ReceivePayment from './mobile/wallet/ReceivePayment'
import Profile from './mobile/profile/Profile'
import EditProfile from './mobile/profile/EditProfile'
import Security from './mobile/profile/Security'
import ChangePassword from './mobile/profile/ChangePassword'
import MyResorts from './mobile/profile/MyResorts'
import AdminMobile from './mobile/admin/Admin'
import AdminUsers from './mobile/admin/AdminUsers'
import AdminApplications from './mobile/admin/AdminApplications'
import AdminTopUps from './mobile/admin/AdminTopUps'
import AdminCashouts from './mobile/admin/AdminCashouts'
import MyResort from './mobile/my-resort/MyResort'
import MyResortRooms from './mobile/my-resort/MyResortRooms'
import MyResortActivities from './mobile/my-resort/MyResortActivities'
import MyResortGallery from './mobile/my-resort/MyResortGallery'
import MyResortDashboard from './mobile/my-resort/MyResortDashboard'
import MyResortReservations from './mobile/my-resort/MyResortReservations'
import MyResortRevenue from './mobile/my-resort/MyResortRevenue'
import Payment from './mobile/payment/Payment'
import RegisterResort from './mobile/register-resort/RegisterResort'
import ResortDetail from './mobile/resort-detail/ResortDetail'
import './App.css'

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
    } else {
      const element = document.querySelector(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [pathname, hash])

  return null
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<EmailLogin />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/accommodations" element={<Rooms />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/location" element={<Location />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/scan" element={<ScanQR />} />
        <Route path="/send" element={<SendPayment />} />
        <Route path="/receive" element={<ReceivePayment />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/security" element={<Security />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/booking" element={<Booking />} />
        <Route path="/topup" element={<TopUp />} />
        <Route path="/cashout" element={<CashOut />} />
        <Route path="/history" element={<History />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/admin" element={<AdminMobile />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/applications" element={<AdminApplications />} />
        <Route path="/admin/topups" element={<AdminTopUps />} />
        <Route path="/admin/cashouts" element={<AdminCashouts />} />
        <Route path="/admin-web" element={<AdminMobile />} />
        <Route path="/register-resort" element={<RegisterResort />} />
        <Route path="/my-resorts" element={<MyResorts />} />
        <Route path="/my-resort" element={<MyResort />} />
        <Route path="/my-resort/rooms" element={<MyResortRooms />} />
        <Route path="/my-resort/activities" element={<MyResortActivities />} />
        <Route path="/my-resort/gallery" element={<MyResortGallery />} />
        <Route path="/my-resort/dashboard" element={<MyResortDashboard />} />
        <Route path="/my-resort/reservations" element={<MyResortReservations />} />
        <Route path="/my-resort/revenue" element={<MyResortRevenue />} />
        <Route path="/resorts/:resortId" element={<ResortDetail />} />
      </Routes>
    </Router>
  )
}

export default App
