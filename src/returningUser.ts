// Remembers that someone has signed in on this device, so "/" can skip the landing page.
const RETURNING_KEY = "iitransit:returning";

export function isReturningUser(): boolean {
  try {
    return localStorage.getItem(RETURNING_KEY) === "1";
  } catch {
    return false;
  }
}

export function markReturningUser(): void {
  try {
    localStorage.setItem(RETURNING_KEY, "1");
  } catch {
    // Storage unavailable; the landing page will simply show again.
  }
}
