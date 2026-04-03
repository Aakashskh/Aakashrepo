module.exports = (app, db, helpers) => {
  const { allStatement, getStatement, runStatement, validatePaymentPayload, buildPaymentReference } = helpers;

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
};
