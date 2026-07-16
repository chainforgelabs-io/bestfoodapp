# Best Food App

City-scoped food discovery with dual expert and community rankings for restaurants and dishes.

**Live:** [https://bestfoodapp.com](https://bestfoodapp.com) — public portfolio demo (not a consumer SaaS product).

## Overview

Finding reliable local food recommendations is noisy: star averages blur dishes into venue scores, and platform incentives reward volume over taste. Best Food App ranks **specific food items** and restaurants within a city, combining moderated admin scores with community ratings so visitors can compare what to order—not only where to go.

What shipped is a full-stack web app: city search (Google Places), SEO city routes, leaderboards, restaurant and dish profiles, JWT auth, review submission (including receipt-assisted flows), map views, and an admin social-card pipeline that composes and publishes review creatives.

Intentionally out of scope for this demo: multi-tenant white-labeling, payment/commerce, native mobile apps, and operating a large moderated critic network. Infra credentials (MongoDB, AWS, Meta/X, Maps) are required for a complete local run.

## Stack

- **Frontend:** React 18, Create React App, React Router, Axios, react-helmet-async, Lucide React
- **Maps:** Google Maps JavaScript API / Places (`@react-google-maps/api`, `use-places-autocomplete`)
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB
- **Auth:** JWT (`jsonwebtoken`, `bcryptjs`)
- **Media / OCR:** AWS S3, AWS Textract (receipts)
- **Email:** Nodemailer (password reset)
- **Social cards:** Sharp, opentype.js; Meta (Instagram/Facebook) and X publishers
- **Deploy:** Vercel (static frontend + serverless `api/`), Vercel Analytics

## Features

- Search and browse by city with Places autocomplete and SEO-friendly city URLs
- Dual scoring: admin (expert) and community scores on food items and restaurants
- Global and city leaderboards with category filters
- Restaurant pages with food items, reviews, and profile detail
- Authenticated review submission, including receipt scan / OCR-assisted autofill when AWS is configured
- Map ratings view for geographic browsing
- Scoring criteria page documenting how ratings work
- Admin social upload: generate branded review cards and publish to Instagram / Facebook / X

## Architecture

Monorepo (`npm` workspaces): CRA frontend, Express backend, and a Vercel serverless entry that mounts the same Express app.

- **Local / long-running:** `backend/index.js` serves `/api/*` against MongoDB.
- **Production (Vercel):** `api/index.js` is the serverless handler; static assets come from `frontend/build`. Cron at `api/cron/refresh-meta-token.js` refreshes long-lived Meta tokens.
- **Domain models:** restaurants, food items, reviews, users, addresses, receipts, social settings (`backend/models/`).
- **Social pipeline:** `backend/lib/social/` — layout, card render/upload, captions, platform publishers.

## Getting started

Requires Node.js and npm. MongoDB (and optional AWS / Google Maps / email credentials) must be available for a useful run.

```bash
# From repo root
npm install

# Backend env (required for API)
cp backend/.env.example backend/.env
# Edit backend/.env — at minimum MONGODB_URI and JWT_SECRET

# Frontend env (required for Maps + local API base URL)
cp frontend/.env.example frontend/.env
# Edit frontend/.env — set REACT_APP_GOOGLE_MAPS_API_KEY and REACT_APP_API_BASE_URL

# Dev: API + CRA concurrently
npm run dev
```

- Frontend defaults to CRA’s port (`http://localhost:3000`).
- Backend defaults to `http://localhost:5000` (see `PORT` in backend env).

```bash
# Production frontend build (also what Vercel runs via root `npm run build`)
npm run build
```

Without MongoDB and Maps keys, the UI may load but search, rankings, and auth will not work end-to-end. Social publishing and receipt OCR need the optional AWS / Meta / X variables documented below.

## Environment

See:

- [`backend/.env.example`](backend/.env.example)
- [`frontend/.env.example`](frontend/.env.example)

**Backend (required for core API):** `MONGODB_URI`, `JWT_SECRET`

**Backend (common):** `PORT`, `NODE_ENV`, `FRONTEND_URL`, `EMAIL_USER`, `EMAIL_PASS`

**Backend (uploads / OCR):** `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_RECEIPTS_BUCKET`, `CDN_BASE_URL`

**Backend (social / cron):** `META_LONG_LIVED_TOKEN`, `META_APP_ID`, `META_APP_SECRET`, `IG_BUSINESS_ACCOUNT_ID`, `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`, `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `CRON_SECRET`

**Frontend:** `REACT_APP_API_BASE_URL`, `REACT_APP_GOOGLE_MAPS_API_KEY`

Never commit real `.env` files. Use placeholders only in examples.

## Project structure

```
├── api/                 # Vercel serverless entry + cron
├── backend/
│   ├── assets/social/   # Card badge / font / border assets
│   ├── lib/social/      # Card render, upload, publishers
│   ├── middleware/      # Auth
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express /api routers
│   └── utils/           # Email, helpers
├── docs/                # Setup notes (social assets, etc.)
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── api/         # Axios client
│       └── styles/
└── vercel.json
```

## Built by

Built by [Chain Forge Labs](https://chainforgelabs.io).

## License

MIT — see [LICENSE](LICENSE).

## Known limitations

- Full local parity with production needs private infra (MongoDB Atlas, AWS, Google Maps, Meta/X).
- Frontend CRA build may emit existing ESLint warnings (unused vars, a11y hints); they predate this docs pass.
- A Google Maps API key was previously committed in `frontend/.env` and as a fallback string in source; **rotate that key** (it remains in git history). See audit notes when preparing the public mirror.
