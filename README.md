# Kloudspot Crowd Management

Responsive React dashboard for authenticated crowd analytics and live Socket.IO updates.

## Requirements

- Node.js 20+
- npm
- Valid Kloudspot user credentials

## Setup

```bash
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`, sign in, and select a site. The app stores the returned JWT in browser storage and sends it as `Authorization: Bearer <token>` for protected API requests. Do not place credentials or JWTs in environment files.

## Environment

```env
VITE_API_BASE_URL=https://hiring-dev.internal.kloudspot.com
VITE_SOCKET_OCCUPANCY_EVENT=live_occupancy
VITE_SOCKET_ALERT_EVENT=alert
VITE_SOCKET_SIM_EVENT=sim:event
```

`VITE_SOCKET_URL` is optional and defaults to `VITE_API_BASE_URL`.

## Commands

```bash
npm run dev      # development server
npm run build    # type-check and production build
npm run preview  # preview production build
```

## Features

- JWT login, protected routes, logout, and automatic handling of unauthorized responses
- Site selection and UTC epoch-millisecond date filters
- Historical footfall, dwell, occupancy, demographics, and paginated crowd entries
- Live site occupancy and deduplicated alerts over authenticated Socket.IO
- Responsive navigation, cards, charts, tables, and loading/error/empty/disconnected states

All displayed analytics come from the Kloudspot APIs or Socket.IO events; the project contains no mock analytics data.
