# IITransit

A ride-sharing web app for IIT Bhubaneswar students to coordinate shared cabs and autos to transit hubs.

**Live Demo:** https://iitransit.vercel.app

---

## Demo

[![Watch the Demo](https://img.youtube.com/vi/U10DvnTRGu4/0.jpg)](https://www.youtube.com/watch?v=U10DvnTRGu4)

## Overview

Students at IIT Bhubaneswar frequently travel between campus and transit hubs — the railway stations, airport, and bus terminal — at similar times. Coordinating a shared cab or auto previously relied on informal WhatsApp messages with no structured way to find ride partners.

IITransit provides a simple, focused interface: post a ride you are offering, or search for one that matches your route and date. Authentication is restricted to institutional accounts, so every user on the platform is a verified IIT BBS student.

---

## Key Features

- **Institute-only access** — Sign-in is restricted to `@iitbbs.ac.in` Google accounts. No manual verification required; the OAuth domain check is enforced at the authentication layer.
- **Post a ride** — Share departure location, destination, date, time, vehicle type, available seats, fare per person, and an optional note (e.g. flexible timing, luggage space).
- **Search rides** — Filter by route and date. A transit hub must be specified in every search to prevent bulk contact exposure.
- **Privacy-first contact reveal** — Phone numbers are hidden by default. A "Show Contact" button reveals a WhatsApp deep link, reducing unsolicited exposure.
- **My Rides** — Manage posted rides: cancel a ride, or adjust available seats as people join. Rides are grouped into upcoming and past.
- **Campus fuzzy matching** — Searching from any campus location (RHR, BHR, MHR, L-Gate, Main Gate) returns rides departing from any campus location to the same transit hub, since the walking distance between hostels is negligible.
- **Progressive Web App** — Installable on Android and desktop via Chrome with offline shell caching.
- **Dark / light mode** — Persisted across sessions via localStorage.
- **Feedback form** — Linked in the footer for collecting user feedback post-launch.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 7 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Cloud Firestore (Firebase) |
| Authentication | Firebase Authentication (Google OAuth) |
| Deployment | Vercel |
| PWA | vite-plugin-pwa |

---

## Architecture and Engineering Decisions

**No custom backend.** The app reads and writes directly to Firestore from the client. Firebase Security Rules enforce access control server-side, making a dedicated backend unnecessary for this scale.

**Domain-restricted authentication.** Firebase Auth handles Google sign-in, but `onAuthStateChanged` enforces the `@iitbbs.ac.in` domain check on every session resolution — not just at login. Any session from an outside account is immediately signed out.

**Soft deletes.** Cancelled rides are never removed from Firestore; their `status` field is set to `"cancelled"`. This preserves history and allows accidental cancellations to be reversed if needed.

**Temporal queries via Firestore Timestamps.** Each ride stores a `departureAt` Timestamp alongside plain `date` and `time` strings. Searches filter `departureAt >= now()` server-side, so expired rides are automatically excluded without client-side date comparison logic.

**Duplicate submission guard.** A `useRef` flag is set synchronously at the start of the post handler, preventing repeated submissions on slow connections before React's async state update takes effect.

**Separation of concerns.** Firestore operations live entirely in `db.ts`, type definitions in `types.ts`, and Firebase initialisation in `firebase.ts`. `App.tsx` contains only UI and event handling — no direct database calls.

---

## Running Locally

```bash
git clone https://github.com/dattarajdhatbale/iitransit.git
cd iitransit
npm install
```
Create your own Firebase backend
Create a `.env.local` file in the project root with your Firebase project credentials:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

These values are available from the Firebase Console under Project Settings → Your apps → Web app config.

```bash
npm run dev
```

The app will be available at `http://localhost:5173`. To test on a mobile device on the same network, use the Network URL printed in the terminal.

> Note: Sign-in requires a Google account with an `@iitbbs.ac.in` domain. Testing authentication locally requires adding `localhost` to the Authorized Domains list in Firebase Console → Authentication → Settings.

---

## Project Structure

```
src/
  App.tsx        UI layer — routing, all React components, event handlers
  firebase.ts    Firebase app initialisation
  db.ts          All Firestore reads and writes
  types.ts       TypeScript type definitions for Ride, RidePoster, etc.
  main.tsx       React entry point
  index.css      Design tokens and global component styles
  utils/cn.ts    Tailwind class merger utility
```

---

## Future Improvements

- **Multi-college support** — Domain detection at sign-in to load college-specific location data from Firestore, enabling the same codebase to serve multiple institutions.
- **Ride editing** — Allow the poster to update departure time, vehicle type, or notes after posting without cancelling and reposting.
- **React Router migration** — Replace the current multi-HTML file routing with a proper SPA router.
- **In-app notifications** — Replace `alert()` calls with a toast notification system.
- **AI-assisted location validation** — When onboarding a new college, use an LLM to verify that submitted campus and transit locations are geographically accurate before they go live.

---
## Feedback

IITransit is currently being tested and improved based on student feedback.
If you have a bug report, feature request, or suggestion, I'd really appreciate your feedback.

**[Submit Feedback](https://docs.google.com/forms/d/e/1FAIpQLSeet-8iazCjxWW6NFBJbTymvL3Grhx_rHKWJCiddUqWogUhWw/viewform)**
