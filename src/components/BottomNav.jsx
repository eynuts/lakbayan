import React from 'react';
import { NavLink } from 'react-router-dom';
import './BottomNav.css';

const BottomNav = () => {
    return (
        <nav className="bottom-nav">
            <NavLink to="/home" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="nav-icon">
                    <i className="fas fa-home"></i>
                </div>
                <span>Home</span>
            </NavLink>
            <NavLink to="/discover" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="nav-icon">
                    <i className="fas fa-compass"></i>
                </div>
                <span>Discover</span>
            </NavLink>
            <NavLink to="/gallery" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="nav-icon">
                    <i className="fas fa-images"></i>
                </div>
                <span>Gallery</span>
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <div className="nav-icon">
                    <i className="fas fa-user"></i>
                </div>
                <span>Profile</span>
            </NavLink>
        </nav>
    );
};

export default BottomNav;
