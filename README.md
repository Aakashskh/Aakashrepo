# Cverso — From Campus to Career

A campus talent marketplace connecting video creators with professional editors. Built with a premium red & white design system.

## Features

- **Landing Page** — Dark hero section, services nav, popular services grid, features CTA
- **Explore Page** — Interactive D3.js force-directed university network visualization
- **Authentication** — Full-page sign in / sign up with role selection (Buyer / Creator)
- **Buyer Dashboard** — Fiverr-style nav, creator marketplace, request posting, orders, profile, settings
- **Creator Dashboard** — Sidebar layout with overview stats, gig management, portfolio, earnings, profile upload
- **Chat Widget** — Real-time styled chat with AI-simulated replies
- **Dark Mode** — Full dark theme toggle across all pages
- **Payments** — Mock payment flow with card validation (Luhn check)

## Tech Stack

- **Frontend:** HTML, CSS (vanilla), JavaScript (ES6+)
- **Backend:** Node.js, Express
- **Database:** SQLite (`clipit.db`)
- **Auth:** JWT + bcrypt
- **Visualization:** D3.js (explore page)

## Project Structure

```
clipit/
├── index.html          # Main app (landing + auth + dashboards)
├── explore.html        # Interactive university network explorer
├── server.js           # Express server + DB init
├── cleanup.js          # Safe legacy file cleanup utility
├── package.json        # Dependencies
├── css/
│   ├── main.css        # Complete design system for index.html
│   └── explore.css     # Explore page styles
├── js/
│   ├── main.js         # App logic (auth, nav, creators, chat)
│   └── explore.js      # D3 force graph + university visualization
├── routes/
│   ├── auth.js         # /api/signup, /api/login
│   ├── creators.js     # /api/creators, /api/creators/profile, /api/creators/portfolio
│   ├── payments.js     # /api/payments
│   └── chat.js         # /api/chat (AI-simulated)
└── public/
    ├── cverso-logo-red.svg
    └── cverso-logo.svg
```

## Installation

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

## API Endpoints

| Method | Endpoint                  | Description                |
|--------|---------------------------|----------------------------|
| POST   | `/api/signup`             | Register a new user        |
| POST   | `/api/login`              | Login and receive JWT      |
| GET    | `/api/creators`           | List creators (filterable) |
| POST   | `/api/creators/profile`   | Update creator profile     |
| POST   | `/api/creators/portfolio` | Update portfolio items     |
| GET    | `/api/payments`           | List payment history       |
| POST   | `/api/payments`           | Process a payment          |
| POST   | `/api/chat`               | Send chat message          |

## License

© 2026 Cverso. All rights reserved.
