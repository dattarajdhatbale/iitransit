import { useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { getIsDark } from "../theme";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Temporary development page for the intro animation, at /intro-preview. Removed before launch.
export default function IntroPreview() {
  const root = useRef<HTMLDivElement>(null);
  const isDark = getIsDark();

  useGSAP(
    () => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: "[data-stage]",
            start: "top top",
            end: "+=150%",
            scrub: 0.5,
            pin: true,
          },
        })
        .fromTo("[data-dot]", { x: 0 }, { x: () => window.innerWidth * 0.6, ease: "none" });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className={
        isDark
          ? "min-h-[100svh] bg-[#0B1020] text-[#F8FAFC]"
          : "min-h-[100svh] bg-gradient-to-br from-[#d8cfe3] via-[#cfc3dc] to-[#c4b6d6] text-[#242638]"
      }
    >
      <header className="flex items-center justify-between px-4 py-3 md:px-10">
        <span className="text-sm">Intro preview · GSAP {gsap.version}</span>
        <Link to="/app" className="rounded-full bg-[#7C3AED] px-4 py-2 text-sm font-bold text-white">
          Open App
        </Link>
      </header>
      <section data-stage className="flex h-[100svh] items-center px-6">
        <div data-dot className="h-12 w-12 rounded-full bg-[#7C3AED]" />
      </section>
      <section className="h-[100svh] px-6 py-10">After the pin, the page scrolls normally.</section>
    </div>
  );
}
