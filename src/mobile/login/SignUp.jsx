import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, push, set, get } from 'firebase/database';
import { db, initializeWallet } from '../../firebase';
import './SignUp.css';

const SignUp = () => {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');

        if (!name || !email || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            // Fetch all users to check for existing email (no index required)
            const usersRef = ref(db, 'users');
            const snapshot = await get(usersRef);
            const users = snapshot.val();
            
            const existingUser = users && Object.values(users).find(u => u.email === email);

            if (existingUser) {
                setError('A user with this email already exists');
                return;
            }

            // Create new user
            const newUserRef = push(ref(db, 'users'));
            await set(newUserRef, {
                name,
                email,
                password,
                role: 'customer',
                isAdmin: false,
                createdAt: new Date().toISOString()
            });

            // Initialize wallet for new user
            await initializeWallet(newUserRef.key);

            alert('Account created successfully! Please login.');
            navigate('/login');
        } catch (error) {
            console.error('Signup error:', error);
            setError('Failed to create account. Please try again.');
        }
    };

    return (
        <div className="signup-container">
            {/* Header with Gradient Shape */}
            <div className="header-decoration">
                <div className="gradient-oval">
                    <h1 className="signup-title">SignUp</h1>
                </div>
            </div>

            <main className="signup-form-section">
                {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem', fontWeight: 'bold' }}>{error}</div>}
                <form onSubmit={handleSignUp} className="signup-form">
                    
                    {/* Name Input */}
                    <div className="input-group">
                        <label className="input-label">Name</label>
                        <input 
                            type="text" 
                            className="signup-input" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Email Input */}
                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input 
                            type="email" 
                            className="signup-input" 
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
                                className="signup-input" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <div className="password-icon" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                                <i className={`fas ${showPassword ? 'fa-lock-open' : 'fa-lock'}`}></i>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="signup-submit-btn">
                        SignUp
                    </button>
                </form>

                {/* Login Link */}
                <div className="login-footer">
                    <p>Already Registered?</p>
                    <button className="login-link-btn" onClick={() => navigate('/login')}>
                        Log in here.
                    </button>
                </div>
            </main>
        </div>
    );
};

export default SignUp;
