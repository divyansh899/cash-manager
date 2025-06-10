const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// MySQL connection setup
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

// Ensure heads table exists
db.query(`
  CREATE TABLE IF NOT EXISTS heads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE
  )
`);

// Route to insert cash entry
app.post('/add-entry', (req, res) => {
  const { date, head, cashIn, cashOut, transactionType, notes } = req.body;

  if (!date || !head || transactionType === undefined || cashIn === undefined || cashOut === undefined) {
    return res.status(400).json({ message: '❌ Missing required fields' });
  }

  // Add head if it doesn't exist
  db.query('INSERT IGNORE INTO heads (name) VALUES (?)', [head]);

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

// Route to get all entries
app.get('/entries', (req, res) => {
  db.query('SELECT * FROM entries ORDER BY id ASC', (err, results) => {
    if (err) return res.status(500).json({ message: '❌ Failed to fetch entries' });
    res.json(results);
  });
});

// Route to delete an entry by ID and recalculate balances
app.delete('/delete-entry/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM entries WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: '❌ Failed to delete entry' });

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

// Route to get all unique heads
app.get('/heads', (req, res) => {
  db.query('SELECT name FROM heads ORDER BY name ASC', (err, results) => {
    if (err) return res.status(500).json({ message: '❌ Failed to fetch heads' });
    res.json(results.map(row => row.name));
  });
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});