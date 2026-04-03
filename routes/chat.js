module.exports = (app) => {
  app.post('/api/chat', (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message payload is missing.' });

    const lower = message.toLowerCase();
    let reply = "I'm currently reviewing your footage requests! Be right with you.";
    
    // Simulate smart AI replies for a creator marketplace
    if (lower.includes('price') || lower.includes('cost') || lower.includes('rate') || lower.includes('budget')) {
      reply = "My standard rate starts at the hourly price listed on my profile. Do you have a specific budget in mind for your project limit?";
    } else if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      reply = "Hi there! How can I help level up your video footage today?";
    } else if (lower.includes('time') || lower.includes('eta') || lower.includes('long')) {
      reply = "Most standard short-form edits take me about 24-48 hours. Let me know the specifics of your video length and scope!";
    } else if (lower.includes('portfolio') || lower.includes('examples') || lower.includes('work')) {
      reply = "You can view my full portfolio right on my dashboard profile. Let me know which edit style catches your eye!";
    } else if (lower.includes('software') || lower.includes('premiere') || lower.includes('after effects')) {
      reply = "I primarily use Adobe Premiere Pro and After Effects for VFX/Motion integrations. I can deliver the project files if requested.";
    }

    // Simulate thinking/typing delay to make it feel real
    setTimeout(() => {
      res.json({ reply });
    }, 1200);
  });
};
