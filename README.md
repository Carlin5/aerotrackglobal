# AeroTrack Pro

A complete, realistic cargo flight tracking platform with a private operator
control center and a public realtime tracking page (3D globe + 2D tactical
map). Built with Next.js 14, TypeScript, Tailwind, SQLite, JWT auth, Leaflet
and react-globe.gl.

## Features

- **Public tracking page** at `/track/<TRACKING_ID>` with:
  - 3D animated globe (`react-globe.gl` / three.js) showing the full route, arcs
    and an aircraft that follows the great-circle path in real time.
  - 2D tactical world map (`react-leaflet` over CARTO dark tiles) with rotated
    plane marker, altitude/speed tooltip and antimeridian-aware route.
  - Live telemetry HUD: ground speed, altitude, bearing, ETA and progress.
  - Full cargo manifest, shipper/consignee, status timeline, operator notes.
  - View-toggle between 3D / 2D + Web Share / Copy link.
- **Operator control center** at `/admin` (JWT auth):
  - Compose flights with origin, multiple **midway waypoints** (with ground
    time), destination, aircraft, cruise speed, departure timestamp, status.
  - Generate a unique tracking ID per shipment (e.g. `AT-7K9L2M-A1`).
  - Toggle **Live broadcast** on/off per flight.
  - Edit/delete any flight, jump to its public page.
  - Mission board summary stats (active, total distance, total cargo).
- **Realistic simulation engine** (`src/lib/simulation.ts`):
  - Great-circle distance & spherical interpolation
    (`src/lib/geo.ts`).
  - Per-leg duration = cruise time + 35 min overhead (taxi / climb / descent).
  - Ground hold time per waypoint is honoured in the global timeline.
  - Phase-aware altitude & ground-speed curves (climb / cruise / descent).
  - Bearing recomputed from current position toward target.
  - Position recomputed every second on the client from the same equations
    the server uses, so 3D and 2D views stay in lock-step.

## Quick start

```powershell
# 1. From the project root
cp .env.local.example .env.local
# Then edit .env.local and set:
#   ADMIN_USERNAME=<you>
#   ADMIN_PASSWORD=<a strong password>
#   AUTH_SECRET=<random string, 32+ chars>

# 2. Install + run
npm install
npm run dev
```

Then open <http://localhost:3000>. Sign in to the operator console at
<http://localhost:3000/login>.

> The admin user is auto-seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on
> first boot. To change the password later, delete the row from `users` in
> `data/aerotrack.sqlite` and reboot.

## Project layout

```
src/
  app/
    page.tsx                       Public landing + track input
    track/[trackingId]/page.tsx    Public tracking view
    login/                         Operator login
    admin/                         Mission board, compose/edit flights
    api/
      auth/{login,logout}/         Session handlers
      flights/                     CRUD + live toggle (auth required)
      track/[trackingId]/          Public read-only tracking endpoint
  components/
    ui/                            Button, Input, Panel, Badge, …
    shared/                        TopNav, Footer, Logo
    tracking/                      Public-side tracking widgets
    map/FlightMap.tsx              2D Leaflet view
    globe/GlobeView.tsx            3D globe view
  lib/
    db.ts                          SQLite + admin seed
    auth.ts                        JWT session via httpOnly cookie
    flights.ts                     Repository + zod schema
    airports.ts                    Curated IATA hub database
    geo.ts                         Haversine, great-circle math
    simulation.ts                  Route plan, live position, events
    tracking-id.ts                 Tracking ID generator
  middleware.ts                    Protects /admin + /api/flights
```

## Operator workflow

1. **Sign in** at `/login` with your `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
2. **Compose flight** (`Compose flight` button on the mission board).
   - Choose origin, optional waypoints (with ground time), destination.
   - Pick aircraft, cruise speed, UTC departure timestamp.
   - Fill the cargo manifest, shipper & consignee, optional notes.
3. **Save** — a unique tracking ID is generated.
4. **Share** the tracking ID with your client. They can enter it at the public
   homepage or load `/track/<TRACKING_ID>` directly.
5. **Go live** from the mission board when the shipment actually departs. The
   public page will start moving the aircraft along the route in realtime.

## Data model (SQLite)

`flights` table (single-table design, JSON columns for nested objects):

| column            | type   | notes                                  |
|-------------------|--------|----------------------------------------|
| `id`              | int PK | auto-increment                         |
| `tracking_id`     | text   | unique (`AT-XXXXXX-YY`)                |
| `flight_number`   | text   |                                        |
| `aircraft`        | text   | e.g. "Boeing 747-8F"                   |
| `origin_code`     | text   | IATA                                   |
| `destination_code`| text   | IATA                                   |
| `waypoints_json`  | text   | `[{code,stopMinutes}]`                 |
| `cruise_kmh`      | int    | 400..1200                              |
| `departure_at`    | text   | ISO 8601                                |
| `status`          | text   | enum: scheduled..delivered             |
| `is_live`         | int    | 0/1                                    |
| `cargo_json`      | text   | full Cargo object                       |
| `shipper_json`    | text   | Party                                  |
| `consignee_json`  | text   | Party                                  |
| `notes`           | text   | optional                                |
| `created_at`      | text   |                                        |
| `updated_at`      | text   |                                        |

## Tech & dependencies

- **Framework**: Next.js 14 App Router (React 18, TypeScript strict).
- **Styling**: Tailwind v3 + custom HUD theme (Fira Code / Fira Sans).
- **DB**: `better-sqlite3` (file at `data/aerotrack.sqlite`, WAL).
- **Auth**: `jose` JWT in httpOnly cookie, `bcryptjs` password hashing.
- **Validation**: `zod`.
- **2D map**: `react-leaflet`, dark CARTO basemap.
- **3D globe**: `react-globe.gl` (wraps `three-globe` / Three.js).
- **Animations**: `framer-motion`, custom Tailwind keyframes.
- **Icons**: `lucide-react` (SVG only — no emojis).

## Security notes

- All `/admin/*` pages and `/api/flights/*` routes are gated by middleware
  that verifies the JWT cookie.
- Passwords are bcrypt-hashed (cost 10) and never logged.
- The public `/api/track/:id` endpoint redacts non-essential operator data
  (shipper/consignee emails, phones, addresses are not returned to clients).
- `AUTH_SECRET` must be at least 32 chars; the app refuses to issue or verify
  sessions otherwise.

## Production

```powershell
npm run build
npm run start
```

Put it behind a reverse proxy that terminates HTTPS. The session cookie is
automatically marked `Secure` in production.

## Accessibility & UX

- WCAG AA contrast on the dark theme.
- Visible focus rings on every interactive element.
- `prefers-reduced-motion` collapses every animation to ~0ms.
- All clickable elements expose `cursor: pointer`.
- Times are presented in UTC to avoid client/server hydration mismatch.

## License

MIT.
