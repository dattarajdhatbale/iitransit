import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getIsDark, setIsDark } from "../theme";
import IntroStage from "./intro/IntroStage";
import { useMotionPreference } from "./intro/useMotionPreference";
import { useSceneKey } from "./intro/useSceneKey";
import DestinationsSection from "./sections/DestinationsSection";
import Footer from "./sections/Footer";
import ProblemSection from "./sections/ProblemSection";
import TopBar from "./sections/TopBar";
import "./sections/landing.css";
import { useLandingMotion } from "./useLandingMotion";

// The landing page: the scroll intro, then the sections. Owns the theme, Motion and scene state and
// shares them with the intro and the sections. Add ?debug to see the intro's route maths.
export default function LandingPage() {
  const [isDark, setDark] = useState<boolean>(getIsDark);
  const scene = useSceneKey();
  const { motionOn, setMotionOn } = useMotionPreference();
  const location = useLocation();
  const debug = new URLSearchParams(location.search).has("debug");
  const rootRef = useRef<HTMLDivElement>(null);

  useLandingMotion(rootRef, motionOn);
  useScrollToHashOnLoad(location.hash);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    setDark(next);
  };
  const toggleMotion = () => setMotionOn(!motionOn);

  return (
    <div className="lp" ref={rootRef}>
      <h1 className="lp-sr">IITransit: ride-sharing for IIT Bhubaneswar students</h1>
      <div className="lp-intro" id="top">
        <IntroStage
          scene={scene}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          motionOn={motionOn}
          onToggleMotion={toggleMotion}
          debug={debug}
        />
      </div>
      <TopBar isDark={isDark} onToggleTheme={toggleTheme} motionOn={motionOn} onToggleMotion={toggleMotion} />
      <div className="lp-sheet-wrap">
        <main className="lp-sheet">
          <ProblemSection />
          <DestinationsSection />
        </main>
      </div>
      <Footer />
    </div>
  );
}

// The browser scrolls to #how or #faq before the intro's pin adds its scroll distance above them,
// so it lands too high. Scroll there again once everything is in place (first load only).
function useScrollToHashOnLoad(hash: string) {
  const initialHash = useRef(hash);
  useEffect(() => {
    const id = decodeURIComponent(initialHash.current.slice(1));
    if (!id) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
}
