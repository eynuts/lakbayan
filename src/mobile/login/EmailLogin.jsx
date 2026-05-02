import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import { ref, get } from 'firebase/database';
import { db, initializeWallet, getWalletBalance } from '../../firebase';
import './EmailLogin.css';

const EmailLogin = () => {
    const { setManualUser } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        try {
            // Fetch all users and find the one with matching email (no index required)
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);

            if (snapshot.exists()) {
                const usersData = snapshot.val();
                const userId = Object.keys(usersData).find(key => usersData[key].email === email);
                const user = userId ? usersData[userId] : null;

                if (user && user.password === password) {
                    // Success! 
                    // Ensure wallet is initialized for this user
                    try {
                        await getWalletBalance(userId);
                    } catch (error) {
                        // If wallet doesn't exist, create one
                        await initializeWallet(userId);
                    }

                    setManualUser({
                        uid: userId,
                        email: user.email,
                        displayName: user.name,
                        method: 'database',
                        role: user.role || 'customer',
                        isAdmin: !!user.isAdmin
                    });
                    navigate('/home');
                } else if (user) {
                    setError('Incorrect password');
                } else {
                    setError('No user found with this email');
                }
            } else {
                setError('No users found in database');
            }
        } catch (error) {
            console.error('Login error:', error);
            setError('An error occurred during login. Please try again.');
        }
    };

    return (
        <div className="email-login-container">
            {/* Header with Gradient Shape */}
            <div className="header-decoration">
                <div className="gradient-oval">
                    <h1 className="login-title">Login</h1>
                </div>
            </div>

            <main className="login-form-section">
                {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}
                <form onSubmit={handleLogin} className="login-form">
                    
                    {/* Email Input */}
                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input 
                            type="email" 
                            className="login-input" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {/* Password Input */}
                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div className="password-input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                className="login-input" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <div className="password-icon" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                                <i className={`fas ${showPassword ? 'fa-lock-open' : 'fa-lock'}`}></i>
                            </div>
                        </div>
                    </div>

                    {/* Login Button */}
                    <button type="submit" className="login-submit-btn">
                        login
                    </button>
                </form>

                {/* Signup Link */}
                <div className="signup-footer">
                    <p>Not have account?</p>
                    <button className="signup-link" onClick={() => navigate('/signup')}>
                        Signup here
                    </button>
                </div>
            </main>
        </div>
    );
};

export default EmailLogin;
