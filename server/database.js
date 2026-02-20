const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ensure database file exists or is created
const dbPath = path.resolve(__dirname, 'bank.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeTables();
    }
});

// Generate a unique 12-digit account number
function generateAccountNumber() {
    // Format: KODA + 8 random digits (e.g., KODA12345678)
    const randomDigits = Math.floor(10000000 + Math.random() * 90000000);
    return `KODA${randomDigits}`;
}

function initializeTables() {
    db.serialize(() => {
        // Create BankUser table with account_number and phone
        db.run(`CREATE TABLE IF NOT EXISTS BankUser (
            Cid INTEGER PRIMARY KEY AUTOINCREMENT,
            Cname TEXT NOT NULL,
            Cpwd TEXT NOT NULL,
            balance REAL DEFAULT 0,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            account_number TEXT UNIQUE,
            created_at TEXT DEFAULT (datetime('now'))
        )`, (err) => {
            if (err) {
                console.error("Error creating BankUser table:", err.message);
            } else {
                console.log("BankUser table ready.");
            }
        });

        // Create BankUserJwt table
        db.run(`CREATE TABLE IF NOT EXISTS BankUserJwt (
            tokenid INTEGER PRIMARY KEY AUTOINCREMENT,
            tokenvalue TEXT NOT NULL,
            Cid INTEGER NOT NULL,
            exp INTEGER NOT NULL,
            FOREIGN KEY(Cid) REFERENCES BankUser(Cid)
        )`, (err) => {
            if (err) {
                console.error("Error creating BankUserJwt table:", err.message);
            } else {
                console.log("BankUserJwt table ready.");
            }
        });

        // Create Transactions table for history
        db.run(`CREATE TABLE IF NOT EXISTS Transactions (
            tid INTEGER PRIMARY KEY AUTOINCREMENT,
            from_account TEXT,
            to_account TEXT,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            from_name TEXT,
            to_name TEXT
        )`, (err) => {
            if (err) {
                console.error("Error creating Transactions table:", err.message);
            } else {
                console.log("Transactions table ready.");
            }
        });
    });
}

module.exports = { db, generateAccountNumber };
