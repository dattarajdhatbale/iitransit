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
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  deleteField,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  increment,
  type DocumentSnapshot,
} from "firebase/firestore";

import { db }             from "./firebase";
import type { Ride, NewRide, UserProfile } from "./types";
export type { Ride, UserProfile } from "./types";
import { buildAlertId, MAX_SEEN_IDS, type RideAlert } from "./utils/alertUtils";
export type { RideAlert } from "./utils/alertUtils";

// The Firestore collection name. All rides live at /rides/{auto-id}
const RIDES_COLLECTION = "rides";
const USERS_COLLECTION = "users";
const ALERTS_COLLECTION = "alerts";

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
// ─────────────────────────────────────────────────────────────────────────────
// GET RIDES BY DATE (used by the Search page)
//
// Fetches rides for a specific date using a single-field equality filter.
// This requires zero manual composite indexes in Firebase Console and minimizes read quota.
//
// Called from: App.tsx → handleSearchRide()
// ─────────────────────────────────────────────────────────────────────────────
export async function getRidesByDate(date: string): Promise<Ride[]> {
  const q = query(
    collection(db, RIDES_COLLECTION),
    where("date", "==", date)
  );
  const snapshot = await getDocs(q);
  return ridesFromSnapshot(snapshot);
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
/**
 * @deprecated Use getRidesByDate(date) instead to avoid full collection scans and excessive read quotas.
 */
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

export async function getSharedRide(rideId: string): Promise<Ride | null> {
  const snap = await getDoc(doc(db, "rides", rideId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Ride, "id">) };
}

export async function incrementContactClicks(rideId: string): Promise<void> {
  await updateDoc(doc(db, RIDES_COLLECTION, rideId), {
    contactClicks: increment(1),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// USER PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...(typeof data?.contact === "string" ? { contact: data.contact } : {}),
  };
}

export async function saveUserContact(uid: string, contact: string | null): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      contact: contact ?? deleteField(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH ALERTS
// ─────────────────────────────────────────────────────────────────────────────

function alertFromDoc(docSnap: DocumentSnapshot): RideAlert {
  const data = docSnap.data() ?? {};
  return {
    id: docSnap.id,
    uid: String(data.uid ?? ""),
    date: String(data.date ?? ""),
    from: String(data.from ?? ""),
    to: String(data.to ?? ""),
    createdAt: data.createdAt ?? null,
    seenRideIds: Array.isArray(data.seenRideIds)
      ? data.seenRideIds.filter((x: unknown): x is string => typeof x === "string")
      : [],
    firstMatchSeenAt: data.firstMatchSeenAt ?? null,
  };
}

export async function getUserAlerts(uid: string): Promise<RideAlert[]> {
  const q = query(
    collection(db, ALERTS_COLLECTION),
    where("uid", "==", uid)
  );
  const snapshot = await getDocs(q);
  const alerts = snapshot.docs.map(alertFromDoc);
  alerts.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0);
  });
  return alerts;
}

export async function createRideAlert(
  uid: string,
  date: string,
  from: string,
  to: string
): Promise<RideAlert> {
  const id = buildAlertId(uid, date, from, to);
  const alertRef = doc(db, ALERTS_COLLECTION, id);
  const existing = await getDoc(alertRef);
  if (existing.exists()) {
    return alertFromDoc(existing);
  }
  await setDoc(alertRef, {
    uid,
    date,
    from,
    to,
    createdAt: serverTimestamp(),
    seenRideIds: [],
  });
  return {
    id,
    uid,
    date,
    from,
    to,
    createdAt: null,
    seenRideIds: [],
    firstMatchSeenAt: null,
  };
}

export async function deleteRideAlert(alertId: string): Promise<void> {
  await deleteDoc(doc(db, ALERTS_COLLECTION, alertId));
}

export async function markAlertRidesSeen(
  alertId: string,
  nextSeenRideIds: string[],
  setFirstMatchSeen: boolean
): Promise<void> {
  const capped = Array.from(new Set(nextSeenRideIds)).slice(-MAX_SEEN_IDS);
  const payload: Record<string, unknown> = { seenRideIds: capped };
  if (setFirstMatchSeen) {
    payload.firstMatchSeenAt = serverTimestamp();
  }
  await updateDoc(doc(db, ALERTS_COLLECTION, alertId), payload);
}