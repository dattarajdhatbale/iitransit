let timeOffset = 0;
let syncPromise: Promise<void> | null = null;

/**
 * Pings the origin server to read the 'Date' HTTP header.
 * Calculates the offset between the server's objective time and the local device clock.
 */
export function syncTimeOffset(): Promise<void> {
  if (!syncPromise) {
    syncPromise = (async () => {
      try {
        const response = await fetch(window.location.origin, { method: "HEAD", cache: "no-store" });
        const dateHeader = response.headers.get("Date");
        if (dateHeader) {
          const serverTime = new Date(dateHeader).getTime();
          if (!isNaN(serverTime)) {
            timeOffset = serverTime - Date.now();
            console.log(`[Time Sync] Clock offset applied: ${timeOffset}ms`);
          }
        }
      } catch (error) {
        console.warn("[Time Sync] Failed to sync with server, trusting local clock.");
      }
    })();
  }
  return syncPromise;
}

/**
 * Returns the current timestamp in milliseconds, corrected by the server offset.
 */
export function getTrueTime(): number {
  return Date.now() + timeOffset;
}
