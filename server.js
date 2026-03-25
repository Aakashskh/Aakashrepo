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
app.use(bodyParser.json());
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
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS creators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    bio TEXT DEFAULT '',
    rating INTEGER DEFAULT 0,
    price INTEGER DEFAULT 0,
    avatar TEXT DEFAULT ''
  )`);

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

  const creatorColumns = [
    "ALTER TABLE creators ADD COLUMN bio TEXT DEFAULT ''",
    "ALTER TABLE creators ADD COLUMN rating INTEGER DEFAULT 0",
    "ALTER TABLE creators ADD COLUMN price INTEGER DEFAULT 0",
    "ALTER TABLE creators ADD COLUMN avatar TEXT DEFAULT ''"
  ];

  creatorColumns.forEach((statement) => {
    db.run(statement, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error updating creators schema:', err.message);
      }
    });
  });

  // Insert sample creators
  db.get("SELECT COUNT(*) as count FROM creators", (err, row) => {
    if (err) {
      console.error('Error checking creators count:', err);
      return;
    }
    if (!row || row.count === 0) {
      const sampleCreators = [
        { name: 'Alex Johnson', specialty: 'Action Editing', bio: 'Specializing in high-energy action sequences.', rating: 5, price: 75, avatar: 'https://i.pravatar.cc/160?img=12' },
        { name: 'Sarah Lee', specialty: 'Documentary Editing', bio: 'Creating compelling narratives for documentaries.', rating: 4, price: 60, avatar: 'https://i.pravatar.cc/160?img=32' },
        { name: 'Mike Chen', specialty: 'Music Video Editing', bio: 'Bringing music videos to life with creative cuts.', rating: 5, price: 80, avatar: 'https://i.pravatar.cc/160?img=15' },
        { name: 'Emma Davis', specialty: 'Wedding Editing', bio: 'Capturing the magic of your special day.', rating: 4, price: 55, avatar: 'https://i.pravatar.cc/160?img=47' },
        { name: 'Tom Wilson', specialty: 'Commercial Editing', bio: 'Crafting engaging commercials that sell.', rating: 5, price: 70, avatar: 'https://i.pravatar.cc/160?img=58' }
      ];

      const stmt = db.prepare("INSERT INTO creators (name, specialty, bio, rating, price, avatar) VALUES (?, ?, ?, ?, ?, ?)");
      sampleCreators.forEach(creator => {
        stmt.run(creator.name, creator.specialty, creator.bio, creator.rating, creator.price, creator.avatar);
      });
      stmt.finalize();
    }
  });
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

// User registration
app.post(['/register', '/api/signup'], asyncRoute(async (req, res) => {
  const payload = validateAuthPayload(req.body, true);
  if (payload.error) {
    return res.status(400).json({ error: payload.error });
  }

  const { name, email, password } = payload;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await runStatement(
      `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`,
      [name, email, hashedPassword]
    );
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    console.error('Signup error:', error.message);
    res.status(500).json({ error: 'Failed to register user.' });
  }
}));

// User login
app.post(['/login', '/api/login'], asyncRoute(async (req, res) => {
  const payload = validateAuthPayload(req.body);
  if (payload.error) {
    return res.status(400).json({ error: payload.error });
  }

  const { email, password } = payload;
  const user = await getStatement(`SELECT * FROM users WHERE email = ?`, [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
  res.json({ token });
}));

// API endpoint example
app.get('/api/creators', (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const sql = search
    ? `SELECT * FROM creators WHERE lower(name) LIKE ? OR lower(specialty) LIKE ? ORDER BY rating DESC, price ASC`
    : `SELECT * FROM creators ORDER BY rating DESC, price ASC`;
  const params = search
    ? [`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`]
    : [];

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch creators.' });
    }
    res.json(rows);
  });
});

app.get('/api/payments', async (req, res) => {
  try {
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 25);
    const sql = email
      ? `SELECT id, creator_id, creator_name, customer_name, customer_email, project_name, hours, amount_cents, currency, card_brand, card_last4, payment_reference, status, created_at
         FROM payments
         WHERE customer_email = ?
         ORDER BY datetime(created_at) DESC
         LIMIT ?`
      : `SELECT id, creator_id, creator_name, customer_name, customer_email, project_name, hours, amount_cents, currency, card_brand, card_last4, payment_reference, status, created_at
         FROM payments
         ORDER BY datetime(created_at) DESC
         LIMIT ?`;

    const rows = await allStatement(sql, email ? [email, limit] : [limit]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching payments:', error.message);
    res.status(500).json({ error: 'Failed to fetch payments.' });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const payment = validatePaymentPayload(req.body);
    if (payment.error) {
      return res.status(400).json({ error: payment.error });
    }

    const creator = await getStatement(`SELECT id, name, specialty, price FROM creators WHERE id = ?`, [payment.creatorId]);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found.' });
    }

    const amountCents = Number(creator.price) * payment.hours * 100;
    const paymentReference = buildPaymentReference();

    const result = await runStatement(
      `INSERT INTO payments (
        creator_id,
        creator_name,
        customer_name,
        customer_email,
        project_name,
        hours,
        amount_cents,
        currency,
        card_brand,
        card_last4,
        payment_reference,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, 'paid')`,
      [
        creator.id,
        creator.name,
        payment.customerName,
        payment.customerEmail,
        payment.projectName,
        payment.hours,
        amountCents,
        payment.cardBrand,
        payment.cardLast4,
        paymentReference
      ]
    );

    res.status(201).json({
      message: 'Payment processed successfully.',
      payment: {
        id: result.id,
        creatorId: creator.id,
        creatorName: creator.name,
        specialty: creator.specialty,
        customerName: payment.customerName,
        customerEmail: payment.customerEmail,
        projectName: payment.projectName,
        hours: payment.hours,
        amountCents,
        currency: 'USD',
        cardBrand: payment.cardBrand,
        cardLast4: payment.cardLast4,
        paymentReference,
        status: 'paid'
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error.message);
    res.status(500).json({ error: 'Unable to process payment right now.' });
  }
});

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
