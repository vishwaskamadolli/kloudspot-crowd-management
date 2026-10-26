# Kloudspot Crowd Management

A responsive crowd-operations dashboard built for the Kloudspot frontend assessment. It combines authenticated historical analytics with real-time Socket.IO updates for site occupancy and alerts.

**Live application:** https://kloudspot-crowd-management.netlify.app/

## Features

- JWT authentication, protected routes, logout, and automatic `401` handling
- Site and timezone-aware date filtering
- Footfall, dwell-time, occupancy, and gender analytics
- Live site occupancy and deduplicated alerts through authenticated Socket.IO
- Paginated entry/exit records with current-page search
- Responsive navigation, charts, tables, skeletons, and error/empty/disconnected states
- Real backend data only; no mock analytics

## Tech stack

React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Socket.IO Client, date-fns, and Lucide React.

## Installation

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/vishwaskamadolli/kloudspot-crowd-management.git
cd kloudspot-crowd-management
npm ci
```

Copy `.env.example` to `.env`, then configure:

```env
VITE_API_BASE_URL=https://hiring-dev.internal.kloudspot.com
VITE_SOCKET_OCCUPANCY_EVENT=live_occupancy
VITE_SOCKET_ALERT_EVENT=alert
VITE_SOCKET_SIM_EVENT=sim:event
```

`VITE_SOCKET_URL` is optional and defaults to `VITE_API_BASE_URL`. Never store credentials or JWTs in environment files.

## Run locally

```bash
npm run dev
```

Open `http://localhost:5173` and sign in with valid Kloudspot credentials.

## Production build

```bash
npm run build
npm run preview
```

Netlify uses `npm run build`, publishes `dist`, and applies the SPA fallback configured in `netlify.toml`.

## API integration

The app uses `https://hiring-dev.internal.kloudspot.com` by default:

- `POST /api/auth/login` — returns the JWT used as `Authorization: Bearer <token>`
- `GET /api/sites` — populates site filters and timezone metadata
- `POST /api/analytics/footfall`, `/dwell`, `/occupancy`, `/demographics` — historical dashboard analytics
- `POST /api/analytics/entry-exit` — server-paginated crowd records
- Socket.IO `live_occupancy` and `alert` events — live KPI and alert updates filtered by site

Analytics requests send `{ siteId, fromUtc, toUtc }`, with UTC epoch milliseconds derived from the selected site's timezone.
