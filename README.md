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

- **Institute-only access** — Sign-in is restricted to `@iitbbs.ac.in` Google accounts. No manual verification required; the OAuth domain check is enforced at the authentication and database layers.
- **Post a ride** — Share departure location, destination, date, time, vehicle type, available seats, total fare, and an optional note (e.g. flexible timing, luggage space).
- **Search rides** — Filter by route and date. A transit hub must be specified in every search to prevent bulk contact exposure.
- **Watched searches & alerts (`/alerts`)** — Watch any route and date with a single click from empty or populated search results. A navbar notification bell displays real-time unread match badges when matching rides are posted, managed via a dedicated alerts hub.
- **Search-to-post conversion** — If a search returns zero rides, a 1-click "Offer This Ride Instead" action redirects to `/post` with the route and date prefilled.
- **User profile & contact autofill (`/profile`)** — Save a default WhatsApp/phone number in your profile (with automatic `+91`/`0` stripping and Indian mobile regex validation) so it auto-populates when posting future rides.
- **Privacy-first contact reveal** — Phone numbers are hidden by default. A "Show Contact" button reveals a WhatsApp deep link, reducing unsolicited exposure while tracking reveal telemetry.
- **My Rides & numbered pagination** — Manage posted rides: cancel a ride, or adjust available seats as people join. Rides are grouped into upcoming and past with clean numbered pagination across ride histories and search results.
- **Campus fuzzy matching** — Searching from any campus location (RHR, BHR, MHR, L-Gate, Main Gate) returns rides departing from any campus location to the same transit hub, since the walking distance between hostels is negligible.
- **Shareable ride links** — Every ride card has a share button that opens the device's native share sheet. Generates a deep link (`/search?id=...`) that opens the app focused on that specific ride, with a highlight animation.
- **Smart nudge** — When a seeker reveals a poster's contact info, the poster sees a dismissible banner on My Rides reminding them to update availability if their ride is now full.
- **Auto-updating PWA** — Installable on Android and desktop via Chrome with offline shell caching, background service worker auto-updates, and automatic stale cache cleanup.
- **Dark / light mode** — Persisted across sessions via localStorage.
- **Feedback & bug reporting** — Linked in the footer (`/ 💡/ 🐛`) to a branching feedback and bug triage form.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 7 |
| Routing | React Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Cloud Firestore (Firebase) |
| Authentication | Firebase Authentication (Google OAuth) |
| Deployment | Vercel |
| PWA | vite-plugin-pwa |

---

## Architecture and Engineering Decisions

**No custom backend & hardened security rules.** The app reads and writes directly to Firestore from the client. Multi-collection Firebase Security Rules (`firestore.rules`) guard `/rides`, `/users`, and `/alerts` server-side — enforcing `@iitbbs.ac.in` email verification, strict schema/key whitelists, regex validation, and server timestamp comparisons (`request.time`).

**Date-scoped queries for read quota optimization.** Instead of scanning the entire future rides collection, searches execute single-field equality queries on the `date` string (`getRidesByDate`) and filter upcoming departures in memory. This minimizes Firestore read consumption and requires zero manual composite indexes.

**Network time synchronization (clock skew compensation).** An internal utility (`timeUtils.ts`) pings the origin via a lightweight zero-cache `HEAD` request to read the server's authoritative `Date` header and compute client-to-server clock offset. This prevents devices with skewed system clocks from falsely filtering out valid upcoming rides.

**Deterministic alert IDs & rate limiting.** Watched search alerts use deterministic composite IDs (`uid_date_from_to`) to prevent duplicate watches at the database level, paired with a 5-alert cap per user and a 15-minute notification cooldown.

**Atomic contact reveal telemetry.** Clicking "Show Contact" atomically increments `contactClicks` (+1) on the ride document. Custom security rules allow any verified student to increment *only* `contactClicks` by `+1`, while locking all other ride mutations strictly to the original poster.

**Domain-restricted authentication.** Firebase Auth handles Google sign-in, and `onAuthStateChanged` enforces the `@iitbbs.ac.in` domain check on every session resolution — not just at login. Any session from an outside account is immediately signed out.

**Soft deletes.** Hard deletes are denied in `firestore.rules` (`allow delete: false` on rides). Cancelled rides set their `status` field to `"cancelled"`, preserving history and auditability.

**Duplicate submission guard.** A `useRef` flag is set synchronously at the start of the post handler, preventing repeated submissions on slow connections before React's async state update takes effect.

**Separation of concerns.** Firestore operations live in `db.ts`, domain utilities in `utils/` (`alertUtils.ts`, `profileUtils.ts`, `timeUtils.ts`), type definitions in `types.ts`, and Firebase initialisation in `firebase.ts`. `App.tsx` focuses on declarative SPA routing and UI state.

---

## Running Locally

```bash
git clone https://github.com/dattarajdhatbale/iitransit.git
cd iitransit
npm install
```

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
  App.tsx              UI layer — SPA routing, views, and event handlers
  components/
    Avatar.tsx         User avatar with profile link and initials fallback
    icons.tsx          Custom SVG icon components
  firebase.ts          Firebase app initialisation
  db.ts                All Firestore reads, writes, and atomic updates
  types.ts             TypeScript interfaces for Ride, SearchAlert, UserProfile, etc.
  main.tsx             React entry point
  index.css            Design tokens and global component styles
  utils/
    alertUtils.ts      Watched search matching, deterministic IDs, and cooldown logic
    profileUtils.ts    Phone sanitization, validation, and pagination helpers
    timeUtils.ts       Server clock offset sync via HTTP HEAD Date header
    cn.ts              Tailwind class merger utility
firestore.rules        Server-side schema, auth, and mutation security rules
```

---

## Future Improvements

* **Multi-college support** — Domain detection at sign-in to load college-specific location data from Firestore, enabling the same codebase to serve multiple institutions.
* **Ride editing** — Allow the poster to update departure time, vehicle type, or notes after posting without cancelling and reposting.
* ~~**React Router migration** — Replace the current multi-HTML file routing with a proper SPA router.~~
* ~~**Watched search alerts** — Allow students to subscribe to a route/date and receive in-app unread match badges when matching rides are posted.~~
* ~~**Saved contact autofill** — Let users save a default phone number in their profile to auto-populate future ride posts.~~
* **In-app notifications** — Replace remaining `alert()` calls with a toast notification system.
* **AI-assisted location validation** — When onboarding a new college, use an LLM to verify that submitted campus and transit locations are geographically accurate before they go live.

---

## Feedback

IITransit is actively maintained and improved based on student feedback.
If you have a bug report, feature request, or suggestion, I'd really appreciate hearing from you:

**[💡 Ideas / 🐛 Bugs — Submit Feedback](https://forms.gle/tfoRdKjGRmBJkwSM9)**
