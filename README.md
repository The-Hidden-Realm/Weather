# Wisp Weather

A dark-themed weather dashboard with a custom **WISH score** (Weather Intensity
Score for Here) — a 0-100 read on how "in your face" the weather is right now,
blending wind, precipitation, temperature extremity, visibility, storm
activity, and active NWS alerts.

Data comes from [Open-Meteo](https://open-meteo.com/) (current conditions,
12-hour and 7-day forecasts — no API key required) and the
[National Weather Service](https://www.weather.gov/documentation/services-web-api)
(active alerts, US locations only).

## Features

- Email/password accounts (case-sensitive usernames). An `Admin` account is
  seeded automatically on first boot; anyone else can self-serve sign up.
  Signing in with the default admin password forces a password change
  before the dashboard is reachable.
- Each user saves their own location(s) — search by city, or use the
  browser's geolocation. Weather is pulled for whichever location is selected.
- Homepage: WISH score gauge, current conditions (feels like, wind,
  humidity, visibility, pressure, precipitation, cloud cover, sunrise/sunset),
  a 12-hour forecast strip, and a 7-day forecast — all with weather icons.
- Active NWS alerts (e.g. Heat Advisory, Winter Storm Warning) surface as a
  banner when present.
- `/admin` — visible only to the admin role — lists all accounts on the
  instance.
- The "Logged in as" menu in the top nav links to `/settings`, where anyone
  can change their own username and password, and switch between dark and
  light theme (a per-account preference, dark by default).

## Running with Docker (recommended)

1. Copy the example env file and secret, then fill in real values:

   ```bash
   cp .env.example .env
   cp secrets/admin_password.txt.example secrets/admin_password.txt
   ```

   - `SESSION_SECRET` in `.env` signs login sessions — generate one with
     `openssl rand -base64 32`.
   - `secrets/admin_password.txt` is the initial password for the `Admin`
     account, mounted into the container as a Docker secret (never baked
     into the image). You can leave it as the placeholder (`ChangeMe123!`)
     — the app will force a password change on first login — or set your
     own value up front, in which case no forced change happens.

2. Build and start:

   ```bash
   docker compose up --build
   ```

3. Open [http://localhost:3000](http://localhost:3000) and sign in as
   `Admin` with the password you set.

Weather data lives in SQLite inside a named Docker volume
(`weather-data`), so accounts and saved locations persist across restarts
and rebuilds.

## Local development (without Docker)

```bash
npm install
cp .env.example .env   # set SESSION_SECRET
npm run dev
```

Without `ADMIN_PASSWORD` (or `ADMIN_PASSWORD_FILE`) set, the seeded admin
password defaults to `ChangeMe123!` — fine for local dev, not for anything
exposed beyond your machine.

## Environment variables

| Variable              | Purpose                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| `SESSION_SECRET`       | Signs session cookies. Required.                                     |
| `ADMIN_USERNAME`       | Seeded admin's username. Defaults to `Admin`.                        |
| `ADMIN_PASSWORD`       | Seeded admin's password (or use `ADMIN_PASSWORD_FILE` for a secret). |
| `CONTACT_EMAIL`        | Optional — identifies this app to api.weather.gov per NWS etiquette. |
| `DATA_DIR`             | Where the SQLite file lives. Defaults to `./data`.                   |

Any `<VAR>_FILE` variable (e.g. `ADMIN_PASSWORD_FILE`) reads the value from
a file instead — the pattern Docker/Compose secrets use.

## Tech

Next.js (App Router) + TypeScript + Tailwind, SQLite via `better-sqlite3`,
JWT session cookies via `jose`, bcrypt password hashing.
