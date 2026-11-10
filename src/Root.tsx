import { Suspense } from "react";
import { useLocation } from "react-router-dom";
import { lazyWithReload } from "./lazyWithReload";

const App = lazyWithReload(() => import("./App"));
const Landing = lazyWithReload(() => import("./landing/LandingPlaceholder"));

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

  let screen = <App />;
  if (path === "/" || path === "/about") screen = <Landing />;

  return <Suspense fallback={<ScreenFallback />}>{screen}</Suspense>;
}
