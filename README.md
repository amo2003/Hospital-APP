# CarePlus Hospital — OPD app

Patient registration, login, appointment booking, and profile management, plus a separate nurse login, dashboard, profile, patient lookup, and queue view. The app uses Expo Router / React Native; the API uses Express, TypeScript, and MongoDB Atlas.

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

## Team integration boundaries

Live queue progression, notifications/push delivery, and medical records are pending integration. The UI displays unavailable clinical data honestly rather than inventing it. Sinhala and Tamil controls currently explain that reviewed translations are pending; the implemented interface is English. Demonstration terms/privacy text must be replaced with hospital-approved copy before release. Nurse self-registration is suitable only for controlled development/demo environments; use hospital-approved account provisioning and verify authorization before exposing patient data in production.

The staff scheduling module can manage the `Hospital` and `Doctor` models. Each doctor supplies `hospitalId`, `specialty`, `weekdays` (`0` = Sunday), `slots` (`HH:mm`), and `active`. The appointment model exposes `patientId`, `doctorId`, `hospitalId`, `department`, `date`, `time`, `status`, and `appointmentId`. Keep staff authorization separate from patient JWTs.

Nurse routes start with `/api/nurse`. Public auth routes are `POST /auth/register` and `POST /auth/login` under that prefix. Protected routes include `GET/PATCH/DELETE /profile`, `POST /auth/logout`, `GET /patients`, `GET /patients/:patientId`, `GET /queue`, and `PATCH /queue/:id/cancel`. Patient and queue reads are scoped to the nurse's bound hospital and original department. Nurses can cancel waiting queue entries but cannot create tokens or control queue progression.


## Checks and builds

```powershell
cd Backend
npm run build
npm test
```

```powershell
cd mobile/mobile
npm run typecheck
npm run lint
npx expo export --platform web
# With Expo web running on port 8082:
npm run test:ui
```
