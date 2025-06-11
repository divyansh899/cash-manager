const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;
const path = require('path');

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('frontend'));

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Radhey2005@',
  database: 'cash_manager'
});

db.connect(err => {
  if (err) throw err;
  console.log('✅ Connected to MySQL Database');
});

// Ensure 'heads' table exists
db.query(`
  CREATE TABLE IF NOT EXISTS heads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE
  )
`);

// Ensure 'entries' table exists
db.query(`
  CREATE TABLE IF NOT EXISTS entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    head VARCHAR(255) NOT NULL,
    cashIn DECIMAL(10,2) DEFAULT 0,
    cashOut DECIMAL(10,2) DEFAULT 0,
    balance DECIMAL(10,2),
    transactionType VARCHAR(50),
    notes TEXT
  )
`);

// POST: Add cash entry
app.post('/add-entry', (req, res) => {
  const { date, head, cashIn = 0, cashOut = 0, transactionType, notes } = req.body;

  if (!date || !head || !transactionType) {
    return res.status(400).json({ message: '❌ Missing required fields' });
  }

  // Add head if not exists
  db.query('INSERT IGNORE INTO heads (name) VALUES (?)', [head], (err) => {
    if (err) console.error('Error inserting head:', err);
  });

  // Get last balance
  db.query('SELECT balance FROM entries ORDER BY id DESC LIMIT 1', (err, results) => {
    if (err) return res.status(500).json({ message: '❌ Failed to fetch previous balance' });

    const previousBalance = results.length ? parseFloat(results[0].balance) : 0;
    const newBalance = previousBalance + parseFloat(cashIn) - parseFloat(cashOut);

    const sql = `
      INSERT INTO entries (date, head, cashIn, cashOut, balance, transactionType, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [date, head, cashIn, cashOut, newBalance, transactionType, notes];

    db.query(sql, values, (err) => {
      if (err) return res.status(500).json({ message: '❌ Failed to add entry' });
      res.json({ message: '✅ Entry added successfully' });
    });
  });
});

// GET: Fetch all entries
app.get('/entries', (req, res) => {
  db.query('SELECT * FROM entries ORDER BY id ASC', (err, results) => {
    if (err) return res.status(500).json({ message: '❌ Failed to fetch entries' });
    res.json(results);
  });
});

// DELETE: Remove entry by ID and update balances
app.delete('/delete-entry/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM entries WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: '❌ Failed to delete entry' });

    // Recalculate balances
    db.query('SELECT * FROM entries ORDER BY id ASC', (err, entries) => {
      if (err) return res.status(500).json({ message: '❌ Failed to fetch updated entries' });

      let runningBalance = 0;

      const updates = entries.map(entry => {
        runningBalance += parseFloat(entry.cashIn) - parseFloat(entry.cashOut);
        return new Promise((resolve, reject) => {
          db.query(
            'UPDATE entries SET balance = ? WHERE id = ?',
            [runningBalance, entry.id],
            err => (err ? reject(err) : resolve())
          );
        });
      });

      Promise.all(updates)
        .then(() => res.json({ message: '✅ Entry deleted and balances updated' }))
        .catch(err => res.status(500).json({ message: '❌ Balance recalculation failed', error: err }));
    });
  });
});

// GET: Fetch unique heads
app.get('/heads', (req, res) => {
  db.query('SELECT name FROM heads ORDER BY name ASC', (err, results) => {
    if (err) return res.status(500).json({ message: '❌ Failed to fetch heads' });
    res.json(results.map(row => row.name));
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
