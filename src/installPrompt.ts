// Captures the PWA install prompt as soon as the page loads, so the app can offer
// "Install App" even when the visitor arrived on the landing page first.
type Listener = (prompt: Event | null) => void;

let deferredPrompt: Event | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((listener) => listener(deferredPrompt));
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  emit();
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  emit();
});

export function getInstallPrompt(): Event | null {
  return deferredPrompt;
}

export function clearInstallPrompt(): void {
  deferredPrompt = null;
  emit();
}

export function subscribeInstallPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
