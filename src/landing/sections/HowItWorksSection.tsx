import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useMediaQuery } from "../intro/useMediaQuery";
import { Phone, StatusBar } from "../parts/Phone";
import { RideCard } from "../parts/RideCard";
import { SearchScreen } from "../parts/SearchScreen";
import { SHOTS, Screenshot } from "../parts/Screenshot";

const STEPS = [
  {
    title: "Sign in with your institute account",
    text: "Google sign-in, for @iitbbs.ac.in accounts only. Everyone on it is from campus.",
  },
  {
    title: "Find a ride, or post yours",
    text: "Pick the route and the date. Leaving from RHR, BHR, MHR, L‑Gate or Main Gate all counts as campus.",
  },
  {
    title: "Tap Show Contact",
    text: "Numbers stay hidden until you ask. Then it's one tap to WhatsApp.",
  },
];

const REVEALED_HINT = "In the app, that opens a WhatsApp chat with the poster.";

// 3. How it works: the page's one dark band.
// Pinned layout (wide and tall screens, Motion ON): the steps scroll past one phone that stays in
// place and switches screen with the step in the middle of the screen.
// Stacked layout (phones, short screens, Motion OFF): each step shows its own phone.
// The phones always show the app's light theme, which contrasts with the band in both page themes.
export default function HowItWorksSection({ motionOn }: { motionOn: boolean }) {
  const roomy = useMediaQuery("(min-width: 901px) and (min-height: 720px)");
  const pinned = motionOn && roomy;
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const steps = stepsRef.current;
    if (!pinned || !steps) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step));
        }
      },
      // A step is active while it crosses the middle tenth of the screen.
      { rootMargin: "-45% 0px -45% 0px" },
    );
    steps.querySelectorAll("[data-step]").forEach((step) => observer.observe(step));
    return () => observer.disconnect();
  }, [pinned]);

  // The layout swap remounts the card, so its Show Contact starts closed again; match the hint.
  useEffect(() => setRevealed(false), [pinned]);

  const onReveal = () => setRevealed(true);
  const screens: ReactNode[] = [
    <Screenshot key="home" light={SHOTS.homeLight} />,
    <Screenshot key="post" light={SHOTS.postLight} />,
    <CardScreen key="card" onReveal={onReveal} />,
  ];
  const times = ["09:41", "09:42", "22:05"];
  const hint = revealed ? REVEALED_HINT : "Tap Show Contact on the card.";

  return (
    <section className="lp-sec lp-band" id="how" aria-labelledby="lp-how-title">
      <div className={`lp-wrap lp-how ${pinned ? "lp-how-pinned" : "lp-how-stacked"}`}>
        <div>
          <h2 className="lp-h2" id="lp-how-title" data-reveal>
            How it works
          </h2>
          <div
            className="lp-steps"
            ref={stepsRef}
            style={{ "--lp-progress": pinned ? active / (STEPS.length - 1) : 1 } as CSSProperties}
          >
            {pinned && (
              <div className="lp-track" aria-hidden="true">
                <b />
              </div>
            )}
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className={`lp-step${pinned && i === active ? " lp-step-active" : ""}`}
                data-step={i}
                data-reveal={pinned ? undefined : true}
                style={{ "--i": i } as CSSProperties}
              >
                <span className="lp-step-n">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="lp-h3">{step.title}</h3>
                <p>{step.text}</p>
                {!pinned && (
                  <div className="lp-step-visual">
                    <Phone tone="light" decorative={i < 2}>
                      <div className="lp-screen">
                        <StatusBar time={times[i]} />
                        {screens[i]}
                      </div>
                    </Phone>
                    {i === 2 && (
                      <p className="lp-tap-hint" aria-live="polite">
                        {hint}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {pinned && (
          <div className="lp-pin-col">
            <div className="lp-pin-phone">
              <Phone tone="light" decorative={false} className="lp-screens">
                {screens.map((screen, i) => (
                  <div
                    key={i}
                    className={`lp-screen${i === active ? " lp-screen-on" : ""}`}
                    aria-hidden={i !== active || undefined}
                    inert={i !== active}
                  >
                    <StatusBar time={times[i]} />
                    {screen}
                  </div>
                ))}
                <span className="lp-chip-float lp-signed" data-shown={active === 0} aria-hidden="true">
                  <span className="lp-ok">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                  Signed in · @iitbbs.ac.in
                </span>
              </Phone>
              <p className="lp-tap-hint" aria-live="polite">
                {active === 2 ? hint : " "}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Step 3's screen: a search with the ride card whose Show Contact works.
function CardScreen({ onReveal }: { onReveal: () => void }) {
  return (
    <SearchScreen from="MHR" to="Khurda Road Junction Railway Station" days={4}>
      <RideCard
        from="MHR"
        to="Khurda Road Junction Railway Station"
        days={4}
        time="22:30"
        vehicle="Auto-rickshaw"
        fare={250}
        seats={{ left: 2, total: 3 }}
        note="puri snsi sf express 20857"
        postedBy="ROHAN DAS"
        share
        demo
        onReveal={onReveal}
      />
    </SearchScreen>
  );
}
