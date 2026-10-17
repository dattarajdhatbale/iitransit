import type { Ride } from "../types";

export const CONTACT_REGEX = /^[6-9]\d{9}$/;
export const PAGE_SIZE = 5;

export function sanitizeDigits(value: string): string {
  let d = value.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

export function partitionRides(
  rides: Ride[],
  nowSeconds: number
): { nextRide: Ride | null; upcoming: Ride[]; history: Ride[] } {
  const future: Ride[] = [];
  const history: Ride[] = [];

  for (const ride of rides) {
    if (ride.departureAt.seconds >= nowSeconds && ride.status !== "cancelled") {
      future.push(ride);
    } else {
      history.push(ride);
    }
  }

  future.sort((a, b) => a.departureAt.seconds - b.departureAt.seconds);
  history.sort((a, b) => b.departureAt.seconds - a.departureAt.seconds);

  return {
    nextRide: future[0] ?? null,
    upcoming: future.slice(1),
    history,
  };
}

export function paginate<T>(
  items: T[],
  page: number,
  pageSize = PAGE_SIZE
): { pageItems: T[]; page: number; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  return {
    pageItems,
    page: clampedPage,
    totalPages,
  };
}
