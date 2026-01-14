# PhishNet

Full-stack phishing protection site with an Express/MongoDB backend (in `Backend/`) and static frontend pages in the repo root. The backend serves the frontend and exposes REST APIs under `/api`.

## Requirements
- Node.js 14+ and npm 6+
- MongoDB Atlas cluster (or local MongoDB)
- Git (optional, for development)

## Quick Start (development)
1) Install backend dependencies:
   ```bash
   cd Backend
   npm install
   ```
2) Configure environment:
   - Copy the sample env file: `copy ..\.env.example .env` (Windows) or `cp ../.env.example .env` (macOS/Linux).
   - Set values for `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`, and `PORT`.
3) Run the backend (serves the frontend too):
   ```bash
   npm run dev
   ```
4) Open http://localhost:3000 to load the frontend. API base URL: http://localhost:3000/api.

> Alternatively, from the repo root you can use the helper scripts: `./run-server.sh` (bash) or `./run-server.bat` (PowerShell/cmd), which just start `Backend/npm start`.

## Project Structure
- Backend/: Express server, routes, models, middleware, utilities, env file
- *.html, app.js, chart-init.js, styles.css: frontend pages/assets served by the backend
- Documentation: API_REFERENCE.md, BACKEND_SETUP.md, QUICKSTART.md, SCHEMA_DOCUMENTATION.md, INTEGRATION_SUMMARY.md, PROJECT_STRUCTURE.md

## Key Scripts
- `npm run dev` (in Backend/): start with nodemon for development
- `npm start` (in Backend/): production mode

## Environment Variables (Backend/.env)
- `MONGODB_URI` Mongo connection string (Atlas or local)
- `JWT_SECRET` long random string for signing tokens
- `PORT` default 3000
- `NODE_ENV` development | production
- `CORS_ORIGIN` comma-separated allowed origins (e.g., http://localhost:3000)
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS` rate limiting controls

## Useful Endpoints
- `GET /api/health` health check
- Auth: `POST /api/auth/register`, `POST /api/auth/login`
- URL scan: `POST /api/scan/url`
- Users (auth): `GET /api/users/profile`, `GET /api/users/history`
- Analytics (auth): `GET /api/analytics/dashboard`

More details: see BACKEND_SETUP.md for full setup, QUICKSTART.md for a 5-minute guide, and API_REFERENCE.md for endpoints.
