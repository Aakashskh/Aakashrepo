module.exports = (app, db, helpers) => {
  const { asyncRoute, validateAuthPayload, getStatement, runStatement, bcrypt, jwt, SECRET_KEY } = helpers;

  // User registration
  app.post(['/register', '/api/signup'], asyncRoute(async (req, res) => {
    const payload = validateAuthPayload(req.body, true);
    if (payload.error) {
      return res.status(400).json({ error: payload.error });
    }

    const { name, email, password } = payload;
    const role = req.body.role === 'creator' ? 'creator' : 'user';
    const university = typeof req.body.university === 'string' ? req.body.university.trim() : '';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const result = await runStatement(
        `INSERT INTO users (name, email, password, role, university) VALUES (?, ?, ?, ?, ?)`,
        [name, email, hashedPassword, role, university]
      );

      // If signing up as a creator, auto-create their creator profile
      if (role === 'creator') {
        await runStatement(
          `INSERT OR IGNORE INTO creators (user_id, name, email, specialty, bio, rating, price, avatar, university)
           VALUES (?, ?, ?, ?, ?, 0, 0, '', ?)`,
          [result.id, name, email, 'Video Editor', '', university]
        );
      }

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
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        university: user.university || ''
      }
    });
  }));
};
