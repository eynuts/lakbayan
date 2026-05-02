import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import './Navbar.css'

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const { user, login, logout, manualUser } = useAuth()
  const displayUser = user || manualUser;
  const location = useLocation()
  const navigate = useNavigate()
  const userMenuRef = useRef(null)

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    closeMobileMenu();
    navigate('/');
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
    if (!isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
    document.body.style.overflow = 'auto'
  }

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen)
  }

  const isActive = (path) => {
    return location.pathname === path ? 'active' : ''
  }

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''} ${isMobileMenuOpen ? 'menu-open' : ''}`}>
      <div className="navbar-container">
        <Link to="/home" className="navbar-logo" onClick={closeMobileMenu}>Sidell Beach</Link>
        
        <div className="navbar-links">
          <Link to="/home" className={isActive('/home')}>Home</Link>
          <Link to="/rooms" className={isActive('/rooms')}>Rooms</Link>
          <Link to="/activity" className={isActive('/activity')}>Activities</Link>
          <Link to="/location" className={isActive('/location')}>Location</Link>
        </div>

        <div className="navbar-actions">
          {displayUser ? (
            <div className="user-menu-container" ref={userMenuRef}>
              <div className="user-profile-trigger" onClick={toggleUserMenu}>
                <div className="user-avatar-wrapper">
                  <img 
                    src={displayUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.displayName)}&background=0077b6&color=fff`} 
                    alt={displayUser.displayName} 
                    className="user-avatar" 
                  />
                  <span className="user-online-status"></span>
                </div>
                <span className="user-name-display">{displayUser.displayName?.split(' ')[0]}</span>
                <i className={`fas fa-chevron-down dropdown-icon ${isUserMenuOpen ? 'rotate' : ''}`}></i>
              </div>

              {isUserMenuOpen && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <p className="user-full-name">{user.displayName}</p>
                    <p className="user-email">{user.email}</p>
                  </div>
                  <div className="user-dropdown-divider"></div>
                  <Link to="/rooms" className="user-dropdown-item" onClick={() => setIsUserMenuOpen(false)}>
                    <i className="fas fa-calendar-alt"></i> My Bookings
                  </Link>
                  <Link to="/register-resort" className="user-dropdown-item" onClick={() => setIsUserMenuOpen(false)}>
                    <i className="fas fa-plus-circle"></i> Register a resort
                  </Link>
                  <button onClick={handleLogout} className="user-dropdown-item logout-item">
                    <i className="fas fa-sign-out-alt"></i> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={login} className="login-btn">
              <i className="fab fa-google"></i> Login
            </button>
          )}
          <Link to="/booking" className="book-btn">
            Book Now
          </Link>
        </div>

        <button className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`} onClick={toggleMobileMenu}>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-links">
          {displayUser && (
            <div className="mobile-user-info">
              <img 
                src={displayUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.displayName)}&background=0077b6&color=fff`} 
                alt={displayUser.displayName} 
                className="mobile-user-avatar"
              />
              <h3>{displayUser.displayName}</h3>
              <p>{displayUser.email}</p>
            </div>
          )}
          <Link to="/home" onClick={closeMobileMenu}>Home</Link>
          <Link to="/profile" onClick={closeMobileMenu}>Profile</Link>
          <Link to="/rooms" onClick={closeMobileMenu}>Rooms</Link>
          <Link to="/activity" onClick={closeMobileMenu}>Activities</Link>
          <Link to="/location" onClick={closeMobileMenu}>Location</Link>
          {displayUser ? (
            <>
              <Link to="/register-resort" className="mobile-login-btn register" onClick={closeMobileMenu}>
                <i className="fas fa-plus-circle"></i> Register a resort
              </Link>
              <button onClick={handleLogout} className="mobile-login-btn logout">
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </>
          ) : (
            <button onClick={() => { login(); closeMobileMenu(); }} className="mobile-login-btn">
              <i className="fab fa-google"></i> Login
            </button>
          )}
          <Link to="/booking" className="mobile-book-btn" onClick={closeMobileMenu}>
            Book Now
          </Link>
        </div>
        <div className="mobile-menu-social">
          <a href="#"><i className="fab fa-instagram"></i></a>
          <a href="#"><i className="fab fa-facebook-f"></i></a>
          <a href="#"><i className="fab fa-twitter"></i></a>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
