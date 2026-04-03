module.exports = (app, db, helpers) => {
  const { asyncRoute, runStatement, getStatement, allStatement } = helpers;

  // GET /api/creators - list all real registered creators
  app.get('/api/creators', (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const university = typeof req.query.university === 'string' ? req.query.university.trim() : '';

    let sql = `SELECT c.*, u.joined_at as user_joined_at
               FROM creators c
               LEFT JOIN users u ON c.user_id = u.id
               WHERE 1=1`;
    const params = [];

    if (search) {
      sql += ' AND (lower(c.name) LIKE ? OR lower(c.specialty) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    if (university) {
      sql += ' AND lower(c.university) = lower(?)';
      params.push(university);
    }

    sql += ' ORDER BY c.id DESC'; // newest creators first

    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Creators fetch error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch creators.' });
      }
      res.json(rows);
    });
  });

  // POST /api/creators/profile - creator updates their profile (specialty, bio, price, avatar)
  app.post('/api/creators/profile', asyncRoute(async (req, res) => {
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ error: 'userId required.' });

    const specialty = typeof req.body.specialty === 'string' ? req.body.specialty.trim() : '';
    const bio       = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';
    const price     = Number(req.body.price) || 0;
    const avatar    = typeof req.body.avatar === 'string' ? req.body.avatar.trim() : '';
    const university = typeof req.body.university === 'string' ? req.body.university.trim() : '';
    const name      = typeof req.body.name === 'string' ? req.body.name.trim() : '';

    // Upsert the creator profile
    await runStatement(
      `UPDATE creators SET specialty=?, bio=?, price=?, avatar=?, university=?, name=?
       WHERE user_id=?`,
      [specialty || 'Video Editor', bio, price, avatar, university, name, userId]
    );

    const updated = await getStatement(`SELECT * FROM creators WHERE user_id=?`, [userId]);
    res.json({ message: 'Profile updated.', creator: updated });
  }));

  // POST /api/creators/portfolio - creator updates their portfolio JSON array
  app.post('/api/creators/portfolio', asyncRoute(async (req, res) => {
    const userId = Number(req.body.userId);
    if (!userId) return res.status(400).json({ error: 'userId required.' });
    
    let portfolio = '[]';
    if (Array.isArray(req.body.portfolio)) {
      portfolio = JSON.stringify(req.body.portfolio);
    } else if (typeof req.body.portfolio === 'string') {
      portfolio = req.body.portfolio;
    }

    await runStatement(`UPDATE creators SET portfolio=? WHERE user_id=?`, [portfolio, userId]);
    const updated = await getStatement(`SELECT * FROM creators WHERE user_id=?`, [userId]);
    res.json({ message: 'Portfolio updated.', creator: updated });
  }));
};
