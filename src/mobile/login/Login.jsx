import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import './Login.css';
import logo from '../../assets/images/logo.png';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSignInWithMail = () => {
        navigate('/login');
    };

    const handleSignAsGuest = () => {
        navigate('/home');
    };

    return (
        <div className="login-container">
            <div className="gradient-mesh"></div>
            
            <div className="login-visual-section animate-scale-in">
                <img src={logo} alt="LAKBAYAN" className="main-app-logo" />
            </div>

            <div className="auth-sheet animate-slide-up">
                <div className="sheet-handle"></div>
                
                <div className="sheet-header">
                    <h1 className="welcome-text">Explore the paradise</h1>
                    <p className="subtitle-text">Sign in to start your luxury escape</p>
                </div>

                <div className="action-group">
                    <button 
                        className="btn-modern btn-primary-modern animate-fade-in-up"
                        onClick={handleSignInWithMail}
                        style={{"--delay": "0.1s"}}
                    >
                        <i className="far fa-envelope"></i>
                        Continue with Mail
                    </button>

                    <div className="separator animate-fade-in-up" style={{"--delay": "0.2s"}}>
                        <span>or</span>
                    </div>

                    <button 
                        className="btn-modern btn-outline-modern animate-fade-in-up"
                        onClick={handleSignAsGuest}
                        style={{"--delay": "0.3s"}}
                    >
                        Explore as guest
                    </button>
                </div>

                <div className="footer-links animate-fade-in-up" style={{"--delay": "0.4s"}}>
                    <span>Terms of Service</span>
                    <span className="dot"></span>
                    <span>Privacy Policy</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
