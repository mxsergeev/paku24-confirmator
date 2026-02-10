This repository is a full-stack Node + React app for Paku24's "Confirmator" service. The goal of this file is to give an AI coding agent the minimal, high-value context needed to be productive immediately.

Key points (read these first)

- Backend: Node + Express app in `backend/` (entry: `backend/index.js`, app config: `backend/app.js`). MongoDB via Mongoose is initialized in `backend/app.js` using `backend/utils/config.js`.
- Frontend: React app in `src/` (Create React App). Production build served from `build/` by Express static middleware.
- Authentication: custom rotating refresh-token strategy implemented in `backend/modules/authentication/` (important files: `auth.middleware.js`, `auth.token.controller.js`, `auth.login.controller.js`). Refresh tokens are stored in `models/refreshToken.js`.
- External integrations: Google Calendar (`backend/modules/calendar/*`), AWS SES for email (`backend/modules/email/*`), SemySMS gateway for SMS (`backend/modules/sms/*`). Credentials live in `credentials/` and via environment variables defined in `.env` (see `.env.example`).

Developer workflow and commands

- Start production server: `yarn start` (runs `node backend/index.js`).
- Start dev (UI + server): `yarn dev` (runs `yarn dev:server` + `yarn dev:ui`). Use Dev Containers if present in your editor.
- Build frontend: `yarn build:ui` creates the `build/` folder that Express serves.
- Run tests: `yarn test` (Jest, Node environment). Tests expect `NODE_ENV=test` and a test DB (see `DEV_MONGODB_URI`).
- Authorize Google calendar OAuth: `yarn authorizeCalendarAccess` (runs `node backend/modules/calendar/authorize.js`).

Environment & config

- Use `.env` in project root. `.env.example` lists all required keys. Most important:
  - `DEV_MONGODB_URI` / `MONGODB_URI` (DB)
  - `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `AT_EXPIRES_IN`, `RT_EXPIRES_IN`, `RT_REFRESH_AFTER_SEC` (auth)
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SOURCE_EMAIL` (SES)
  - `SEMYSMS_DEVICE_ID` and `SEMYSMS_API_TOKEN` (SemySMS)

Project-specific conventions and patterns

- Token handling: Access token stored in cookie `at`, refresh token in cookie `rt`. The refresh-token rotation logic is implemented in `auth.middleware.js` (functions: `authenticateAccessToken`, `authenticateRefreshToken`, `generateRefreshToken`, `updateOrDeleteOldToken`, `setTokenCookies`). Any change to auth must preserve cookie names and rotation semantics.
- Error types: Custom errors are created with `utils/newErrorWithCustomName.js`; controllers forward errors to `backend/utils/errorHandler.middleware.js`.
- Router protection: Most API routes call `auth.middleware.authenticateAccessToken` (e.g., `modules/calendar`, `modules/email`, `modules/orderPool`). If adding endpoints that require auth follow the same pattern and return consistent HTTP codes.
- Frontend API: UI posts to `/api/...`. Example: calendar events are posted to `/api/calendar` with body { order, calendarEntries } and the server maps these to Google events using `calendar.helpers.js`.
- Order model: Check `backend/models/order.js` and `backend/models/rawOrder.js` for the canonical data shape when adding or transforming orders; `modules/orderPool/orderPool.controller.js` implements upload/processing logic.

Integration notes & gotchas

- Google Calendar: OAuth credentials and tokens are stored under `credentials/`. Use `yarn authorizeCalendarAccess` in the environment you run the server from to generate a token. Chromium works better than Firefox for the auth flow.
- SES: Ensure `SOURCE_EMAIL` is verified in AWS SES or emails will fail. Errors bubble up to the standard error handler.
- SMS: SemySMS requires a device id and a running gateway app. If SMS sending fails, check `modules/sms/sms.controller.js` and `modules/sms` helpers.
- ngrok: There's an `ngrok` script in package.json (named `ngrok`) that expects a local binary under `../../ngrok` in the repo layout used by the author — prefer installing `ngrok` globally or adjusting the script if needed.

Files to inspect first when modifying behavior

- `backend/app.js` - middleware, routing, static serving
- `backend/modules/authentication/auth.middleware.js` - auth flow and token rotation
- `backend/modules/calendar/calendar.googleAPI.js` and `calendar.helpers.js` - calendar integration and event shaping
- `backend/modules/email/email.awsAPI.js` and `email.helpers.js` - email body generation
- `backend/models/*` - data schemas (User, RefreshToken, Order)
- `src/services/*` and `src/components/*` - how the UI calls the API and data shapes expected by backend endpoints

Testing & linting notes

- Tests are run with `NODE_ENV=test jest --runInBand` (`yarn test`). Tests use a test MongoDB defined by `DEV_MONGODB_URI` — ensure the DB is available when running tests.

If you need to change global behavior

- Prefer small, isolated edits and add unit tests under `tests/` for any backend logic changes. The test suite runs synchronously (`--runInBand`) to avoid DB connection issues.

When in doubt

- Inspect `auth.middleware.js` for authentication flow and rotation rules, and `backend/app.js` for how routes are mounted. Follow cookie names and route paths exactly.

Ask me (the human) if any secrets, environment values, or external accounts are unclear — do not attempt to guess secret values.

If you'd like, I can expand this into a longer `AGENT.md` with interactive examples and common edit patterns.
