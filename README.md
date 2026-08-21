# The Hidden Realm Weather

A dark-themed weather dashboard with a custom **WIS score** (Weather Intensity
Score) — a 0-100 read on how "in your face" the weather is right now,
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
- Each user has one saved location — search by city/state, or use the
  browser's geolocation; picking a new one replaces the old. The location
  title shows city, state, and zip (reverse-geocoded via BigDataCloud's free
  API, since neither Open-Meteo nor NWS return postal codes).
- Homepage: current conditions + WIS score on the left, a 12-hour forecast
  alongside them on the right, and a 7-day forecast underneath — all with
  weather icons, using the full width on wider screens.
- Active NWS alerts (e.g. Heat Advisory, Winter Storm Warning) live behind
  the bell icon in the top nav, polled every 5 minutes; a new alert shows an
  unread dot and plays a short chime (browser autoplay rules may require one
  prior click on the page before sound is allowed to play).
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
