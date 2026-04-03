const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'dev-secret-key';

function runStatement(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve({
        id: this.lastID,
        changes: this.changes
      });
    });
  });
}

function getStatement(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row);
    });
  });
}

function allStatement(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// Database setup
const db = new sqlite3.Database('./clipit.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    university TEXT DEFAULT '',
    specialty TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    price INTEGER DEFAULT 0,
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migrate old users table columns if needed
  const userCols = [
    "ALTER TABLE users ADD COLUMN university TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN specialty TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT ''",
    "ALTER TABLE users ADD COLUMN price INTEGER DEFAULT 0",
    "ALTER TABLE users ADD COLUMN joined_at TEXT DEFAULT CURRENT_TIMESTAMP"
  ];
  userCols.forEach(sql => db.run(sql, err => {
    if (err && !err.message.includes('duplicate column name')) console.error(err.message);
  }));

  // Keep creators table for backward compat but don't seed it
  db.run(`CREATE TABLE IF NOT EXISTS creators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    specialty TEXT NOT NULL,
    bio TEXT DEFAULT '',
    rating INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0,
    avatar TEXT DEFAULT '',
    university TEXT DEFAULT '',
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    portfolio TEXT DEFAULT '[]'
  )`);

  const creatorColumns = [
    "ALTER TABLE creators ADD COLUMN user_id INTEGER UNIQUE",
    "ALTER TABLE creators ADD COLUMN joined_at TEXT DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE creators ADD COLUMN portfolio TEXT DEFAULT '[]'"
  ];
  creatorColumns.forEach(sql => db.run(sql, err => {
    if (err && !err.message.includes('duplicate column name')) console.error(err.message);
  }));

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    creator_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    project_name TEXT NOT NULL,
    hours INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    card_brand TEXT NOT NULL,
    card_last4 TEXT NOT NULL,
    payment_reference TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'paid',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES creators(id)
  )`);
  }); // end db.serialize
}

function validateAuthPayload(body, requireName = false) {

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (requireName && name.length < 2) {
    return { error: 'Name must be at least 2 characters long.' };
  }

  if (!email || !email.includes('@')) {
    return { error: 'A valid email is required.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  return { name, email, password };
}

function validateCreatorPayload(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const specialty = typeof body.specialty === 'string' ? body.specialty.trim() : '';
  const bio = typeof body.bio === 'string' ? body.bio.trim() : '';
  const avatar = typeof body.avatar === 'string' ? body.avatar.trim() : '';
  const university = typeof body.university === 'string' ? body.university.trim() : '';
  const price = Number(body.price);

  if (name.length < 2) {
    return { error: 'Creator name must be at least 2 characters long.' };
  }

  if (!isValidEmail(email)) {
    return { error: 'Enter a valid email address.' };
  }

  if (specialty.length < 3) {
    return { error: 'Specialty must be at least 3 characters long.' };
  }

  if (bio.length < 20) {
    return { error: 'Bio must be at least 20 characters long.' };
  }

  if (!Number.isFinite(price) || price < 10 || price > 1000) {
    return { error: 'Hourly price must be between 10 and 1000.' };
  }

  return {
    name,
    email,
    specialty,
    bio,
    avatar,
    university,
    price: Math.round(price)
  };
}

function isValidEmail(email) {
  return typeof email === 'string' && email.includes('@') && email.includes('.');
}

function detectCardBrand(cardNumber) {
  if (/^4/.test(cardNumber)) {
    return 'Visa';
  }

  if (/^(5[1-5]|2[2-7])/.test(cardNumber)) {
    return 'Mastercard';
  }

  if (/^3[47]/.test(cardNumber)) {
    return 'American Express';
  }

  if (/^(6011|65|64[4-9])/.test(cardNumber)) {
    return 'Discover';
  }

  return 'Card';
}

function passesLuhn(cardNumber) {
  let sum = 0;
  let shouldDouble = false;

  for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
    let digit = Number(cardNumber[index]);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function isValidExpiry(expiry) {
  if (typeof expiry !== 'string') {
    return false;
  }

  const match = expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2}|\d{4})$/);
  if (!match) {
    return false;
  }

  const month = Number(match[1]);
  let year = Number(match[2]);

  if (month < 1 || month > 12) {
    return false;
  }

  if (year < 100) {
    year += 2000;
  }

  const now = new Date();
  const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
  return expiryDate >= now;
}

function buildPaymentReference() {
  return `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function validatePaymentPayload(body) {
  const creatorId = Number(body.creatorId);
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim().toLowerCase() : '';
  const projectName = typeof body.projectName === 'string' ? body.projectName.trim() : '';
  const hours = Number(body.hours);
  const cardNumber = typeof body.cardNumber === 'string' ? body.cardNumber.replace(/\D/g, '') : '';
  const expiry = typeof body.expiry === 'string' ? body.expiry.trim() : '';
  const cvv = typeof body.cvv === 'string' ? body.cvv.trim() : '';

  if (!Number.isInteger(creatorId) || creatorId < 1) {
    return { error: 'Select a valid creator before paying.' };
  }

  if (customerName.length < 2) {
    return { error: 'Customer name must be at least 2 characters long.' };
  }

  if (!isValidEmail(customerEmail)) {
    return { error: 'Enter a valid email address.' };
  }

  if (projectName.length < 3) {
    return { error: 'Project name must be at least 3 characters long.' };
  }

  if (!Number.isInteger(hours) || hours < 1 || hours > 40) {
    return { error: 'Hours must be a whole number between 1 and 40.' };
  }

  if (cardNumber.length < 13 || cardNumber.length > 19 || !passesLuhn(cardNumber)) {
    return { error: 'Enter a valid card number.' };
  }

  if (!isValidExpiry(expiry)) {
    return { error: 'Enter a valid future expiry date in MM/YY format.' };
  }

  if (!/^\d{3,4}$/.test(cvv)) {
    return { error: 'Enter a valid CVV.' };
  }

  return {
    creatorId,
    customerName,
    customerEmail,
    projectName,
    hours,
    cardNumber,
    expiry,
    cvv,
    cardBrand: detectCardBrand(cardNumber),
    cardLast4: cardNumber.slice(-4)
  };
}

// Routes
// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Modular Routes
const helpers = { asyncRoute, validateAuthPayload, validateCreatorPayload, validatePaymentPayload, buildPaymentReference, getStatement, runStatement, allStatement, bcrypt, jwt, SECRET_KEY };
require('./routes/auth')(app, db, helpers);
require('./routes/creators')(app, db, helpers);
require('./routes/payments')(app, db, helpers);
require('./routes/chat')(app);

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
  next(err);
});
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
