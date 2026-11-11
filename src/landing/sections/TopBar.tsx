import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MoonIcon, SunIcon } from "../parts/icons";

interface TopBarProps {
  isDark: boolean;
  onToggleTheme: () => void;
  motionOn: boolean;
  onToggleMotion: () => void;
}

// The bar that slides in once the intro (with its own top bar) has scrolled off the screen. While the
// intro is pinned it stays on screen, so the two bars never show at the same time.
export default function TopBar({ isDark, onToggleTheme, motionOn, onToggleMotion }: TopBarProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const stage = document.querySelector("[data-intro-stage]");
    if (!stage) return;
    const observer = new IntersectionObserver(([entry]) => {
      setShown(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <header className="lp-topbar" data-shown={shown} aria-hidden={!shown} inert={!shown}>
      <div className="lp-wrap lp-topbar-row">
        <a className="lp-wordmark" href="#top">
          IITransit
        </a>
        <div className="lp-controls">
          <button
            type="button"
            className="lp-btn lp-btn-ghost"
            onClick={onToggleMotion}
            aria-pressed={motionOn}
            aria-label="Motion"
          >
            <span className="lp-label">Motion</span>
            <span className="lp-switch" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="lp-btn lp-btn-ghost lp-icon-btn"
            onClick={onToggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <Link className="lp-btn lp-btn-2" to="/app">
            Open App
          </Link>
        </div>
      </div>
    </header>
  );
}
