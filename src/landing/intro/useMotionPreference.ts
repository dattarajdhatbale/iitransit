import { useCallback, useState } from "react";
import { useMediaQuery } from "./useMediaQuery";

const MOTION_KEY = "iitransit:motion";

type StoredMotion = "on" | "off" | null;

function readStoredMotion(): StoredMotion {
  try {
    const value = localStorage.getItem(MOTION_KEY);
    return value === "on" || value === "off" ? value : null;
  } catch {
    return null;
  }
}

export interface MotionPreference {
  /** Whether the scroll animation runs. */
  motionOn: boolean;
  /** Saves the visitor's own choice; it wins over the system setting on later visits. */
  setMotionOn: (on: boolean) => void;
  /** The system asks for reduced motion. Only decides the default. */
  reducedMotion: boolean;
}

// Motion is on by default, unless the system asks for reduced motion. A choice made with the
// Motion toggle is remembered and wins from then on.
export function useMotionPreference(): MotionPreference {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [stored, setStored] = useState<StoredMotion>(readStoredMotion);

  const setMotionOn = useCallback((on: boolean) => {
    const value = on ? "on" : "off";
    try {
      localStorage.setItem(MOTION_KEY, value);
    } catch {
      // Storage unavailable: the choice still applies for this visit.
    }
    setStored(value);
  }, []);

  return {
    motionOn: stored === null ? !reducedMotion : stored === "on",
    setMotionOn,
    reducedMotion,
  };
}
