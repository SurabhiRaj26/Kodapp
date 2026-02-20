const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'bank.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + err.message);
        return;
    }
});

db.serialize(() => {
    console.log("\n--- Table: BankUser ---");
    db.all("SELECT * FROM BankUser", (err, rows) => {
        if (err) {
            console.error(err.message);
        } else {
            console.table(rows);
        }
    });

    console.log("\n--- Table: BankUserJwt ---");
    db.all("SELECT * FROM BankUserJwt", (err, rows) => {
        if (err) {
            console.error(err.message);
        } else {
            console.table(rows);
        }
    });
});

db.close();
