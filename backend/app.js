const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Radhey2005@', // update as needed
  database: 'cashbook'
});

db.connect(err => {
  if (err) throw err;
  console.log('MySQL connected.');
});

// Create entries table
db.query(`
  CREATE TABLE IF NOT EXISTS entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE,
    head VARCHAR(255),
    cashIn DECIMAL(10,2),
    cashOut DECIMAL(10,2),
    balance DECIMAL(10,2),
    transactionType VARCHAR(50),
    notes TEXT
  )
`);

// Create heads table
db.query(`
  CREATE TABLE IF NOT EXISTS heads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE
  )
`);

// Add entry
app.post('/add-entry', (req, res) => {
  const { date, head, cashIn, cashOut, transactionType, notes } = req.body;

  // Temporarily store balance as 0; will be updated in GET
  const query = `
    INSERT INTO entries (date, head, cashIn, cashOut, balance, transactionType, notes)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `;

  db.query(query, [date, head, cashIn, cashOut, transactionType, notes], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to add entry' });
    }
    res.json({ message: 'Entry added successfully' });
  });
});

// Get all entries with running balance
app.get('/entries', (req, res) => {
  db.query('SELECT * FROM entries ORDER BY id ASC', (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching entries' });

    let runningBalance = 0;
    const updatedResults = results.map(entry => {
      runningBalance += parseFloat(entry.cashIn) - parseFloat(entry.cashOut);
      return {
        ...entry,
        balance: runningBalance
      };
    });

    res.json(updatedResults);
  });
});

// Delete an entry and reassign balances on frontend
app.delete('/delete-entry/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM entries WHERE id = ?', [id], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to delete entry' });
    res.json({ message: 'Entry deleted successfully' });
  });
});

// Get all heads
app.get('/heads', (req, res) => {
  db.query('SELECT name FROM heads', (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to load heads' });
    res.json(results.map(row => row.name));
  });
});

// Add a new head
app.post('/add-head', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Head name required' });

  const query = 'INSERT IGNORE INTO heads (name) VALUES (?)';
  db.query(query, [name], (err) => {
    if (err) return res.status(500).json({ message: 'Failed to add head' });
    res.json({ message: 'Head added successfully' });
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});