// Shared theme helpers. Same rule as App.tsx: dark unless localStorage "theme" is "light".
const THEME_KEY = "theme";

export function getIsDark(): boolean {
  try {
    return localStorage.getItem(THEME_KEY) !== "light";
  } catch {
    return true;
  }
}

export function setIsDark(dark: boolean): void {
  document.documentElement.classList.toggle("dark-mode", dark);
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage unavailable (private mode); the class still applies for this visit.
  }
}
