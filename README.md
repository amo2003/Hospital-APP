# CarePlus Hospital — patient OPD app

Patient registration, login, appointment booking, and profile management. The app uses Expo Router / React Native; the API uses Express, TypeScript, and MongoDB Atlas. No staff login implementation is included.

## Run the project

Use Node 22.13 or newer. Run the commands in two terminals.

```powershell
cd Backend
npm install
# Edit .env using .env.example as a guide. Keep your existing credentials.
npm run db:check
npm run dev
```

```powershell
cd mobile/mobile
npm install
# Set EXPO_PUBLIC_API_URL in .env, then restart Expo after any environment change.
npx expo start --clear
```

For a phone on the same Wi-Fi, the API URL must be your computer's LAN address, for example `http://10.58.252.10:4000/api`. `localhost` on a phone refers to the phone. Allow the backend through the Windows firewall for your private network. For a deployed backend, use `https://your-api-host/api`. MongoDB stays online in Atlas in either case. The API URL must include `/api`.

If the initial Metro process reports a missing screen created during development, stop that process and run `npx expo start --clear`. `src/features/patient/auth/RegisterScreen.tsx` contains both registration and account-created screens.

## Backend configuration

`Backend/.env` is ignored by Git. Never copy database passwords, JWT secrets, or SMTP passwords into the mobile environment. `EXPO_PUBLIC_*` values are public and bundled into the app.

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string; URL-encode the database password |
| `MONGODB_DB` | Optional explicit database name, e.g. `careplus` |
| `JWT_SECRET` | Random secret of at least 32 characters |
| `DNS_SERVERS` | Optional DNS IPs, e.g. `1.1.1.1,8.8.8.8`, for Atlas SRV resolution |
| `PORT` | API port, default `4000` |
| `CORS_ORIGINS` | Comma-separated web app origins |
| `SMTP_*` | Email provider settings for password reset codes |
| `GOOGLE_CLIENT_IDS` | Allowed Google OAuth client IDs, comma-separated |

`querySrv ECONNREFUSED` occurs before authentication. On this machine, Node's default DNS is `127.0.0.1`, whose SRV queries were refused. The local `.env` now selects public DNS for the backend process. `npm run db:check` checks DNS and performs a read-only authenticated ping, without printing credentials. See [MongoDB Atlas connection troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/).

MongoDB Atlas provides replica sets needed for transactions. Keep the cluster running and permit your current public IP in Atlas Network Access. The app does not disable TLS or change Windows DNS settings.

## Demo booking catalogue

The booking UI reads hospital, department, doctor, and slot data from MongoDB. An empty database shows an empty state. To add clearly labeled **demo** catalogue records to your configured database:

```powershell
cd Backend
npm run seed
```

The seed is repeatable and does not create patients or staff accounts. Replace these demo schedules with approved hospital schedules when the staff module is integrated.

## Your section's files

| Area | Mobile | Backend |
| --- | --- | --- |
| Register, login, launch, reset | `mobile/mobile/src/features/patient/auth/` | `Backend/src/patient/auth/` |
| Booking and dashboard | `mobile/mobile/src/features/patient/booking/` | `Backend/src/patient/booking/` |
| Profile and account deletion | `mobile/mobile/src/features/patient/profile/` | `Backend/src/patient/profile/` |
| UI, API types, session | `mobile/mobile/src/features/patient/shared/` | `Backend/src/patient/shared/` |
| Route wrappers | `mobile/mobile/src/app/` | `Backend/src/app.ts` |
| Environment and database connection | `mobile/mobile/.env` | `Backend/src/config/`, `Backend/.env` |

Existing assets in `assets/images` supply the CarePlus logo, leaves, and hospital illustration. Doctor portraits were not available, so doctor cards use profile icons. Screens follow the supplied screenshots, with scrolling for smaller phones and a centered mobile-width web view. Pixel-perfect Figma equivalence and native-device rendering still need design/device review.

## Behavior

- Every cold launch shows the launch screen. After a short delay (or tapping Click to Start), new installations show the option screen. A saved patient choice goes to login; a saved staff choice goes to the staff handoff screen.
- The selected path survives logout, expired sessions, and account deletion. Login has a Change selected option link.
- Registration uses three validated steps, a generated patient ID, a success screen, then login. Passwords are hashed with bcrypt. Remember me saves the login identifier, never the password.
- Protected screens require login. Session tokens stay in memory on web and use SecureStore on native; a cold launch clears the session and requires login again.
- Booking checks hospital/department/doctor relationships, doctor weekdays, future slots, and a 90-day booking window using Sri Lankan time. Database indexes prevent simultaneous reservations of the same doctor slot or two appointments for one patient at the same time.
- Appointment history, cancellation, profile editing, logout, and password-confirmed account deletion are connected to the API. Deletion removes that patient's appointments in a transaction.
- Password reset emails contain a 15-minute, single-use code; resetting the password invalidates existing sessions. Configure SMTP before using this feature.
- Google sign-in verifies the provider's ID token on the backend. Register patient details with the same verified Google email first. Configure platform OAuth IDs and redirects before using it. Native OAuth needs a configured app build; do not expect it to work in an unconfigured Expo Go session. See [Expo authentication](https://docs.expo.dev/versions/v57.0.0/sdk/auth-session/).

## Team integration boundaries

Staff login, live queue position/waiting estimates, notifications/push delivery, and medical records are intentionally pending your teammates' modules. The UI displays these states honestly, without fake queue numbers. Sinhala and Tamil controls currently explain that reviewed translations are pending; the implemented interface is English. Demonstration terms/privacy text must be replaced with hospital-approved copy before release.

The staff scheduling module can manage the `Hospital` and `Doctor` models. Each doctor supplies `hospitalId`, `specialty`, `weekdays` (`0` = Sunday), `slots` (`HH:mm`), and `active`. The appointment model exposes `patientId`, `doctorId`, `hospitalId`, `department`, `date`, `time`, `status`, and `appointmentId`. Keep staff authorization separate from patient JWTs.

## Patient API

All routes start with `/api/patient`. Protected routes require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Create patient |
| POST | `/auth/login` | Email, phone, or username and password |
| POST | `/auth/google` | Verify Google ID token |
| POST | `/auth/forgot-password` | Email reset code |
| POST | `/auth/reset-password` | Redeem code and set password |
| POST | `/auth/logout` | Revoke sessions |
| GET / PATCH / DELETE | `/profile` | Read, edit, or delete own account |
| GET | `/booking/hospitals` | Active hospital catalogue |
| GET | `/booking/doctors?hospitalId=…&department=…` | Filtered doctors |
| GET | `/booking/slots?doctorId=…&date=YYYY-MM-DD` | Available slots |
| GET / POST | `/booking/appointments` | Own history / create booking |
| PATCH | `/booking/appointments/:id/cancel` | Cancel own future booking |

## Checks and builds

```powershell
cd Backend
npm run build
npm test
```

Tests use a disposable MongoDB replica set, never the Atlas `.env` database. The first run may download MongoDB into `tests/.cache`.

```powershell
cd mobile/mobile
npm run typecheck
npm run lint
npx expo export --platform web
# With Expo web running on port 8082:
npm run test:ui
```

The browser smoke test uses Edge in headless mode, intercepts API requests with test fixtures, and saves screenshots in `artifacts/ui`. It covers registration, login, booking, profile editing, deletion, and saved-path behavior. Backend integration tests independently check real database operations and concurrency.

For an installable Android preview, configure your Expo account/project and hosted API URL, then run `npx eas-cli@latest build --platform android --profile preview`. `eas.json` is supplied. A signed APK/cloud build has not been produced in this workspace.
