import type { CSSProperties } from "react";

const FAQ = [
  ["Who can use it?", "Anyone with an @iitbbs.ac.in Google account. Nobody else can sign in."],
  ["Is my phone number public?", "No. It stays hidden until someone taps Show Contact on your ride."],
  ["Does it cost anything?", "No. IITransit is free. You split the fare among yourselves, the way you already do."],
  ["What if nobody is going yet?", "Post the ride yourself, or watch the search. The bell lights up when someone posts a match."],
  ["What if my plans change?", "Change the seats left as people join, or cancel the ride from My Rides."],
  ["How do I install it?", "Open it in Chrome on Android or on a computer and tap Install App. It updates itself."],
] as const;

// 5. FAQ. Native <details>, so it opens and closes with a tap, Enter or Space, and works without JS.
export default function FaqSection() {
  return (
    <section className="lp-sec lp-faq-band" id="faq" aria-labelledby="lp-faq-title">
      <div className="lp-wrap lp-faq">
        <div className="lp-copy lp-faq-copy" data-reveal>
          <h2 className="lp-h2" id="lp-faq-title">
            Things people ask
          </h2>
          <p className="lp-lede">Anything else? Tell us through the feedback form at the bottom.</p>
        </div>
        <div data-reveal style={{ "--i": 1 } as CSSProperties}>
          {FAQ.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
