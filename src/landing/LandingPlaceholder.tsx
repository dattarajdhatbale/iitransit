import { useState } from "react";
import { Link } from "react-router-dom";
import { getIsDark, setIsDark } from "../theme";

// Temporary landing page. The animated intro replaces it in the next phase.
export default function LandingPlaceholder() {
  const [isDark, setDark] = useState<boolean>(getIsDark);
  const theme = isDark ? "dark" : "light";

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    setDark(next);
  };

  return (
    <main
      className={
        isDark
          ? "flex min-h-[100svh] flex-col bg-[#0B1020] text-[#F8FAFC]"
          : "flex min-h-[100svh] flex-col bg-gradient-to-br from-[#d8cfe3] via-[#cfc3dc] to-[#c4b6d6] text-[#242638]"
      }
    >
      <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-10">
        <span className="font-['Space_Grotesk'] text-xl font-bold tracking-tight">IITransit</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={
              isDark
                ? "rounded-full border border-[rgba(255,255,255,0.12)] px-3 py-1.5 text-sm"
                : "rounded-full border border-[rgba(30,26,77,0.2)] px-3 py-1.5 text-sm"
            }
          >
            {isDark ? "Light" : "Dark"}
          </button>
          <Link
            to="/app"
            className={
              isDark
                ? "rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-bold text-white"
                : "rounded-full bg-[#5a3d7a] px-4 py-2 text-sm font-bold text-white"
            }
          >
            Open App
          </Link>
        </div>
      </header>

      <section className="px-4 pt-2 text-center md:px-10">
        <h1 className="font-['Space_Grotesk'] text-3xl font-bold tracking-tight md:text-5xl">
          Split the ride. Save the fare.
        </h1>
        <p className="mt-2 text-base opacity-80 md:text-lg">Ride sharing for IIT Bhubaneswar students.</p>
      </section>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6 pt-4">
        <picture>
          <source media="(orientation: portrait)" srcSet={`/landing/frame-mobile-${theme}.svg`} />
          <img
            src={`/landing/frame-desktop-${theme}.svg`}
            alt="Three students share one car from the IIT Bhubaneswar main building to Bhubaneswar railway station"
            className="max-h-[calc(100svh-180px)] w-full max-w-6xl object-contain"
          />
        </picture>
      </div>
    </main>
  );
}
