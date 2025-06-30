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

// Add entry with correct balance calculation
app.post('/add-entry', (req, res) => {
  const { date, head, cashIn, cashOut, transactionType, notes } = req.body;

  db.query('SELECT balance FROM entries ORDER BY id DESC LIMIT 1', (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch previous balance' });

    const prevBalance = results.length ? parseFloat(results[0].balance) : 0;
    const newBalance = prevBalance + (parseFloat(cashIn) || 0) - (parseFloat(cashOut) || 0);

    const query = `
      INSERT INTO entries (date, head, cashIn, cashOut, balance, transactionType, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [date, head, cashIn, cashOut, newBalance, transactionType, notes];

    db.query(query, values, (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Failed to add entry' });
      }
      res.json({ message: 'Entry added successfully' });
    });
  });
});

// Get all entries with accurate running balance (sorted by date)
app.get('/entries', (req, res) => {
  const { date, head } = req.query;

  let sql = 'SELECT * FROM entries';
  const params = [];

  if (date || head) {
    sql += ' WHERE';
    if (date) {
      sql += ' date = ?';
      params.push(date);
    }
    if (head) {
      if (date) sql += ' AND';
      sql += ' head = ?';
      params.push(head);
    }
  }

  // 👇 ORDER BY date instead of id
  sql += ' ORDER BY date ASC, id ASC';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching entries' });

    let runningBalance = 0;
    const updatedResults = results.map(entry => {
      runningBalance += parseFloat(entry.cashIn) - parseFloat(entry.cashOut);
      entry.balance = runningBalance;
      return entry;
    });

    res.json(updatedResults);
  });
});


// Delete entry and recalculate balances (sorted by date)
app.delete('/delete-entry/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM entries WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ message: 'Failed to delete entry' });

    db.query('SELECT * FROM entries ORDER BY date ASC, id ASC', (err, entries) => {
      if (err) return res.status(500).json({ message: 'Error refetching entries' });

      let runningBalance = 0;
      const updates = entries.map(entry => {
        runningBalance += parseFloat(entry.cashIn) - parseFloat(entry.cashOut);
        return new Promise((resolve, reject) => {
          db.query('UPDATE entries SET balance = ? WHERE id = ?', [runningBalance, entry.id], err => {
            if (err) reject(err);
            else resolve();
          });
        });
      });

      Promise.all(updates)
        .then(() => res.json({ message: 'Entry deleted and balances updated' }))
        .catch(err => res.status(500).json({ message: 'Balance recalculation failed' }));
    });
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
