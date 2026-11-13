import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "iitransit:chunk-reload";

// React.lazy, but if a chunk fails to load (typically right after a deploy), reload the page once.
export function lazyWithReload<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const loaded = await load();
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        // Storage unavailable.
      }
      return loaded;
    } catch (error) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "1";
        sessionStorage.setItem(RELOAD_KEY, "1");
      } catch {
        alreadyReloaded = true;
      }
      if (!alreadyReloaded) {
        window.location.reload();
        return new Promise<never>(() => {});
      }
      throw error;
    }
  });
}
