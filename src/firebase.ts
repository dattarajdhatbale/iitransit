// ─────────────────────────────────────────────────────────────────────────────
/// <reference types="vite/client" />
// src/firebase.ts
//
// PURPOSE: Initialise the Firebase app exactly once and export the two
//          services this project uses:
//            • auth  — Google Sign-In / user sessions
//            • db    — Firestore database (where rides live)
//
// HOW TO FILL THIS IN (see full guide at the bottom of this file):
//   Replace every "YOUR_…" placeholder with the real value from your
//   Firebase project's web-app config page.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";

// ─── PASTE YOUR FIREBASE CONFIG HERE ─────────────────────────────────────────
//
//  Where to find these values:
//    Firebase Console → Project Settings (gear icon) → "Your apps" section
//    → click the web app you registered → copy the firebaseConfig object.
//
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
// ─────────────────────────────────────────────────────────────────────────────

// initializeApp() must be called before anything else. Calling it more than
// once throws an error, which is why this lives in its own file — Vite
// imports it once and caches it.
const app = initializeApp(firebaseConfig);

// auth: handles Google sign-in, session persistence, and current-user state.
//       Firebase automatically stores the session in the browser so the user
//       stays logged in across page refreshes without us doing anything extra.
export const auth = getAuth(app);

// db:   the Firestore client. Every read/write in db.ts goes through this.
export const db = getFirestore(app);
