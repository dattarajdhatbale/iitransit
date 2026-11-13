import { Suspense, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { lazyWithReload } from "./lazyWithReload";
import { isReturningUser } from "./returningUser";
import { rootRoute } from "./rootRoute";

const App = lazyWithReload(() => import("./App"));
const LandingPage = lazyWithReload(() => import("./landing/LandingPage"));

// Shown for the moment a lazy chunk is loading; matches the app's own backgrounds.
function ScreenFallback() {
  const dark = document.documentElement.classList.contains("dark-mode");
  return (
    <div
      className={
        dark
          ? "min-h-screen bg-[#0B1020]"
          : "min-h-screen bg-gradient-to-br from-[#d8cfe3] via-[#cfc3dc] to-[#c4b6d6]"
      }
    />
  );
}

// True when IITransit runs as an installed app (Android/desktop, or "Add to Home Screen" on iOS).
// Installs from before the landing page still start at "/", and should never see the landing page.
function isInstalledApp(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export default function Root() {
  const location = useLocation();
  // The location this page load opened on. Every navigation, including Back to that same URL,
  // gives a new location object, so this is true only until the visit moves on.
  const opened = useRef(location);
  const route = rootRoute({
    pathname: location.pathname,
    hash: location.hash,
    firstPage: location === opened.current,
    skipLanding: () => isReturningUser() || isInstalledApp(),
  });

  if ("redirect" in route) {
    const hash = route.keepHash ? location.hash : "";
    return <Navigate to={{ pathname: route.redirect, search: location.search, hash }} replace />;
  }

  const screen = route.show === "landing" ? <LandingPage /> : <App />;
  return <Suspense fallback={<ScreenFallback />}>{screen}</Suspense>;
}
