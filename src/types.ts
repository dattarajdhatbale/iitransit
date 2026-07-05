// ─────────────────────────────────────────────────────────────────────────────
// src/types.ts
//
// PURPOSE: Central home for every TypeScript type in the project.
//          Keeping types here means you change a field shape in ONE place
//          and TypeScript immediately tells you every other place that needs
//          to be updated.
//
// ─── HOW TO ADD A NEW FIELD TO A RIDE ────────────────────────────────────────
//
//  Example: you want to add a boolean "luggageAllowed".
//
//  Step 1 → Add it here in the Ride type (use ? to make it optional so old
//            Firestore documents that don't have it don't break anything):
//              luggageAllowed?: boolean;
//
//  Step 2 → Add a form control for it in the Post Ride section of App.tsx.
//
//  Step 3 → Include it in the `newRide` object inside handlePostRide() in App.tsx.
//
//  Step 4 → Show it in the ride result card inside renderRideCard() in App.tsx.
//
//  That's it. Firestore has no fixed schema — it stores whatever object you
//  hand it. Old documents without the field simply return `undefined`, which
//  is safe because you marked it optional with ?.
//
// ─────────────────────────────────────────────────────────────────────────────

import type { Timestamp } from "firebase/firestore";

// The four vehicle types a sharer can choose from.
// To add a new one: add it to this union AND add a matching <option> in the
// vehicleType <select> in App.tsx's Post Ride form.
export type VehicleType = "cab" | "auto" | "car" | "other";

// A ride can be active (visible in search), cancelled (soft-deleted),
// or full (sharer closed it but hasn't cancelled).
export type RideStatus = "active" | "cancelled";

// The person who posted the ride — stored inside the ride document so we
// don't need a second DB lookup to show "posted by X".
export type RidePoster = {
  uid:   string;   // Firebase Auth UID — used for security rules
  email: string;   // e.g. "21cs1001@iitbbs.ac.in"
  name:  string;   // Display name from Google account
};

// ─── MAIN RIDE TYPE ───────────────────────────────────────────────────────────
//
// This is what lives in Firestore. The `id` field is NOT stored inside the
// document itself — Firestore uses it as the document key. We attach it
// ourselves after reading (see db.ts → ridesFromSnapshot).
//
export type Ride = {
  id:          string;       // Firestore doc ID, added client-side after fetch

  // Who posted it
  postedBy:    RidePoster;

  // Route
  from:        string;       // e.g. "RHR"
  to:          string;       // e.g. "Bhubaneswar Railway Station"

  // Timing — stored two ways on purpose:
  //   • date / time are plain strings, easy to display and filter on the client
  //   • departureAt is a Firestore Timestamp so we can do server-side
  //     queries like "all rides departing after right now"
  date:        string;       // "YYYY-MM-DD"
  time:        string;       // "HH:MM" 24-hour
  departureAt: Timestamp;    // Firestore Timestamp — used for ordering + expiry queries

  // Ride details
  vehicleType:   VehicleType;
  isAvailable:   boolean;    // true = seats open; false = full/closed (sharer controls this)
  farePerPerson: number | null; // null → "contact to discuss"
  contact:       string;     // WhatsApp / phone number shown to other logged-in users

  // Optional free-text note from the sharer
  notes: string;             // "" when empty; never null

  // Lifecycle
  status:    RideStatus;
  createdAt: Timestamp;
};

// NewRide is what we send TO Firestore when posting.
// We omit `id` because Firestore auto-generates the document key.
export type NewRide = Omit<Ride, "id">;
