import { useState } from "react";
import { useLocation } from "react-router-dom";
import { getIsDark, setIsDark } from "../theme";
import IntroStage from "./intro/IntroStage";
import { useMotionPreference } from "./intro/useMotionPreference";
import { useSceneKey } from "./intro/useSceneKey";

// Temporary development page for the intro, at /intro-preview (add ?debug to see the route maths).
// Removed before launch, when the intro moves to the real landing page.
export default function IntroPreview() {
  const [isDark, setDark] = useState<boolean>(getIsDark);
  const scene = useSceneKey();
  const { motionOn, setMotionOn } = useMotionPreference();
  const debug = new URLSearchParams(useLocation().search).has("debug");

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    setDark(next);
  };

  return (
    <div
      className={
        isDark
          ? "min-h-[100svh] bg-[#0B1020] text-[#F8FAFC]"
          : "min-h-[100svh] bg-gradient-to-br from-[#d8cfe3] via-[#cfc3dc] to-[#c4b6d6] text-[#242638]"
      }
    >
      <IntroStage
        scene={scene}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        motionOn={motionOn}
        onToggleMotion={() => setMotionOn(!motionOn)}
        debug={debug}
      />
      <section className="flex min-h-[60svh] items-center justify-center px-4 text-center text-sm opacity-70">
        The landing page sections continue here.
      </section>
    </div>
  );
}
