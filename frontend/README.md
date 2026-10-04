# ALARM — Frontend

Audit and accountability system for ALARM Bangladesh (bdalarm.org). Next.js 16 (App Router), React 19, Tailwind CSS v4.

## Roles

| # | Role (Bengali) | English | Portal |
|---|---|---|---|
| ১ | প্রধান নির্বাহী সম্পাদক | Chief Executive Editor | `/admin` |
| ২ | নির্বাহী সম্পাদক | Executive Editor | `/reviewer` |
| ৩ | তদন্ত সম্পাদক | Investigation Editor | `/staff` |
| ৪ | রাজনৈতিক কর্মী | Political Activist | `/politician` |

Every account is identified by a unique **ALARM ID**: `KAR-` + 6 random digits (e.g. `KAR-123456`). It is the primary key for all roles. There is no self-registration: the প্রধান নির্বাহী সম্পাদক creates every account, and a নির্বাহী সম্পাদক can create রাজনৈতিক কর্মী accounts inside their own area.

Sample accounts are listed in [readme2.md](readme2.md) (password `Alarm@2026`).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (must pass before deploying)
npm run lint
```

Environment:

| Variable | Meaning |
|---|---|
| `NEXT_PUBLIC_DEMO_MODE` | `true` shows one-click demo logins and "Reset demo data". Set `false` for real users. |
| `NEXT_PUBLIC_SITE_URL` | Public URL used for link previews (default `https://bdalarm.org`). |

Deploying to the VPS: see [DEPLOYMENT.md](DEPLOYMENT.md).

## Visibility rules (enforced in the UI)

- রাজনৈতিক কর্মী see only submitted content: no submitter or reviewer names, review trail or key facts.
- নির্বাহী সম্পাদক see a source label instead of তদন্ত সম্পাদক names.
- তদন্ত সম্পাদক never see নির্বাহী সম্পাদক names.
- No GPS or location tracking anywhere.

## Backend hand-off

The frontend is complete and runs on a mock database in the browser (`localStorage`). Connecting the backend means replacing these, each in one place:

| Concern | Where it lives now | Backend replaces it with |
|---|---|---|
| Data | `src/lib/db/store.ts`, `actions.ts`, `meetings.ts` | API calls; same function signatures |
| Sign-in / session | `src/lib/auth-client.ts`, `auth-server.ts`, `src/proxy.ts` (unsigned `alarm_session` cookie) | Signed, httpOnly session; server-side role checks |
| Passwords | stored in the mock DB | Hashed on the server |
| Password-reset OTP | `src/lib/otp.ts` (`smsGateway.live = false`, code shown on screen) | SMS gateway; code generated and checked on the server |
| Meeting audio | `src/lib/audio-room.ts` (`relays = false`) | Media server (WebRTC SFU); presence over the API |
| File uploads (evidence, photos, covers) | kept in the browser | Object storage |
| AI analysis | simulated in `actions.ts` | Analysis service |

Until then, data is per browser: changes made on one device are not visible on another.
