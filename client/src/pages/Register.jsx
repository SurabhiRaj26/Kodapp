import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/register', {
                name, email, password, phone
            });
            setSuccess({
                accountNumber: response.data.accountNumber,
                message: response.data.message
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    // Success screen after registration
    if (success) {
        return (
            <div className="auth-container">
                <div className="glass-panel success-card" style={{ maxWidth: '480px', width: '100%' }}>
                    <div className="success-icon">🎉</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Account Created!
                    </h2>
                    <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
                        Your KodBank account is ready. Save your account number:
                    </p>
                    <div className="account-number-display">
                        {success.accountNumber}
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '2rem' }}>
                        ⚠️ Please save this account number. You'll need it for receiving transfers.
                    </p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/')}
                    >
                        Continue to Login →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <div className="glass-panel auth-card">
                <div className="auth-logo">
                    <div className="logo-icon">🏦</div>
                    <h1>KodBank</h1>
                </div>
                <p className="auth-subtitle">Create your bank account in seconds</p>

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

                <form onSubmit={handleRegister}>
                    <div className="input-group">
                        <span className="input-icon">👤</span>
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="input-field"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
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
                        <span className="input-icon">📱</span>
                        <input
                            type="tel"
                            placeholder="Phone Number (Optional)"
                            className="input-field"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                    <div className="input-group">
                        <span className="input-icon">🔒</span>
                        <input
                            type="password"
                            placeholder="Create Password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={loading}
                        style={{ marginTop: '0.5rem' }}
                    >
                        {loading ? 'Creating Account...' : 'Open Account'}
                    </button>
                </form>

                <div className="auth-link">
                    Already have an account? <Link to="/">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
