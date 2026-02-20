const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const { db, generateAccountNumber } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'KodBank_Secret_Key_2026';

app.use(express.json());
app.use(cors());

// ─── Middleware ─────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const query = `SELECT * FROM BankUserJwt WHERE tokenvalue = ?`;
    db.get(query, [token], (err, row) => {
        if (err) return res.sendStatus(500);
        if (!row) return res.sendStatus(403);

        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    });
};

// ─── Register ───────────────────────────────────────────────────────────
app.post('/register', async (req, res) => {
    const { name, password, email, phone } = req.body;

    if (!name || !password || !email) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const accountNumber = generateAccountNumber();
        const initialBalance = 0; // Real bank: start with 0

        const query = `INSERT INTO BankUser (Cname, Cpwd, balance, email, phone, account_number) VALUES (?, ?, ?, ?, ?, ?)`;
        db.run(query, [name, hashedPassword, initialBalance, email, phone || null, accountNumber], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed: BankUser.email')) {
                    return res.status(400).json({ error: 'Email already registered' });
                }
                return res.status(400).json({ error: err.message });
            }
            res.json({
                id: this.lastID,
                accountNumber: accountNumber,
                message: "Account created successfully! Your account number is: " + accountNumber
            });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── Login ──────────────────────────────────────────────────────────────
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const query = `SELECT * FROM BankUser WHERE email = ?`;

    db.get(query, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: "User not found" });

        if (await bcrypt.compare(password, user.Cpwd)) {
            const token = jwt.sign(
                { id: user.Cid, email: user.email, accountNumber: user.account_number },
                SECRET_KEY,
                { expiresIn: '1h' }
            );
            const exp = Date.now() + 3600000;

            const insertToken = `INSERT INTO BankUserJwt (tokenvalue, Cid, exp) VALUES (?, ?, ?)`;
            db.run(insertToken, [token, user.Cid, exp], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({
                    token,
                    user: {
                        id: user.Cid,
                        name: user.Cname,
                        email: user.email,
                        phone: user.phone,
                        accountNumber: user.account_number,
                        balance: user.balance,
                        createdAt: user.created_at
                    }
                });
            });
        } else {
            res.status(400).json({ error: "Invalid password" });
        }
    });
});

// ─── Get Profile ────────────────────────────────────────────────────────
app.get('/profile', authenticateToken, (req, res) => {
    const query = `SELECT Cid, Cname, email, phone, account_number, balance, created_at FROM BankUser WHERE Cid = ?`;
    db.get(query, [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "User not found" });
        res.json({
            id: row.Cid,
            name: row.Cname,
            email: row.email,
            phone: row.phone,
            accountNumber: row.account_number,
            balance: row.balance,
            createdAt: row.created_at
        });
    });
});

// ─── Check Balance ──────────────────────────────────────────────────────
app.get('/balance', authenticateToken, (req, res) => {
    const query = `SELECT balance, account_number FROM BankUser WHERE Cid = ?`;
    db.get(query, [req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ balance: row.balance, accountNumber: row.account_number });
    });
});

// ─── Deposit Money ──────────────────────────────────────────────────────
app.post('/deposit', authenticateToken, (req, res) => {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    db.get(`SELECT Cname, account_number, balance FROM BankUser WHERE Cid = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        const newBalance = user.balance + parseFloat(amount);

        db.run(`UPDATE BankUser SET balance = ? WHERE Cid = ?`, [newBalance, userId], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Log transaction
            db.run(`INSERT INTO Transactions (from_account, to_account, amount, type, description, from_name, to_name)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['SELF_DEPOSIT', user.account_number, parseFloat(amount), 'DEPOSIT',
                    `Cash deposit to account`, user.Cname, user.Cname],
                (err) => {
                    if (err) console.error("Failed to log transaction:", err.message);
                }
            );

            res.json({
                message: `₹${parseFloat(amount).toFixed(2)} deposited successfully`,
                newBalance: newBalance
            });
        });
    });
});

// ─── Withdraw Money ─────────────────────────────────────────────────────
app.post('/withdraw', authenticateToken, (req, res) => {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Amount must be greater than 0" });
    }

    db.get(`SELECT Cname, account_number, balance FROM BankUser WHERE Cid = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

        const newBalance = user.balance - parseFloat(amount);

        db.run(`UPDATE BankUser SET balance = ? WHERE Cid = ?`, [newBalance, userId], function (err) {
            if (err) return res.status(500).json({ error: err.message });

            db.run(`INSERT INTO Transactions (from_account, to_account, amount, type, description, from_name, to_name)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [user.account_number, 'SELF_WITHDRAW', parseFloat(amount), 'WITHDRAW',
                    `Cash withdrawal from account`, user.Cname, user.Cname],
                (err) => {
                    if (err) console.error("Failed to log transaction:", err.message);
                }
            );

            res.json({
                message: `₹${parseFloat(amount).toFixed(2)} withdrawn successfully`,
                newBalance: newBalance
            });
        });
    });
});

// ─── Transfer Money (by Account Number or Email) ────────────────────────
app.post('/transfer', authenticateToken, (req, res) => {
    const { toAccount, toEmail, amount } = req.body;
    const fromId = req.user.id;

    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
    if (!toAccount && !toEmail) return res.status(400).json({ error: "Provide recipient account number or email" });

    db.serialize(() => {
        db.get(`SELECT Cid, Cname, account_number, balance FROM BankUser WHERE Cid = ?`, [fromId], (err, sender) => {
            if (err) return res.status(500).json({ error: err.message });
            if (sender.balance < amount) return res.status(400).json({ error: "Insufficient funds" });

            // Find recipient by account number or email
            const recipientQuery = toAccount
                ? `SELECT Cid, Cname, account_number FROM BankUser WHERE account_number = ?`
                : `SELECT Cid, Cname, account_number FROM BankUser WHERE email = ?`;
            const recipientParam = toAccount || toEmail;

            db.get(recipientQuery, [recipientParam], (err, recipient) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!recipient) return res.status(404).json({ error: "Recipient not found" });
                if (recipient.Cid === sender.Cid) return res.status(400).json({ error: "Cannot transfer to yourself" });

                // Perform transfer
                db.run(`UPDATE BankUser SET balance = balance - ? WHERE Cid = ?`, [parseFloat(amount), fromId]);
                db.run(`UPDATE BankUser SET balance = balance + ? WHERE Cid = ?`, [parseFloat(amount), recipient.Cid]);

                // Log transaction
                db.run(`INSERT INTO Transactions (from_account, to_account, amount, type, description, from_name, to_name)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [sender.account_number, recipient.account_number, parseFloat(amount), 'TRANSFER',
                    `Transfer from ${sender.Cname} to ${recipient.Cname}`,
                    sender.Cname, recipient.Cname],
                    (err) => {
                        if (err) console.error("Failed to log transaction:", err.message);
                    }
                );

                res.json({
                    message: `₹${parseFloat(amount).toFixed(2)} sent to ${recipient.Cname} successfully`,
                    recipientName: recipient.Cname,
                    recipientAccount: recipient.account_number
                });
            });
        });
    });
});

// ─── Transaction History ────────────────────────────────────────────────
app.get('/transactions', authenticateToken, (req, res) => {
    db.get(`SELECT account_number FROM BankUser WHERE Cid = ?`, [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        const query = `SELECT * FROM Transactions
                       WHERE from_account = ? OR to_account = ?
                       ORDER BY created_at DESC
                       LIMIT 50`;
        db.all(query, [user.account_number, user.account_number], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                transactions: rows,
                userAccount: user.account_number
            });
        });
    });
});

// ─── Logout ─────────────────────────────────────────────────────────────
app.post('/logout', authenticateToken, (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const query = `DELETE FROM BankUserJwt WHERE tokenvalue = ?`;
    db.run(query, [token], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Logged out successfully" });
    });
});

// ─── Serve React Frontend (Production) ──────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// Catch-all: send React's index.html for any non-API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🏦 KodBank Server running on port ${PORT}`);
});
