import { Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { lazyWithReload } from "./lazyWithReload";
import { isReturningUser } from "./returningUser";

const App = lazyWithReload(() => import("./App"));
const Landing = lazyWithReload(() => import("./landing/LandingPlaceholder"));
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

export default function Root() {
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/" && isReturningUser()) {
    return <Navigate to={{ pathname: "/app", search: location.search, hash: location.hash }} replace />;
  }

  let screen = <App />;
  if (path === "/" || path === "/about") screen = <Landing />;
  else if (path === "/intro-preview") screen = <LandingPage />;

  return <Suspense fallback={<ScreenFallback />}>{screen}</Suspense>;
}
