import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.DEV ? 'http://localhost:5000' : '';

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [balance, setBalance] = useState(null);
    const [profile, setProfile] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Modal states
    const [showDeposit, setShowDeposit] = useState(false);
    const [showWithdraw, setShowWithdraw] = useState(false);
    const [showTransfer, setShowTransfer] = useState(false);

    // Form states
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [transferAccount, setTransferAccount] = useState('');
    const [transferEmail, setTransferEmail] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferMode, setTransferMode] = useState('account'); // 'account' or 'email'

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const navigate = useNavigate();

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const authHeader = { headers: { Authorization: `Bearer ${token}` } };

    const fetchProfile = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/profile`, authHeader);
            setProfile(res.data);
            setBalance(res.data.balance);
        } catch (err) {
            if (err.response?.status === 401 || err.response?.status === 403) {
                handleLogout();
            }
        }
    }, [token]);

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/transactions`, authHeader);
            setTransactions(res.data.transactions || []);
        } catch (err) {
            console.error('Failed to fetch transactions');
        }
    }, [token]);

    useEffect(() => {
        if (!token) {
            navigate('/');
            return;
        }
        fetchProfile();
        fetchTransactions();
    }, [token, navigate, fetchProfile, fetchTransactions]);

    // ─── Deposit ─────────────────────────────────────────────────────
    const handleDeposit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${API}/deposit`, { amount: parseFloat(depositAmount) }, authHeader);
            showToast(res.data.message, 'success');
            setBalance(res.data.newBalance);
            setShowDeposit(false);
            setDepositAmount('');
            fetchTransactions();
            fetchProfile();
        } catch (err) {
            showToast(err.response?.data?.error || 'Deposit failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ─── Withdraw ────────────────────────────────────────────────────
    const handleWithdraw = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${API}/withdraw`, { amount: parseFloat(withdrawAmount) }, authHeader);
            showToast(res.data.message, 'success');
            setBalance(res.data.newBalance);
            setShowWithdraw(false);
            setWithdrawAmount('');
            fetchTransactions();
            fetchProfile();
        } catch (err) {
            showToast(err.response?.data?.error || 'Withdrawal failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ─── Transfer ────────────────────────────────────────────────────
    const handleTransfer = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const body = {
                amount: parseFloat(transferAmount),
                ...(transferMode === 'account' ? { toAccount: transferAccount } : { toEmail: transferEmail })
            };
            const res = await axios.post(`${API}/transfer`, body, authHeader);
            showToast(res.data.message, 'success');
            setShowTransfer(false);
            setTransferAccount('');
            setTransferEmail('');
            setTransferAmount('');
            fetchProfile();
            fetchTransactions();
        } catch (err) {
            showToast(err.response?.data?.error || 'Transfer failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ─── Logout ──────────────────────────────────────────────────────
    const handleLogout = async () => {
        try {
            await axios.post(`${API}/logout`, {}, authHeader);
        } catch (e) { /* silent */ }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/');
    };

    const formatCurrency = (amt) => `₹${parseFloat(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' • ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    return (
        <div className="dashboard-container">
            {/* ─── Header ─────────────────────────────────────────── */}
            <header className="dashboard-header">
                <div className="header-brand">
                    <div className="brand-icon">🏦</div>
                    <h1>KodBank</h1>
                </div>
                <div className="header-user">
                    <div className="header-user-info">
                        <div className="user-name">{user?.name || profile?.name}</div>
                        <div className="user-account">{user?.accountNumber || profile?.accountNumber}</div>
                    </div>
                    <div className="user-avatar">{getInitials(user?.name || profile?.name)}</div>
                    <button className="btn-secondary" onClick={handleLogout} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                        Logout
                    </button>
                </div>
            </header>

            {/* ─── Navigation Tabs ────────────────────────────────── */}
            <div className="dashboard-main">
                <nav className="dashboard-nav">
                    {[
                        { id: 'overview', icon: '📊', label: 'Overview' },
                        { id: 'transactions', icon: '📋', label: 'Transactions' },
                        { id: 'profile', icon: '👤', label: 'My Account' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>

                {/* ─── Overview Tab ───────────────────────────────── */}
                {activeTab === 'overview' && (
                    <>
                        {/* Summary Cards */}
                        <div className="account-summary">
                            <div className="glass-panel summary-card balance-card">
                                <div className="summary-label">Available Balance</div>
                                <div className="summary-value gradient-blue">
                                    {balance !== null ? formatCurrency(balance) : '—'}
                                </div>
                                <div className="summary-sub">Updated just now</div>
                            </div>
                            <div className="glass-panel summary-card account-card">
                                <div className="summary-label">Account Number</div>
                                <div className="summary-value gradient-purple">
                                    {profile?.accountNumber || user?.accountNumber || '—'}
                                </div>
                                <div className="summary-sub">Savings Account</div>
                            </div>
                            <div className="glass-panel summary-card status-card">
                                <div className="summary-label">Account Status</div>
                                <div className="summary-value gradient-green">Active</div>
                                <div className="summary-sub">
                                    <span className="account-badge active">● Verified</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="quick-actions">
                            <button className="action-btn deposit-btn" onClick={() => setShowDeposit(true)}>
                                <span className="action-icon">💰</span>
                                <span className="action-label">Deposit</span>
                                <span className="action-desc">Add money</span>
                            </button>
                            <button className="action-btn withdraw-btn" onClick={() => setShowWithdraw(true)}>
                                <span className="action-icon">🏧</span>
                                <span className="action-label">Withdraw</span>
                                <span className="action-desc">Cash out</span>
                            </button>
                            <button className="action-btn transfer-btn" onClick={() => setShowTransfer(true)}>
                                <span className="action-icon">💸</span>
                                <span className="action-label">Transfer</span>
                                <span className="action-desc">Send money</span>
                            </button>
                            <button className="action-btn history-btn" onClick={() => { setActiveTab('transactions'); fetchTransactions(); }}>
                                <span className="action-icon">📜</span>
                                <span className="action-label">History</span>
                                <span className="action-desc">View all</span>
                            </button>
                        </div>

                        {/* Recent Transactions */}
                        <div className="transactions-section">
                            <div className="section-header">
                                <h3 className="section-title">Recent Transactions</h3>
                                <button className="btn-secondary" onClick={() => { setActiveTab('transactions'); fetchTransactions(); }}
                                    style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '8px' }}>
                                    View All
                                </button>
                            </div>
                            {transactions.length === 0 ? (
                                <div className="glass-panel empty-state">
                                    <div className="empty-icon">📭</div>
                                    <p>No transactions yet. Make your first deposit!</p>
                                </div>
                            ) : (
                                <div className="transaction-list">
                                    {transactions.slice(0, 5).map((txn) => (
                                        <TransactionItem key={txn.tid} txn={txn} userAccount={profile?.accountNumber || user?.accountNumber} formatCurrency={formatCurrency} formatDate={formatDate} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ─── Transactions Tab ───────────────────────────── */}
                {activeTab === 'transactions' && (
                    <div className="transactions-section">
                        <div className="section-header">
                            <h3 className="section-title">All Transactions</h3>
                            <button className="btn-secondary" onClick={fetchTransactions}
                                style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '8px' }}>
                                🔄 Refresh
                            </button>
                        </div>
                        {transactions.length === 0 ? (
                            <div className="glass-panel empty-state">
                                <div className="empty-icon">📭</div>
                                <p>No transactions found. Start by making a deposit or transfer.</p>
                            </div>
                        ) : (
                            <div className="transaction-list">
                                {transactions.map((txn) => (
                                    <TransactionItem key={txn.tid} txn={txn} userAccount={profile?.accountNumber || user?.accountNumber} formatCurrency={formatCurrency} formatDate={formatDate} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Profile Tab ────────────────────────────────── */}
                {activeTab === 'profile' && (
                    <div className="profile-section">
                        <div className="glass-panel profile-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="user-avatar" style={{ width: '60px', height: '60px', fontSize: '1.5rem', borderRadius: '16px' }}>
                                    {getInitials(profile?.name || user?.name)}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{profile?.name || user?.name}</h2>
                                    <span className="account-badge active" style={{ marginTop: '4px' }}>● Active Account</span>
                                </div>
                            </div>

                            <div className="profile-row">
                                <span className="label">Account Number</span>
                                <span className="value mono">{profile?.accountNumber || user?.accountNumber}</span>
                            </div>
                            <div className="profile-row">
                                <span className="label">Full Name</span>
                                <span className="value">{profile?.name || user?.name}</span>
                            </div>
                            <div className="profile-row">
                                <span className="label">Email</span>
                                <span className="value">{profile?.email || user?.email}</span>
                            </div>
                            <div className="profile-row">
                                <span className="label">Phone</span>
                                <span className="value">{profile?.phone || user?.phone || 'Not provided'}</span>
                            </div>
                            <div className="profile-row">
                                <span className="label">Account Balance</span>
                                <span className="value" style={{ color: '#10b981', fontWeight: 700 }}>
                                    {balance !== null ? formatCurrency(balance) : '—'}
                                </span>
                            </div>
                            <div className="profile-row">
                                <span className="label">Account Type</span>
                                <span className="value">Savings Account</span>
                            </div>
                            <div className="profile-row">
                                <span className="label">Member Since</span>
                                <span className="value">
                                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Deposit Modal ──────────────────────────────────── */}
            {showDeposit && (
                <div className="modal-overlay" onClick={() => setShowDeposit(false)}>
                    <div className="glass-panel modal-content deposit-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>💰 Deposit Money</h2>
                            <button className="modal-close" onClick={() => setShowDeposit(false)}>×</button>
                        </div>
                        <form onSubmit={handleDeposit}>
                            <div className="modal-input-group">
                                <label>Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="Enter amount"
                                    value={depositAmount}
                                    onChange={e => setDepositAmount(e.target.value)}
                                    min="1"
                                    step="0.01"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                💡 Your current balance: <strong style={{ color: '#10b981' }}>{balance !== null ? formatCurrency(balance) : '—'}</strong>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowDeposit(false)}>Cancel</button>
                                <button type="submit" className="btn-primary btn-success" disabled={loading}>
                                    {loading ? 'Processing...' : 'Deposit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Withdraw Modal ─────────────────────────────────── */}
            {showWithdraw && (
                <div className="modal-overlay" onClick={() => setShowWithdraw(false)}>
                    <div className="glass-panel modal-content withdraw-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🏧 Withdraw Money</h2>
                            <button className="modal-close" onClick={() => setShowWithdraw(false)}>×</button>
                        </div>
                        <form onSubmit={handleWithdraw}>
                            <div className="modal-input-group">
                                <label>Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="Enter amount"
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    min="1"
                                    step="0.01"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                💡 Available balance: <strong style={{ color: '#f59e0b' }}>{balance !== null ? formatCurrency(balance) : '—'}</strong>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowWithdraw(false)}>Cancel</button>
                                <button type="submit" className="btn-primary btn-danger" disabled={loading}>
                                    {loading ? 'Processing...' : 'Withdraw'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Transfer Modal ─────────────────────────────────── */}
            {showTransfer && (
                <div className="modal-overlay" onClick={() => setShowTransfer(false)}>
                    <div className="glass-panel modal-content transfer-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>💸 Send Money</h2>
                            <button className="modal-close" onClick={() => setShowTransfer(false)}>×</button>
                        </div>
                        <form onSubmit={handleTransfer}>
                            {/* Transfer Mode Toggle */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                <button
                                    type="button"
                                    className={`nav-tab ${transferMode === 'account' ? 'active' : ''}`}
                                    onClick={() => setTransferMode('account')}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    Account No.
                                </button>
                                <button
                                    type="button"
                                    className={`nav-tab ${transferMode === 'email' ? 'active' : ''}`}
                                    onClick={() => setTransferMode('email')}
                                    style={{ flex: 1, justifyContent: 'center' }}
                                >
                                    Email
                                </button>
                            </div>

                            <div className="modal-input-group">
                                <label>{transferMode === 'account' ? 'Recipient Account Number' : 'Recipient Email'}</label>
                                {transferMode === 'account' ? (
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g. KODA12345678"
                                        value={transferAccount}
                                        onChange={e => setTransferAccount(e.target.value)}
                                        required
                                    />
                                ) : (
                                    <input
                                        type="email"
                                        className="input-field"
                                        placeholder="recipient@email.com"
                                        value={transferEmail}
                                        onChange={e => setTransferEmail(e.target.value)}
                                        required
                                    />
                                )}
                            </div>
                            <div className="modal-input-group">
                                <label>Amount (₹)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    placeholder="Enter amount"
                                    value={transferAmount}
                                    onChange={e => setTransferAmount(e.target.value)}
                                    min="1"
                                    step="0.01"
                                    required
                                />
                            </div>
                            <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.08)', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                💡 Available balance: <strong style={{ color: '#3b82f6' }}>{balance !== null ? formatCurrency(balance) : '—'}</strong>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowTransfer(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Money'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Toast ──────────────────────────────────────────── */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
                    {toast.message}
                </div>
            )}
        </div>
    );
};

// ─── Transaction Item Component ──────────────────────────────────────
const TransactionItem = ({ txn, userAccount, formatCurrency, formatDate }) => {
    let icon, iconClass, title, amountClass, amountPrefix;

    if (txn.type === 'DEPOSIT') {
        icon = '⬇️';
        iconClass = 'deposit';
        title = 'Cash Deposit';
        amountClass = 'credit';
        amountPrefix = '+';
    } else if (txn.type === 'WITHDRAW') {
        icon = '⬆️';
        iconClass = 'withdraw';
        title = 'Cash Withdrawal';
        amountClass = 'debit';
        amountPrefix = '-';
    } else if (txn.type === 'TRANSFER') {
        if (txn.from_account === userAccount) {
            icon = '↗️';
            iconClass = 'transfer-out';
            title = `Sent to ${txn.to_name}`;
            amountClass = 'debit';
            amountPrefix = '-';
        } else {
            icon = '↙️';
            iconClass = 'transfer-in';
            title = `Received from ${txn.from_name}`;
            amountClass = 'credit';
            amountPrefix = '+';
        }
    }

    return (
        <div className="transaction-item">
            <div className="txn-left">
                <div className={`txn-icon ${iconClass}`}>{icon}</div>
                <div className="txn-details">
                    <div className="txn-title">{title}</div>
                    <div className="txn-date">{formatDate(txn.created_at)}</div>
                </div>
            </div>
            <div className={`txn-amount ${amountClass}`}>
                {amountPrefix}{formatCurrency(txn.amount)}
            </div>
        </div>
    );
};

export default Dashboard;
