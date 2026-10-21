import type { Ride } from "../db";

export const COLLEGE_LOCATIONS = [
  "RHR",
  "BHR",
  "MHR",
  "L-Gate",
  "Main Gate",
] as const;

export const TRANSIT_LOCATIONS = [
  "Khurda Road Junction Railway Station",
  "Bhubaneswar Railway Station",
  "Biju Patnaik International Airport",
  "Baramunda ISBT (BSABT)",
] as const;

export const MAX_ALERTS = 5;
export const MAX_SEEN_IDS = 50;
export const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export interface RideAlert {
  id: string;
  uid: string;
  date: string;       // "YYYY-MM-DD"
  from: string;       // "" or exact option name
  to: string;         // "" or exact option name
  createdAt?: { seconds: number } | null;
  seenRideIds: string[];
  firstMatchSeenAt?: { seconds: number } | null;
}

export function locationsMatch(searchLoc: string, rideLoc: string): boolean {
  if (searchLoc === rideLoc) return true;
  const campusSet = new Set<string>(COLLEGE_LOCATIONS);
  if (campusSet.has(searchLoc) && campusSet.has(rideLoc)) return true;
  return false;
}

export function locationKey(loc: string): string {
  const trimmed = loc.trim();
  if (!trimmed) return "any";
  const campusSet = new Set<string>(COLLEGE_LOCATIONS);
  if (campusSet.has(trimmed)) return "campus";
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildAlertId(uid: string, date: string, from: string, to: string): string {
  return `${uid}_${date}_${locationKey(from)}_${locationKey(to)}`;
}

export function isRideEligibleForAlert(
  ride: Ride,
  alert: RideAlert,
  currentUid: string,
  nowSeconds: number
): boolean {
  if (ride.date !== alert.date) return false;
  if (ride.status !== "active") return false;
  if (ride.departureAt.seconds < nowSeconds) return false;
  if (ride.availableSeats <= 0 || ride.isAvailable === false) return false;
  if (ride.postedBy.uid === currentUid) return false;

  const alertFrom = alert.from.trim();
  if (alertFrom && !locationsMatch(alertFrom, ride.from)) return false;

  const alertTo = alert.to.trim();
  if (alertTo && !locationsMatch(alertTo, ride.to)) return false;

  return true;
}

export function getUnreadRideIds(eligibleRides: Ride[], alert: RideAlert): string[] {
  const seenSet = new Set(alert.seenRideIds);
  return eligibleRides.filter((r) => !seenSet.has(r.id)).map((r) => r.id);
}
