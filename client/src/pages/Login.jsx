import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/login', { email, password });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-panel auth-card">
                <div className="auth-logo">
                    <div className="logo-icon">🏦</div>
                    <h1>KodBank</h1>
                </div>
                <p className="auth-subtitle">Welcome back! Sign in to your account</p>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '12px',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        color: '#ef4444',
                        fontSize: '0.85rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="input-group">
                        <span className="input-icon">✉️</span>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="input-field"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="input-group">
                        <span className="input-icon">🔒</span>
                        <input
                            type="password"
                            placeholder="Password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: '0.5rem' }}
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="auth-link">
                    New here? <Link to="/register">Open an Account</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
