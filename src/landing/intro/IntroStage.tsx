import { useMemo, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import DesktopScene from "../scenes/DesktopScene";
import MobileScene from "../scenes/MobileScene";
import { SCENES, type SceneKey } from "../scenes/sceneGeometry";
import "../styles/iitransit-art.css";
import { CAPTIONS, FINAL_CAPTION } from "./captions";
import RouteDebugOverlay from "./RouteDebugOverlay";
import { useIntroAnimation } from "./useIntroAnimation";

interface IntroStageProps {
  scene: SceneKey;
  isDark: boolean;
  onToggleTheme: () => void;
  motionOn: boolean;
  onToggleMotion: () => void;
  /** Draws the route sampler's points over the art, for checking geometry. */
  debug?: boolean;
}

const pct = (value: number, of: number) => `${(value / of) * 100}%`;

// The intro's full-screen stage: top bar, captions and the scene, sized to fill the screen without
// cropping or stretching. With Motion ON, scrolling plays the story while the stage is pinned (see
// useIntroAnimation). With Motion OFF, nothing animates: the scene's own markup is the final frame.
// Elements the animation drives carry data-* hooks: [data-caption], [data-scroll-hint],
// [data-scene-box] and the SVG ids inside the scene.
export default function IntroStage({
  scene,
  isDark,
  onToggleTheme,
  motionOn,
  onToggleMotion,
  debug = false,
}: IntroStageProps) {
  const geometry = SCENES[scene];
  const Scene = scene === "desktop" ? DesktopScene : MobileScene;
  const isMobile = scene === "mobile";
  const stageRef = useRef<HTMLElement>(null);
  useIntroAnimation({ stageRef, scene, motionOn });

  // The animation writes to the scene's SVG directly; keep React from re-rendering it on unrelated
  // changes (theme, Motion toggle styling).
  const sceneElement = useMemo(() => <Scene className="block h-full w-full" />, [Scene]);

  // A box with the scene's exact aspect ratio, as large as fits: the SVG and any HTML laid over it
  // then share one coordinate system (percentages of this box = scene units).
  const sceneBoxStyle: CSSProperties = {
    width: `min(100cqw, calc(100cqh * ${geometry.width} / ${geometry.height}))`,
    height: `min(100cqh, calc(100cqw * ${geometry.height} / ${geometry.width}))`,
    containerType: "inline-size",
  };

  const ink = isDark ? "text-[#F8FAFC]" : "text-[#1E1A4D]";
  const quiet = isDark ? "text-[#A49FBE]" : "text-[#5E587E]";
  const pill = isDark ? "border-[rgba(255,255,255,0.14)]" : "border-[rgba(30,26,77,0.18)]";
  const cta = isDark ? "bg-[#7C3AED] text-white" : "bg-[#5a3d7a] text-white";

  // Keep hyphenated words together ("ride-mates"): browsers otherwise break lines at hyphens.
  const noBreakHyphens = (text: string) => text.replace(/(\w)-(\w)/g, "$1\u2011$2");

  const captionText = (text: string, withCta: boolean | undefined) => (
    <>
      <span className="block text-balance">{noBreakHyphens(text)}</span>
      {withCta && (
        <Link
          to="/app"
          className={`mt-[0.5em] inline-block rounded-full px-4 py-2 text-[length:max(14px,0.3em)] font-bold leading-none tracking-normal ${cta}`}
        >
          Open App
        </Link>
      )}
    </>
  );

  const captions = CAPTIONS.map((caption) => {
    const isFinal = caption.id === FINAL_CAPTION.id;
    return (
      <p
        key={caption.id}
        data-caption={caption.id}
        aria-hidden={isFinal ? undefined : true}
        className={`absolute inset-0 m-0 font-['Onest_Variable'] font-[650] leading-[1.1] tracking-[-0.02em] ${ink} ${
          isMobile ? "flex flex-col items-center justify-center px-4 text-center" : ""
        }`}
        style={{ opacity: isFinal ? 1 : 0, visibility: isFinal ? "visible" : "hidden" }}
      >
        {captionText(caption.text, caption.withCta)}
      </p>
    );
  });

  const box = geometry.captionBox;

  return (
    <section ref={stageRef} data-intro-stage aria-label="IITransit intro" className="relative flex h-[100svh] flex-col overflow-hidden">
      <header
        className={`relative z-10 flex shrink-0 items-center justify-between ${
          isMobile ? "h-14 gap-2 px-3" : "h-16 gap-3 px-4 md:px-10"
        }`}
      >
        <span className={`font-['Space_Grotesk'] font-bold tracking-tight ${isMobile ? "text-lg" : "text-xl"} ${ink}`}>
          IITransit
        </span>
        <div className={`flex items-center ${isMobile ? "gap-1.5" : "gap-2"}`}>
          <button
            type="button"
            onClick={onToggleMotion}
            aria-pressed={motionOn}
            className={`flex items-center rounded-full border ${
              isMobile ? "gap-1.5 px-2.5 py-1 text-xs" : "gap-2 px-3 py-1.5 text-sm"
            } ${pill} ${ink}`}
          >
            <span>Motion</span>
            <span
              aria-hidden="true"
              className={`relative h-4 w-7 rounded-full transition-colors ${motionOn ? "bg-[#7C3AED]" : isDark ? "bg-[#3B4670]" : "bg-[#B7A6CD]"}`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-[left] ${motionOn ? "left-3.5" : "left-0.5"}`}
              />
            </span>
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            className={`flex items-center justify-center rounded-full border ${isMobile ? "h-8 w-8" : "h-9 w-9"} ${pill} ${ink}`}
          >
            {isDark ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
              </svg>
            )}
          </button>
          <Link
            to="/app"
            className={`whitespace-nowrap rounded-full py-2 text-sm font-bold ${isMobile ? "px-3" : "px-4"} ${cta}`}
          >
            Open App
          </Link>
        </div>
      </header>

      {isMobile && <div className="relative h-24 shrink-0 text-[length:clamp(18px,5.6vw,22px)]">{captions}</div>}

      <div className={`relative min-h-0 flex-1 ${isMobile ? "px-4 pb-4" : ""}`} style={{ containerType: "size" }}>
        <div data-scene-box className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={sceneBoxStyle}>
          {sceneElement}
          {box && (
            <div
              className="absolute"
              style={{
                left: pct(box.x, geometry.width),
                top: pct(box.y, geometry.height),
                width: pct(box.width, geometry.width),
                height: pct(box.height, geometry.height),
                fontSize: "clamp(22px, 3.4cqw, 60px)",
              }}
            >
              {captions}
            </div>
          )}
          {debug && <RouteDebugOverlay geometry={geometry} />}
        </div>
      </div>

      <div
        data-scroll-hint
        hidden={!motionOn}
        className={`pointer-events-none absolute bottom-[max(16px,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-sm ${quiet}`}
      >
        <span>Scroll to ride</span>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
