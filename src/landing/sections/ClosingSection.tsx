import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Highlight } from "../parts/Highlight";
import { ArtPin } from "../parts/icons";
import { SharedCar } from "../parts/SharedCar";

// 6. Closing: the shared car drives along the dotted line to the pin (once, Motion ON).
export default function ClosingSection() {
  return (
    <section className="lp-sec" aria-labelledby="lp-closing-title">
      <div className="lp-wrap lp-cta">
        <div className="lp-road" data-play="drive" aria-hidden="true">
          <span className="lp-road-line" />
          <span className="lp-road-car">
            <SharedCar />
          </span>
          <ArtPin className="lp-road-pin" />
        </div>
        <h2 className="lp-h2" id="lp-closing-title" data-reveal>
          Heading to the station? So is someone <Highlight stroke={3}>else.</Highlight>
        </h2>
        <p className="lp-lede" data-reveal style={{ "--i": 1 } as CSSProperties}>
          Sign in with your @iitbbs.ac.in Google account.
        </p>
        <Link className="lp-btn lp-btn-accent lp-btn-big" to="/app" data-reveal style={{ "--i": 2 } as CSSProperties}>
          Open App
        </Link>
      </div>
    </section>
  );
}
