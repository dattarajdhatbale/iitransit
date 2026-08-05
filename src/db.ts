// ─────────────────────────────────────────────────────────────────────────────
// src/db.ts
//
// PURPOSE: Every single Firestore read and write lives here.
//          App.tsx calls these functions — it never touches Firestore directly.
//
// WHY THIS SEPARATION?
//   If something goes wrong with the database, you look here, not in App.tsx.
//   Each function has one job and a clear name so you know exactly what failed.
//
// DEBUGGING TIP:
//   Open browser DevTools → Console tab while the app is running.
//   Firestore errors print there with a code like "permission-denied" or
//   "failed-precondition". Common ones:
//     • permission-denied  → your Firestore Security Rules are blocking it.
//                            Go to Firebase Console → Firestore → Rules and
//                            make sure the rules from the setup guide are saved.
//     • requires-index     → click the link in the error — Firebase will create
//                            the composite index automatically in one click.
//     • unavailable        → network issue; user should check their connection.
// ─────────────────────────────────────────────────────────────────────────────

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import { db }             from "./firebase";
import type { Ride, NewRide } from "./types";

// The Firestore collection name. All rides live at /rides/{auto-id}
const RIDES_COLLECTION = "rides";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: convert an array of Firestore QueryDocumentSnapshots → Ride[]
//         This is called after every getDocs() so we always get typed objects.
// ─────────────────────────────────────────────────────────────────────────────
function ridesFromSnapshot(snapshot: Awaited<ReturnType<typeof getDocs>>): Ride[] {
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Ride, "id">),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: build a Firestore Timestamp from separate date and time strings.
//         Used when posting a ride and when querying "is this ride in the future".
// ─────────────────────────────────────────────────────────────────────────────
export function buildDepartureTimestamp(date: string, time: string): Timestamp {
  // date = "YYYY-MM-DD", time = "HH:MM"
  const [year, month, day]    = date.split("-").map(Number);
  const [hours, minutes]      = time.split(":").map(Number);
  // Month is 0-indexed in JavaScript's Date constructor
  return Timestamp.fromDate(new Date(year, month - 1, day, hours, minutes, 0));
}

// ─────────────────────────────────────────────────────────────────────────────
// POST A RIDE
//
// Writes a new ride document to Firestore.
// Returns the auto-generated Firestore document ID on success.
//
// Called from: App.tsx → handlePostRide()
// ─────────────────────────────────────────────────────────────────────────────
export async function postRide(ride: NewRide): Promise<string> {
  const docRef = await addDoc(collection(db, RIDES_COLLECTION), ride);
  return docRef.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ACTIVE FUTURE RIDES  (used by the Search page)
//
// Fetches every ride where departureAt >= right now, ordered soonest first.
// Status filtering ("active" only) and from/to/date filtering are done
// client-side so we don't need any composite Firestore indexes.
//
// Called from: App.tsx → handleSearchRide()
// ─────────────────────────────────────────────────────────────────────────────
export async function getActiveFutureRides(): Promise<Ride[]> {
  // Only inequality filter here (">=") → no composite index needed.
  // We order by the same field we filter on, also safe without an index.
  const q = query(
    collection(db, RIDES_COLLECTION),
    where("departureAt", ">=", Timestamp.now()),
    orderBy("departureAt", "asc"),
  );
  const snapshot = await getDocs(q);
  return ridesFromSnapshot(snapshot);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET RIDES POSTED BY THE CURRENT USER  (used by My Rides page)
//
// Fetches ALL rides (past + future, active + cancelled) for the logged-in user.
// We sort client-side descending so most-recent posts appear first.
//
// Called from: App.tsx → loadMyRides()
// ─────────────────────────────────────────────────────────────────────────────
export async function getMyRides(uid: string): Promise<Ride[]> {
  // Equality filter only → no composite index needed.
  const q = query(
    collection(db, RIDES_COLLECTION),
    where("postedBy.uid", "==", uid),
  );
  const snapshot = await getDocs(q);
  const rides = ridesFromSnapshot(snapshot);

  // Sort client-side: soonest departure first within future rides,
  // then past rides chronologically.
  return rides.sort(
    (a, b) => b.departureAt.seconds - a.departureAt.seconds,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL A RIDE  (soft-delete — sets status to "cancelled")
//
// We never hard-delete rides. This way:
//   • The poster can see their cancellation history in My Rides.
//   • If someone accidentally cancels we can undo it (just change status back).
//
// Called from: App.tsx → handleCancelRide()
// ─────────────────────────────────────────────────────────────────────────────
export async function cancelRide(rideId: string): Promise<void> {
  await updateDoc(doc(db, RIDES_COLLECTION, rideId), {
    status: "cancelled",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE AVAILABILITY  (full ↔ available, without cancelling the ride)
//
// The sharer can flip this flag if, say, their auto is now full, or if
// someone dropped out and a seat opened up again.
//
// Called from: App.tsx → handleToggleAvailability()
// ─────────────────────────────────────────────────────────────────────────────
export async function setRideAvailability(
  rideId:      string,
  isAvailable: boolean,
): Promise<void> {
  await updateDoc(doc(db, RIDES_COLLECTION, rideId), { isAvailable });
}
export async function updateAvailableSeats(rideId: string, availableSeats: number): Promise<void> {
  const rideRef = doc(db, RIDES_COLLECTION, rideId);
  await updateDoc(rideRef, { availableSeats });
}